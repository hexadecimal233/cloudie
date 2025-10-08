use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use regex::Regex;
use reqwest::{self, Client};
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;
use tokio;

struct DownloadInfo {
    final_url: String,
    download_type: String,
    preset: String,
    title: String,
    playlist: String,
}

#[derive(serde::Serialize)]
struct DownloadResponse {
    path: String,
    orig_file_name: String,
}

struct DownloadMeta {
    bytes: Vec<u8>,
    extension: String,
    orig_file_name: String,
}

/// 净化文件名
fn sanitize(text: &str) -> String {
    let re = Regex::new(r#"[\\/:*?\"<>|]"#).unwrap();
    re.replace_all(text, "_").to_string()
}

/// 调用FFmpeg进行Muxing
/// 目前只有AAC需要转码
fn ffmpeg_muxer(
    m3u8_url: &str,
    output_format: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let args = vec![
        "-y",
        "-loglevel",
        "warning",
        "-i",
        m3u8_url,
        "-bsf:a",
        "aac_adtstoasc", // audio bitstream filter
        "-vcodec",
        "copy",
        "-c",
        "copy",
        "-crf",
        "50", // constant rate factor
        "-f",
        output_format,
        "-", // to stdout
    ];

    let mut command = Command::new("ffmpeg");
    command.args(args).stdout(Stdio::piped());

    let mut child = command.spawn()?;
    let mut stdout = match child.stdout.take() {
        Some(s) => s,
        None => return Err("Failed to capture FFmpeg stdout".into()),
    };

    let mut buffer = Vec::new();
    stdout.read_to_end(&mut buffer)?;

    let status = child.wait()?;
    if !status.success() {
        return Err(format!("FFmpeg failed with status: {:?}", status).into());
    }

    Ok(buffer)
}

/// 核心下载逻辑
async fn download_logic(
    download_type: &DownloadInfo,
) -> Result<DownloadMeta, Box<dyn std::error::Error>> {
    let client = Client::new(); // fun fact: 这里不用加header也能下载

    match download_type.download_type.as_str() {
        // 直链下载
        "direct" => {
            let response = client.get(&download_type.final_url).send().await?;

            // Content-Disposition 有扩展但就这么做（）
            let extension = response
                .headers()
                .get("x-amz-meta-file-type")
                .ok_or("Missing x-amz-meta-file-type header")?
                .to_str()?
                .to_owned();

            // 查找原始文件名: filename*=utf-8''<filename>
            let orig_file_name = response
                .headers()
                .get("Content-Disposition")
                .and_then(|v| {
                    v.to_str()
                        .unwrap_or("")
                        .split("filename*=utf-8''")
                        .nth(1)
                        .map(|s| s.to_string())
                })
                .unwrap_or("".to_string());

            let bytes = response.bytes().await?.to_vec();

            Ok(DownloadMeta {
                bytes,
                extension,
                orig_file_name,
            })
        }
        // 下载音频流
        "progressive" => {
            let response = client.get(&download_type.final_url).send().await?;
            let bytes = response.bytes().await?.to_vec();

            let extension = if download_type.preset.as_str().contains("mp3") {
                "mp3"
            } else {
                "m4a"
            };

            Ok(DownloadMeta {
                bytes,
                extension: extension.to_string(),
                orig_file_name: "".to_string(),
            })
        }
        // m3u8 下载
        "hls" => {
            let preset = download_type.preset.as_str();

            if preset == "aac_160k" {
                // 使用 FFmpeg 处理 HLS M4A 流
                let m3u8_url = download_type.final_url.clone();

                let bytes = tokio::task::spawn_blocking(move || ffmpeg_muxer(&m3u8_url, "mp4"))
                    .await?
                    .map_err(|e| Box::<dyn std::error::Error>::from(e.to_string()))?;

                return Ok(DownloadMeta {
                    bytes,
                    extension: "m4a".to_string(),
                    orig_file_name: "".to_string(),
                });
            } else if preset.contains("mp3") || preset == "opus_0_0" {
                // 直接拼接分片
                let response = client.get(&download_type.final_url).send().await?;
                let m3u_text = response.text().await?;

                let urls = Regex::new(r#"(http)[^\s]*"#)?
                    .find_iter(&m3u_text)
                    .map(|m| m.as_str().to_owned())
                    .collect::<Vec<_>>();

                // 批量下载所有分段并合并
                let download_futures: Vec<_> = urls
                    .into_iter()
                    .map(|url| {
                        let client_clone = client.clone();
                        async move {
                            let resp = client_clone.get(&url).send().await?;
                            let bytes = resp.bytes().await?.to_vec();
                            Ok::<Vec<u8>, reqwest::Error>(bytes)
                        }
                    })
                    .collect();

                let results = futures::future::join_all(download_futures).await;

                let mut final_file: Vec<u8> = Vec::new();
                for result in results {
                    match result {
                        Ok(bytes) => {
                            final_file.extend(bytes);
                        }
                        Err(e) => {
                            // 如果任何一个分片下载失败，返回错误
                            return Err(e.into());
                        }
                    }
                }

                let extension = if download_type.preset.as_str().starts_with("mp3") {
                    "mp3"
                } else {
                    "opus"
                };

                return Ok(DownloadMeta {
                    bytes: final_file,
                    extension: extension.to_string(),
                    orig_file_name: "".to_string(),
                });
            }

            return Err(format!("Unsupported HLS preset: {}", preset).into());
        }
        _ => return Err("this shouldnt happen!!".to_string().into()),
    }
}

/// Tauri Command: 下载音轨
#[tauri::command]
async fn download_track(
    final_url: String,
    download_type: String,
    preset: String,
    title: String,
    playlist: String,
    app_handle: AppHandle,
) -> Result<DownloadResponse, String> {
    let download_info = DownloadInfo {
        final_url,
        download_type,
        preset,
        title,
        playlist,
    };

    let result: Result<DownloadResponse, String> = async move {
        let store = app_handle
            .store("cloudie.json")
            .map_err(|e| e.to_string())?;

        // 从配置中获取保存路径
        let save_path = PathBuf::from(
            store
                .get("savePath")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .ok_or("Failed to get savePath from config")?,
        );

        // 从配置中获取是否单独创建播放列表目录
        let separate_dir = store
            .get("playlistSeparateDir")
            .and_then(|v| v.as_bool())
            .ok_or("Failed to get playlistSeparateDir from config")?;

        let response = download_logic(&download_info)
            .await
            .map_err(|e| e.to_string())?;

        // 3. 构造目标路径
        let filename = sanitize(&download_info.title);
        let orig_file_name = response.orig_file_name.clone();

        let dest = if separate_dir {
            let playlist_dir = save_path.join(sanitize(&download_info.playlist));
            // 确保播放列表目录存在，并处理 IO 错误
            if !playlist_dir.exists() {
                std::fs::create_dir_all(&playlist_dir).map_err(|e| {
                    format!(
                        "Failed to create playlist directory: {}. Error: {}",
                        playlist_dir.display(),
                        e
                    )
                })?;
            }
            playlist_dir.join(format!("{}.{}", filename, response.extension))
        } else {
            // 确保保存路径存在，并处理 IO 错误
            if !save_path.exists() {
                std::fs::create_dir_all(&save_path)
                    // std::io::Error 自动转换为 AnyError
                    .map_err(|e| {
                        format!(
                            "Failed to create base save directory: {}. Error: {}",
                            save_path.display(),
                            e
                        )
                    })?;
            }
            save_path.join(format!("{}.{}", filename, response.extension))
        };

        // 4. 文件保存 (使用 spawn_blocking 处理文件 I/O)
        // TODO: 优化为将文件不写到Vec<u8>，直接写入文件
        let dest_str = dest.to_string_lossy().to_string();

        let _ = tokio::task::spawn_blocking(move || -> Result<(), std::io::Error> {
            let mut file = std::fs::File::create(&dest)?;
            std::io::copy(&mut response.bytes.as_slice(), &mut file)?;
            Ok(())
        })
        .await
        .map_err(|e| e.to_string())?;

        Ok(DownloadResponse {
            path: dest_str,
            orig_file_name,
        })
    }
    .await;

    result.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }));
    }

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download_track])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use regex::Regex;
use reqwest;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use tokio;

struct DownloadInfo {
    final_url: String,
    download_type: String,
    preset: String,
    title: String,
    playlist: String,
}

// TODO: 传回前端
struct DownloadResponse {
    error: String,
    path: String,
    orig_file_name: String,
}

struct DownloadMeta {
    bytes: Vec<u8>,
    extension: String,
    orig_file_name: Option<String>,
}

// 净化文件名
fn sanitize(text: &str) -> String {
    let re = Regex::new(r#"[\\/:*?\"<>|]"#).unwrap();
    re.replace_all(text, "_").to_string()
}

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

/// 核心下载逻辑（异步）。
async fn download_logic(download_type: &DownloadInfo) -> Result<DownloadMeta, String> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::ORIGIN,
        reqwest::header::HeaderValue::from_static("https://soundcloud.com"),
    );
    headers.insert(
        reqwest::header::REFERER,
        reqwest::header::HeaderValue::from_static("https://soundcloud.com/"),
    );

    let client = reqwest::ClientBuilder::new()
        .default_headers(headers)
        .user_agent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        )
        .build()
        .map_err(|e| format!("Failed to build reqwest client: {}", e))?;

    match download_type.download_type.as_str() {
        "direct" => {
            let response = client
                .get(&download_type.final_url)
                .send()
                .await
                .map_err(|e| format!("HTTP request failed: {}", e))?;

            let extension = response
                .headers()
                .get("x-amz-meta-file-type")
                .ok_or("Missing header")? // TODO: 返回一个源文件名
                .to_str()
                .unwrap_or("unknown")
                .to_owned();

            // find original file name: filename*=utf-8''<filename>
            let orig_file_name = response
                .headers()
                .get("Content-Disposition")
                .map(|v| {
                    v.to_str()
                        .unwrap_or("")
                        .split("filename*=utf-8''")
                        .nth(1)
                        .map(|s| s.to_string())
                })
                .flatten();

            let bytes = response
                .bytes()
                .await
                .map_err(|e| format!("Failed to read response bytes: {}", e))?
                .to_vec();

            Ok(DownloadMeta {
                bytes,
                extension,
                orig_file_name,
            })
        }
        "progressive" => {
            let response = client
                .get(&download_type.final_url)
                .send()
                .await
                .map_err(|e| format!("HTTP request failed: {}", e))?;

            let bytes = response
                .bytes()
                .await
                .map_err(|e| format!("Failed to read stream bytes: {}", e))?
                .to_vec();

            let extension = if download_type.preset.as_str().starts_with("mp3") {
                "mp3".to_string()
            } else {
                "m4a".to_string() // 没遇到过返回m4a
            };

            Ok(DownloadMeta {
                bytes,
                extension,
                orig_file_name: None,
            })
        }
        "hls" => {
            let preset = download_type.preset.as_str();

            if preset == "aac_160k" {
                // 使用 FFmpeg 处理 HLS M4A 流
                let m3u8_url = download_type.final_url.clone();
                let bytes_result =
                    tokio::task::spawn_blocking(move || ffmpeg_muxer(&m3u8_url, "mp4"))
                        .await
                        .map_err(|e| format!("FFmpeg blocking task failed: {:?}", e))?;

                let bytes = bytes_result.map_err(|e| format!("FFmpeg error: {:?}", e))?;

                return Ok(DownloadMeta {
                    bytes,
                    extension: "m4a".to_string(),
                    orig_file_name: None,
                });
            } else if preset.contains("mp3") || preset == "opus_0_0" {
                // 直接拼接分片
                let m3u_resp = client
                    .get(&download_type.final_url)
                    .send()
                    .await
                    .map_err(|e| format!("Failed to fetch M3U8 playlist: {}", e))?;
                let m3u_text = m3u_resp
                    .text()
                    .await
                    .map_err(|e| format!("Failed to read M3U8 text: {}", e))?;

                let urls = Regex::new(r#"(http)[^\s]*"#)
                    .map_err(|e| e.to_string())?
                    .find_iter(&m3u_text)
                    .map(|m| m.as_str().to_owned())
                    .collect::<Vec<_>>();

                // TODO: 可优化——并发下载分片
                let mut final_file: Vec<u8> = Vec::new();

                // 批量下载所有分段并合并
                for url in urls {
                    let resp = client
                        .get(&url)
                        .send()
                        .await
                        .map_err(|e| format!("Failed to fetch MP3 segment: {}", e))?;
                    let bytes = resp
                        .bytes()
                        .await
                        .map_err(|e| format!("Failed to read segment bytes: {}", e))?
                        .to_vec();
                    final_file.extend(bytes);
                }

                return Ok(DownloadMeta {
                    bytes: final_file,
                    extension: if preset.contains("mp3") {
                        "mp3".to_string()
                    } else {
                        "opus".to_string()
                    },
                    orig_file_name: None,
                });
            }

            return Err("No supported HLS transcodings found".to_string());
        }
        _ => return Err("this shouldnt happen!!".to_string()),
    }
}

#[tauri::command]
async fn download_track(
    final_url: String,
    download_type: String,
    preset: String,
    title: String,
    playlist: String,
    app_handle: AppHandle,
) -> Result<String, String> {
    let download_type = DownloadInfo {
        final_url,
        download_type,
        preset,
        title,
        playlist,
    };

    // TODO: 播单目录
    let store = app_handle.store("cloudie.json").unwrap();
    let save_path = PathBuf::from(store.get("savePath").unwrap().as_str().unwrap());

    let response = download_logic(&download_type).await?;

    let filename = sanitize(&download_type.title);
    let dest = save_path.join(format!("{}.{}", filename, response.extension));

    // 5. 保存文件 (使用 spawn_blocking 处理文件 I/O)
    let _ = tokio::task::spawn_blocking(move || -> Result<(), String> {
        if !save_path.exists() {
            std::fs::create_dir_all(&save_path)
                .map_err(|e| format!("Failed to create directories: {}", e))?;
        }

        let mut file =
            std::fs::File::create(&dest).map_err(|e| format!("Failed to create file: {}", e))?;
        std::io::copy(&mut response.bytes.as_slice(), &mut file)
            .map_err(|e| format!("Failed to write to file: {}", e))?;

        Ok(())
    })
    .await
    .map_err(|e| format!("File saving task failed: {:?}", e))?;

    Ok("TODO: returns the path to the saved file".to_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}));
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

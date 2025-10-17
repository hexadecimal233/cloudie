use std::path::PathBuf;
use std::process::Command;

use regex::Regex;
use reqwest::{self, Client};
use tauri::{AppHandle, Emitter, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_store::StoreExt;
use tokio;

struct DownloadInfo {
    final_url: String,
    download_type: String,
    preset: String,
    title: String,
    playlist_name: String,
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
                let temp_name = format!("cloudie_temp_{}.m4a", uuid::Uuid::new_v4());

                let temp_name_clone = temp_name.clone();

                tokio::task::spawn_blocking(move || {
                    let args = vec![
                        "-y",
                        "-loglevel",
                        "warning",
                        "-i",
                        &m3u8_url,
                        "-bsf:a",
                        "aac_adtstoasc", // audio bitstream filter
                        "-vcodec",
                        "copy",
                        "-c",
                        "copy",
                        "-crf",
                        "50", // constant rate factor
                        &temp_name,
                    ];

                    let mut command = Command::new("ffmpeg");
                    command.args(args);

                    let mut child = command.spawn()?;

                    let status = child.wait()?;
                    if !status.success() {
                        return Err(format!("FFmpeg failed with status: {:?}", status).into());
                    }

                    Ok(())
                })
                .await?
                .map_err(|e: Box<dyn std::error::Error + Send + Sync>| e.to_string())?;

                let bytes = std::fs::read(&temp_name_clone)?;
                std::fs::remove_file(&temp_name_clone)?;

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

/// 下载音轨
#[tauri::command]
async fn download_track(
    final_url: String,
    download_type: String,
    preset: String,
    title: String,
    playlist_name: String,
    app_handle: AppHandle,
) -> Result<DownloadResponse, String> {
    let download_info = DownloadInfo {
        final_url,
        download_type,
        preset,
        title,
        playlist_name,
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

        // TODO: 转换非MP3文件
        let _convert_non_mp3 = store
            .get("nonMp3Convert")
            .and_then(|v| v.as_bool())
            .ok_or("Failed to get nonMp3Convert from config")?;

        let response = download_logic(&download_info)
            .await
            .map_err(|e| e.to_string())?;

        // 3. 构造目标路径
        let filename = sanitize(&download_info.title);
        let orig_file_name = response.orig_file_name.clone();

        let dest = if separate_dir {
            let playlist_dir = save_path.join(sanitize(&download_info.playlist_name));
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

        // let final_bytes = if convert_non_mp3 {
        //     ffmpeg_convert(&response).map_err(|e| e.to_string())?
        // } else {
        //     response.bytes.clone()
        // };

        // 4. 文件保存 (使用 spawn_blocking 处理文件 I/O)
        // TODO: 优化为将文件不写到Vec<u8>，直接写入文件
        let dest_str = dest.to_string_lossy().to_string();

        tokio::task::spawn_blocking(move || -> Result<(), std::io::Error> {
            let mut file = std::fs::File::create(&dest)?;
            std::io::copy(&mut response.bytes.as_slice(), &mut file)?;
            Ok(())
        })
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;

        Ok(DownloadResponse {
            path: dest_str,
            orig_file_name,
        })
    }
    .await;

    result.map_err(|e| e.to_string())
}

/// 检查 SoundCloud 是否已登录 (TODO: 检测登录失效)
fn check_cookies(window: &WebviewWindow) -> Option<String> {
    let url = Url::parse("https://soundcloud.com").unwrap();

    if let Ok(cookies) = window.cookies_for_url(url) {
        if let Some(oauth_token_cookie) = cookies.into_iter().find(|c| c.name() == "oauth_token") {
            let oauth_token = oauth_token_cookie.value().to_string();
            return Some(oauth_token);
        }
    }
    None
}

/// 登录 SoundCloud 返回 oauth_token
#[tauri::command]
async fn login_soundcloud(app_handle: AppHandle) -> Result<(), String> {
    if app_handle.get_webview_window("soundcloud_login").is_some() {
        return Err("Login window is already open.".to_string());
    }

    const SIGN_IN_URL: &str = "https://soundcloud.com/signin";
    const TARGET_HOST: &str = "soundcloud.com";

    let _login_window = WebviewWindowBuilder::new(
        &app_handle,
        "soundcloud_login",
        WebviewUrl::External(SIGN_IN_URL.parse().unwrap()),
    )
    .title("Login")
    // FIXME: window freeze
    .on_page_load({
        move |window, payload| {
            if payload.url().host_str() == Some(TARGET_HOST) {
                println!("Page loaded: {}", payload.url().to_string());
                if let Some(token) = check_cookies(&window) {
                    println!("Token found emitting event");
                    let _ = window.emit("sc_login_finished", token);
                    let _ = window.close();
                }
            }
        }
    })
    .build()
    .map_err(|e| format!("Failed to create login window: {}", e.to_string()))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_sql::Builder::new().build());

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
        .invoke_handler(tauri::generate_handler![download_track, login_soundcloud])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

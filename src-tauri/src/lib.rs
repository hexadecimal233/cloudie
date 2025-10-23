use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{
    AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_log::log;
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri_plugin_store::StoreExt;
use tokio;
use tokio::sync::oneshot;

#[tauri::command]
async fn download_aac(m3u8_url: String, app_handle: AppHandle) -> Result<String, String> {
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

    let temp_name = save_path.join(format!("cloudie_temp_{}.m4a", uuid::Uuid::new_v4()));

    let temp_name_clone = temp_name.clone();

    let result = tokio::task::spawn_blocking(move || -> Result<String, String> {
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
            temp_name.to_str().unwrap(),
        ];

        let mut command = Command::new("ffmpeg");
        command.args(args);

        let mut child = command.spawn().map_err(|e| e.to_string())?;

        let status = child.wait().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!("FFmpeg failed with status: {:?}", status));
        }

        Ok(temp_name_clone.to_str().unwrap().to_string())
    })
    .await
    .map_err(|e| e.to_string());

    result.map_err(|e| e.to_string())?
}

/// Check if SoundCloud is logged in, login will auto refresh on soundcloud.com
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

/// Login to SoundCloud and return oauth_token
#[tauri::command]
async fn login_soundcloud(app_handle: AppHandle) -> Result<String, String> {
    if app_handle.get_webview_window("soundcloud_login").is_some() {
        return Err("Login window is already open.".to_string());
    }

    const SIGN_IN_URL: &str = "https://soundcloud.com/signin";
    const TARGET_HOST: &str = "soundcloud.com";

    let (tx, rx) = oneshot::channel();
    let tx_shared = Arc::new(Mutex::new(Some(tx)));
    let tx_shared_clone = tx_shared.clone();

    let login_window = WebviewWindowBuilder::new(
        &app_handle,
        "soundcloud_login",
        WebviewUrl::External(SIGN_IN_URL.parse().unwrap()),
    )
    .title("Login")
    // tauri doesnt support navigation event with window passed, so we check title changed
    .on_document_title_changed({
        move |window, title| {
            let window_clone = window.clone();
            let tx_shared = tx_shared_clone.clone();
            window_clone.set_title(&title).unwrap();

            let url = window_clone.url().unwrap();
            if url.host_str() == Some(TARGET_HOST) {
                // spawn new thread to check cookies to prevent window freeze
                tauri::async_runtime::spawn(async move {
                    if let Some(token) = check_cookies(&window_clone) {
                        if let Ok(mut tx_guard) = tx_shared.lock() {
                            if let Some(tx) = tx_guard.take() {
                                tx.send(Some(token)).unwrap();
                                window_clone.close().unwrap();
                            }
                        }
                    }
                });
            }
        }
    })
    .build()
    .map_err(|e| format!("Failed to create login window: {}", e.to_string()))?;

    let tx_shared_close = tx_shared.clone();
    login_window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { .. } = event {
            if let Ok(mut tx_guard) = tx_shared_close.lock() {
                if let Some(tx) = tx_guard.take() {
                    let _ = tx.send(None);
                }
            }
        }
    });

    // 等待登录完成
    let oauth_token = rx.await.map_err(|e| format!("Login interrupted: {}", e))?;

    match oauth_token {
        Some(token) => Ok(token),
        None => Err("Login canceled by user.".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 0,
        description: "init",
        sql: include_str!("../drizzle/0000_broad_the_order.sql"),
        kind: MigrationKind::Up,
    }];

    let mut builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:soundcloud.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init());

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
        .invoke_handler(tauri::generate_handler![download_aac, login_soundcloud])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

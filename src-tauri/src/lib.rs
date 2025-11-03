use audiotags::{Album, MimeType, Picture, Tag};
use reqwest::Client;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{
    AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_log::log;
use tauri_plugin_sql::{Migration, MigrationKind};
use tokio;
use tokio::sync::oneshot;

#[tauri::command]
async fn add_tags(
    file_path: String,
    title: Option<String>,
    album: Option<String>,
    artist: Option<String>,
    cover_url: Option<String>,
    _app_handle: AppHandle,
) -> Result<(), String> {
    if !Path::new(&file_path).exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let mut tag = Tag::new()
        .read_from_path(&file_path)
        .map_err(|e| format!("Failed to read tag from {}: {}", file_path, e))?;

    if let Some(t) = title.as_ref() {
        tag.set_title(t.as_str());
    }
    if let Some(a) = album.as_ref() {
        tag.set_album(Album::with_title(a.as_str()));
    }
    if let Some(ar) = artist.as_ref() {
        tag.set_artist(ar.as_str());
    }

    // Embedding album cover
    if let Some(url) = cover_url.as_ref() {
        let client = Client::new();
        let resp = client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to request cover URL: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Cover download failed: HTTP {}", resp.status()));
        }

        let content_type = resp
            .headers()
            .get("Content-Type")
            .map(|v| v.to_str().unwrap().to_string())
            .ok_or("Failed to get Content-Type header")?;

        let cover_bytes = resp
            .bytes()
            .await
            .map_err(|e| format!("Failed to read cover bytes: {}", e))?
            .to_vec();

        let mime_guess = match content_type.as_str() {
            "image/jpeg" => MimeType::Jpeg,
            "image/png" => MimeType::Png,
            _ => return Err("Unsupported cover image format".to_string()),
        };

        let picture = Picture {
            mime_type: mime_guess,
            data: &cover_bytes[..],
        };

        tag.set_album_cover(picture);
    }

    tag.write_to_path(&file_path)
        .map_err(|e| format!("Failed to write tags to {}: {}", file_path, e))?;

    Ok(())
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

    // wait for login completion
    let oauth_token = rx.await.map_err(|e| format!("Login interrupted: {}", e))?;

    match oauth_token {
        Some(token) => Ok(token),
        None => Err("Login canceled by user.".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // add migrations
    let migrations = vec![
        Migration {
            version: 0,
            description: "init",
            sql: include_str!("../drizzle/0000_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 1,
            description: "update listening list index",
            sql: include_str!("../drizzle/0001_update_listen.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "update m3u8 cache",
            sql: include_str!("../drizzle/0002_m3u8_cache.sql"),
            kind: MigrationKind::Up,
        },
    ];

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        // register commands
        .invoke_handler(tauri::generate_handler![login_soundcloud, add_tags])
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

    // use single instance plugin on desktop
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

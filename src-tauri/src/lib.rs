// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

/*

#[tauri::command]
fn your_function() -> Result<(), String> {
    Ok(())
}

*/

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        // .invoke_handler(tauri::generate_handler![soundcloud::fetch_my_likes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

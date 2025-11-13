<div align="center">
<img src="public/logo.png" alt="logo" width=400 />
</div>

<h1 align="center">
Cloudie 
</h1>
<p align="center">
Yet another Open Source Kawaii Soundcloud Client.
</p>
<p align="center">
<a href="https://ui.nuxt.com" target="_blank"><img src="https://img.shields.io/badge/Built%20with-Nuxt%20UI-00DC82?style=flat-square&logo=nuxt.js&logoColor=white" alt="Built with Nuxt UI"></a>
<a href="https://www.rust-lang.org/" target="_blank"><img src="https://img.shields.io/badge/Powered%20by-Tauri-1b99a7?style=flat-square&logo=rust&logoColor=white" alt="Powered by Tauri"></a>
<a href="https://github.com/hexadecimal233/cloudie/releases" target="_blank"><img src="https://img.shields.io/github/downloads/hexadecimal233/cloudie/total?style=flat-square&logo=github&logoColor=white" alt="GitHub Downloads"></a>
<a href="https://github.com/hexadecimal233/cloudie/releases/latest" target="_blank"><img src="https://img.shields.io/github/v/release/hexadecimal233/cloudie?style=flat-square&logo=github&logoColor=white" alt="Latest Release"></a>
</p>



<!--
TODO: Add a Telegram / QQ / Discord group
-->

## Features

> [!WARNING]
> This project is still under heavy development, and many features are not yet implemented or may not work as expected.

- Web-like experience - Fully functional desktop client
- Blazing Fast - Directly interact with the API, no web scraping involved
- Downloader - Download tracks or playlists and embed covers
- Customizable - Multilingual support and theme options
- DJ Support - Use Soundcloud functionality without a Paid DJ software Plan (WIP)
- Scrobbling support - Log track playtime to last.fm or similar services (WIP)

## Logging in

> [!TIP]
> Login is required for this application to be fully functional.

This app does not use the Soundcloud API to perform token update, which reduces the possibility triggering any captcha or rate limiting.

## Setting up the Project

1. Clone the repository.
2. Install dependencies: `pnpm install`
3. Run the project: `pnpm tauri dev`
4. Build the project locally: `pnpm tauri build`

### Debugging Rust

For **VSCode** users, you simply choose `Tauri Development Debug` in the debug tab and run.

For **Zed** users, you have to run the `ui:dev` task then use the `Debugger` to start the debugging session.

## Contributing

### Database Schema

1. Modify the database schema in `src/systems/db/schema.ts`
2. Run `pnpm drizzle-kit generate` if a table upgrade is needed.
3. Modify the migrations in `src-tauri/src/lib.rs` to include the new table.
4. (Optional) Run the program using `pnpm tauri dev` to apply the migrations on-runtime.

Report Issues / Submit Feature Requests: [Issues](https://github.com/hexadecimal233/cloudie/issues)

Pull Requests: [Pull Requests](https://github.com/hexadecimal233/cloudie/pulls)

<!-- 也许加一个捐助功能 -->

<!--

## TODO List

- [ ] 图标重新设计
- [ ] Table样式优化
- [ ] No geoblocking
- [ ] Proxy support
- [ ] Scrobbling support
- [ ] DJ Support
- [ ] Watch Router updates on dynamic views 
- [ ] Lyrics service
- [ ] icon start to load online again...
-->

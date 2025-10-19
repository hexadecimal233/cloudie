# Cloudie

<div align="center">
<img src="public/logo.png" alt="logo" width=500 />
</div>

<p align="center">
Cloudie -- Yet another Kawaii Soundcloud Client.
</p>

## Features

> [!WARNING]
> This project is still under heavy development, and many features are not yet implemented or may not work as expected.

- [ ] Browse & play Soundcloud tracks
- [x] Download tracks or playlists from Soundcloud and embed covers
- [x] Login using integrated browser
- [x] Multilingual support
- [ ] Auto add playlists to DJ software (TODO: dynamic playlist support)
- [ ] Playing Manager service support (eg. last.fm)

## Logging in

> [!TIP]
> Login is required for this application to be fully functional.

This app does not use 

## Setting up the Project

1. Clone the repository.
2. Install dependencies: `pnpm install`
3. Run the project: `pnpm tauri dev`
4. (Optional) Build the project: `pnpm tauri build`
5. (Optional) Modify the database schema in `src/db/schema.ts` and run `pnpm drizzle-kit generate` if a table upgrade is needed.

> [!NOTE]
> We use PNPM as our package manager, so make sure you have it installed.
>
> Recommended IDE Setup:
> [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Contributing

Report Issues / Submit Feature Requests: [Issues](https://github.com/hexadecimal233/cloudie/issues)

Pull Requests: [Pull Requests](https://github.com/hexadecimal233/cloudie/pulls)

<!-- 也许加一个捐助功能 -->

## TODO List

- [ ] 图标重新设计
- [ ] 主题色重写
- [ ] Table样式

- [ ] 注释英文化

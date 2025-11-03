<div align="center">
<img src="public/logo.png" alt="logo" width=500 />
</div>

<p align="center">
Cloudie -- Yet another Open Source Kawaii Soundcloud Client.
</p>

## Features

> [!WARNING]
> This project is still under heavy development, and many features are not yet implemented or may not work as expected.

- [x] Browse & Play Soundcloud tracks
- [x] Download tracks or playlists from Soundcloud and embed covers
- [x] Multilingual support
- [ ] Auto add playlists to DJ software (TODO: dynamic playlist support)
- [ ] Scrobbling support (eg. last.fm)

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

## TODO List

- [ ] 图标重新设计
- [ ] Table样式优化
- [ ] More Tooltips!
- [ ] Refactor: check errors
- [ ] Wave display
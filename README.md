# PC Dial V1

Open-source Windows 10/11 x64 desktop test companion for the CH552G-based PC Dial V1 rotary controller. Version **0.1.0-test**. Tauri 2, Rust, React and TypeScript. MIT licensed.

## Status and downloads

The Windows x64 application and NSIS installer have been built successfully on GitHub Actions. Eight frontend tests, five Rust tests and the desktop process/window smoke test passed. The executable also launched locally and rendered the interface. See [verification details](docs/VERIFICATION.md) for the precise test scope.

[Windows test release and downloads](https://github.com/KLAASROBLOXDEV/PC-DAIL-V1-/releases/tag/v0.1.0-test) · [Build results](https://github.com/KLAASROBLOXDEV/PC-DAIL-V1-/actions)

The release workflow produces:
- PC-Dial-V1-Test.exe — standalone application executable, requires installed WebView2
- PC-Dial-V1-Setup.exe — per-user NSIS installer, installs WebView2 if needed
- SHA256SUMS.txt

No Node.js, Rust or development tools are needed to run a built application. Both editions use local application data for settings; "portable" describes the executable, not portable settings. No code-signing certificate is supplied, so builds are unsigned.

## Features

Six pages: Dashboard, Dial Configuration, Profiles, Device Connection, Settings and About. All seven gestures can be simulated. The animated dial and activity log share the action mapper used by future device integration. Create, rename, delete, activate, import and export profiles. Settings save automatically in the Windows application configuration directory (shown in Settings); the previous settings file is backed up as settings.bak.

Safe preview is the default on each launch. Enable **Send simulated actions to Windows** in Settings for real volume/media keys and keyboard chords. Custom shortcuts support Ctrl/Alt/Shift plus A–Z, 0–9, F1–F12, Space, Enter, Tab, Esc, arrows, Home, End, Delete, Plus or Minus. Zoom uses Ctrl+Plus/Minus. Shortcuts and zoom wait three seconds to allow focus switching. Target application and keyboard layout determine shortcut/zoom behavior. Elevated applications may block input. OS key dispatch is not a guarantee that an application handles it.

The firmware protocol is unknown. No physical PC Dial is identified, opened or controlled. Read-only HID enumeration is available on demand. It is not a complete USB inventory. See [hardware contract](docs/HARDWARE.md).

## Development

Install Node.js 22+, Rust stable with x86_64-pc-windows-msvc, Visual Studio C++ Build Tools with a Windows SDK, and WebView2. Tauri's official prerequisites: https://v2.tauri.app/start/prerequisites/

```powershell
npm ci
npm run typecheck
npm test
npm run tauri dev
npm run tauri build -- --target x86_64-pc-windows-msvc -- --locked
```

Both package-lock.json and src-tauri/Cargo.lock are committed. CI uses npm ci and Cargo's locked dependency resolution. Update and commit the lockfiles deliberately when changing dependencies. Windows builds use official Tauri CLI and NSIS. See https://v2.tauri.app/distribute/windows-installer/.

## CI and release

.github/workflows/build-windows.yml runs on pushes, PRs, manual dispatch and v* tags. It checks TypeScript, runs mapping and Rust tests, builds Windows x64, verifies both executables, and performs a basic process/window smoke test. This is not a full interaction test or physical-hardware test.

To publish the initial prerelease, push the source then create/push tag v0.1.0-test, or manually run the workflow with publish_test_release set to true. The release step uses the job-scoped GitHub token and uploads both executables and checksums. No personal access token or secrets belong in this repository.

## Privacy and configuration

No telemetry, trackers, external fonts, accounts or app network calls. The installer may download Microsoft's WebView2 runtime. Only intentional local OS input is emitted. Configuration import is capped at 1 MB, schema validated, and never executes commands. Profiles are plain JSON, so do not include secrets in names or mappings. Local HID information is neither saved nor uploaded. The workflow uploads only built executables, checksums and dependency lockfiles.

## Manual verification checklist

1. Launch on Windows 10 and 11 x64 with WebView2.
2. Exercise every simulator gesture with preview mode; no Windows input should occur.
3. Create/rename/delete profiles, change mappings and restart; verify persistence.
4. Export/import, reject malformed JSON, test cancel dialogs and unreadable settings.
5. Enable Windows output and verify audio/media and delayed shortcuts in a non-elevated target.
6. Refresh HID inventory with devices attached/detached; no device should be claimed as PC Dial.
7. Install, launch and uninstall the NSIS build. Check runtime installation on a clean Windows VM.


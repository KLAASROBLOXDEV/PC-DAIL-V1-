# Verification report — 2026-11-03

## Verified build

[Windows build 41705588524](https://github.com/KLAASROBLOXDEV/PC-DAIL-V1-/actions/runs/41705588524) completed successfully for application source commit `2ba65bcfd5f3226d3a2949be69db8c6be7303b3e`.

- Full TypeScript check and Vite production frontend build passed.
- Eight frontend tests passed: independent profiles, safe deletion, invalid actions/imports, gesture mappings, profile cycling, JSON round trips and keyboard shortcut validation.
- Five Rust tests passed: shortcut and action allowlists, complete configuration validation, actual filesystem save/reload/backup and rejection of oversized/invalid configurations.
- Official Tauri 2 release build for `x86_64-pc-windows-msvc` succeeded.
- `PC-Dial-V1-Test.exe` (8,197,120 bytes) and `PC-Dial-V1-Setup.exe` (1,875,449 bytes) were generated and uploaded as a GitHub Actions artifact, together with SHA-256 checksums and resolved dependency lockfiles.
- CI started the executable, verified that it remained running for 12 seconds and created a desktop window, then stopped that test process.
- The downloaded artifact ZIP matched the digest reported by GitHub Actions. The standalone executable was launched on the local Windows desktop. Its interface, loaded-settings status and configuration/device/settings pages were observed rendering. Interaction testing was not completed while the user was operating the window.
- `package-lock.json` and the exact generated `src-tauri/Cargo.lock` are committed. Release CI enforces locked dependencies.
- Checked intended source files for common credential patterns and private local paths. No credentials, personal files or local build folders are included in the tracked source. Runtime user settings are not published.

## Limits

No firmware protocol was supplied, and no real PC Dial device communication was tested. The app intentionally does not guess a device identity or send USB commands. Press-and-rotate and click timing remain simulation-only.

The CI startup check is not a full UI interaction test. Real audio/media dispatch, target-application shortcuts, every import/export dialog path, installation/uninstallation and a clean Windows 10/11 compatibility matrix have not been fully verified. These remain on the manual checklist in README.md.

The application and installer are unsigned. WebView2 must be present for the standalone executable; the installer can download it when needed.

## Release verification

Tag builds rerun tests, create both executables and publish them with `SHA256SUMS.txt` to the matching GitHub prerelease. The checksums published with a release apply to that release's freshly built files; the sizes above describe the initial verified build.

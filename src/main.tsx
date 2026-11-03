import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import {
  actions,
  actionLabels,
  gestures,
  labels,
  initialConfig,
  newProfile,
  deleteProfile,
  resolveGesture,
  validateConfig,
  validShortcut,
} from "./domain";
import type { Config, Gesture } from "./domain";
import "./style.css";
const pages = [
  "Dashboard",
  "Dial Configuration",
  "Profiles",
  "Device Connection",
  "Settings",
  "About",
];
type Device = { vendor_id: number; product_id: number; product: string };
function App() {
  const [config, setConfig] = useState<Config>(initialConfig),
    [ready, setReady] = useState(false),
    [page, setPage] = useState("Dashboard"),
    [notice, setNotice] = useState("Loading settings…"),
    [error, setError] = useState(""),
    [devices, setDevices] = useState<Device[]>([]),
    [scanStatus, setScanStatus] = useState("Not scanned"),
    [live, setLive] = useState(false),
    [busy, setBusy] = useState(false),
    [angle, setAngle] = useState(0),
    [logs, setLogs] = useState<string[]>([]),
    [name, setName] = useState(""),
    [settingsPath, setSettingsPath] = useState(""),
    [loadFailed, setLoadFailed] = useState(false);
  const queue = useRef(Promise.resolve());
  const hydrated = useRef(false);
  const profile = config.profiles.find((p) => p.id === config.activeId)!;
  useEffect(() => {
    invoke<string | null>("load_config")
      .then((raw) => {
        if (raw) setConfig(validateConfig(JSON.parse(raw)));
        setNotice("Settings loaded");
        setReady(true);
      })
      .catch((e) => {
        setError(String(e));
        setLoadFailed(true);
      });
    invoke<string>("config_path")
      .then(setSettingsPath)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    setNotice("Saving…");
    const raw = JSON.stringify(config);
    queue.current = queue.current
      .then(() => invoke("save_config", { raw }))
      .then(() => setNotice("All changes saved"))
      .catch((e) => {
        setNotice("Save failed");
        setError(String(e));
      });
  }, [config, ready]);
  function change(c: Config) {
    try {
      setConfig(validateConfig(c));
    } catch (e) {
      setError(String(e));
    }
  }
  function log(s: string) {
    setLogs((a) =>
      [new Date().toLocaleTimeString() + "  " + s, ...a].slice(0, 12),
    );
  }
  async function input(g: Gesture) {
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    setAngle((a) => a + (g.toLowerCase().includes("counter") ? -24 : 24));
    const { binding, nextId } = resolveGesture(config, g);
    log(labels[g] + " → " + actionLabels[binding.action]);
    try {
      if (nextId !== config.activeId) change({ ...config, activeId: nextId });
      else if (live && !["none", "nextProfile"].includes(binding.action)) {
        if (["shortcut", "zoomIn", "zoomOut"].includes(binding.action)) {
          setNotice("Switch to target app — sending in 3 seconds…");
          await new Promise((r) => setTimeout(r, 3000));
        }
        await invoke("execute_action", {
          action: binding.action,
          shortcut: binding.shortcut,
        });
        setNotice("Windows action sent");
      } else log("Preview only — no Windows input sent");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function scan() {
    setScanStatus("Scanning…");
    try {
      const d = await invoke<Device[]>("list_devices");
      setDevices(d);
      setScanStatus(d.length + " HID interfaces detected");
    } catch (e) {
      setScanStatus("Scan failed");
      setError(String(e));
    }
  }
  async function importConfig() {
    try {
      const raw = await invoke<string | null>("import_config");
      if (raw) {
        change(validateConfig(JSON.parse(raw)));
        setNotice("Configuration imported");
      }
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <span className="brandmark">◉</span>
          <div>
            PC Dial <b>V1</b>
            <small>DESKTOP CONTROL</small>
          </div>
        </div>
        <nav>
          {pages.map((p, i) => (
            <button
              className={page === p ? "selected" : ""}
              onClick={() => setPage(p)}
              key={p}
            >
              <span>{["◉", "≡", "▣", "⌁", "⚙", "ⓘ"][i]}</span>
              {p}
            </button>
          ))}
        </nav>
        <div className="asideBottom">
          <span className="dot" /> Simulation ready
          <small>v0.1.0-test · Windows x64</small>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">YOUR CONTROL, CONFIGURED</p>
            <h1>{page}</h1>
          </div>
          <span className="badge">DEMO MODE</span>
        </header>
        <div className="status" role="status">
          {notice}
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}
        {loadFailed && (
          <section>
            <h2>Settings could not be loaded</h2>
            <p>
              Your saved file has been left untouched. Export or back it up
              before resetting.
            </p>
            <button
              onClick={() => {
                setLoadFailed(false);
                setReady(true);
                setNotice(
                  "Using defaults; existing file retained until your next edit",
                );
              }}
            >
              Continue with defaults
            </button>
          </section>
        )}
        <fieldset disabled={!ready || busy} className="content">
          {page === "Dashboard" && (
            <>
              <div className="metrics">
                <section>
                  <p>DEVICE</p>
                  <h3>Not configured</h3>
                  <small>Protocol specification required</small>
                </section>
                <section>
                  <p>ACTIVE PROFILE</p>
                  <h3>{profile.name}</h3>
                  <small>{gestures.length} mapped gestures</small>
                </section>
                <section>
                  <p>OUTPUT</p>
                  <h3>{live ? "Windows actions" : "Safe preview"}</h3>
                  <small>
                    {live ? "Sends input to your PC" : "No system changes"}
                  </small>
                </section>
              </div>
              <div className="dashboard">
                <section className="dialPanel">
                  <p className="eyebrow">TRY YOUR DIAL</p>
                  <div className="knobRing">
                    <button
                      aria-label="Simulate single press"
                      className="knob"
                      onClick={() => input("single")}
                      style={{ transform: "rotate(" + angle + "deg)" }}
                    >
                      <i />
                    </button>
                  </div>
                  <h2>{profile.name}</h2>
                  <p>Click the dial or simulate a gesture below.</p>
                  <div className="controls">
                    {gestures.map((g) => (
                      <button key={g} onClick={() => input(g)}>
                        {labels[g]}
                      </button>
                    ))}
                  </div>
                  <small>
                    All gestures are simulated. Physical support is unverified.
                  </small>
                </section>
                <section>
                  <h2>Activity</h2>
                  <p className="muted">
                    Shared mapping engine · latest 12 events
                  </p>
                  <div className="activity" aria-live="polite">
                    {logs.length ? (
                      logs.map((l, i) => <p key={i}>{l}</p>)
                    ) : (
                      <p>Turn the dial to see your actions here.</p>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
          {page === "Dial Configuration" && (
            <section>
              <div className="sectionHead">
                <div>
                  <h2>Gesture mappings</h2>
                  <p>Editing {profile.name}. Changes save automatically.</p>
                </div>
                <select
                  aria-label="Active profile"
                  value={config.activeId}
                  onChange={(e) =>
                    change({ ...config, activeId: e.target.value })
                  }
                >
                  {config.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {gestures.map((g) => (
                <div className="mapping" key={g}>
                  <div>
                    <b>{labels[g]}</b>
                    <small>Simulation available · hardware unverified</small>
                  </div>
                  <select
                    aria-label={labels[g]}
                    value={profile.bindings[g].action}
                    onChange={(e) =>
                      change({
                        ...config,
                        profiles: config.profiles.map((p) =>
                          p.id !== profile.id
                            ? p
                            : {
                                ...p,
                                bindings: {
                                  ...p.bindings,
                                  [g]: {
                                    ...p.bindings[g],
                                    action: e.target.value,
                                  },
                                },
                              },
                        ),
                      } as Config)
                    }
                  >
                    {actions.map((a) => (
                      <option key={a} value={a}>
                        {actionLabels[a]}
                      </option>
                    ))}
                  </select>
                  {profile.bindings[g].action === "shortcut" && (
                    <input
                      aria-label={labels[g] + " shortcut"}
                      defaultValue={profile.bindings[g].shortcut}
                      key={profile.id + g}
                      placeholder="Ctrl+Shift+M"
                      onBlur={(e) => {
                        if (!validShortcut(e.target.value)) {
                          setError(
                            "Use Ctrl, Alt or Shift plus A–Z, 0–9, F1–F12 or a navigation key.",
                          );
                          e.target.value = profile.bindings[g].shortcut;
                          return;
                        }
                        change({
                          ...config,
                          profiles: config.profiles.map((p) =>
                            p.id !== profile.id
                              ? p
                              : {
                                  ...p,
                                  bindings: {
                                    ...p.bindings,
                                    [g]: {
                                      ...p.bindings[g],
                                      shortcut: e.target.value,
                                    },
                                  },
                                },
                          ),
                        });
                      }}
                    />
                  )}
                </div>
              ))}
              <p>
                Zoom and custom shortcuts target the foreground application.
                Live simulation waits 3 seconds so you can switch windows.
                Applications running as administrator may reject input.
              </p>
            </section>
          )}
          {page === "Profiles" && (
            <section>
              <h2>Your profiles</h2>
              <p>
                Keep different mappings for work, media, and everything between.
              </p>
              <div className="row">
                <input
                  aria-label="New profile name"
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New profile name"
                />
                <button
                  disabled={!name.trim() || config.profiles.length >= 50}
                  onClick={() => {
                    const p = newProfile(name.trim());
                    change({
                      ...config,
                      activeId: p.id,
                      profiles: [...config.profiles, p],
                    });
                    setName("");
                  }}
                >
                  Create profile
                </button>
              </div>
              {config.profiles.map((p) => (
                <div className="mapping" key={p.id}>
                  <input
                    aria-label={"Rename " + p.name}
                    defaultValue={p.name}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) {
                        e.target.value = p.name;
                        return;
                      }
                      change({
                        ...config,
                        profiles: config.profiles.map((x) =>
                          x.id === p.id
                            ? { ...x, name: e.target.value.trim() }
                            : x,
                        ),
                      });
                    }}
                    maxLength={60}
                  />
                  <button onClick={() => change({ ...config, activeId: p.id })}>
                    {p.id === config.activeId ? "Active profile" : "Activate"}
                  </button>
                  <button
                    className="danger"
                    disabled={config.profiles.length === 1}
                    onClick={() => {
                      if (!window.confirm("Delete profile “" + p.name + "”?"))
                        return;
                      change(deleteProfile(config, p.id));
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </section>
          )}
          {page === "Device Connection" && (
            <>
              <section>
                <span className="badge">HARDWARE INTEGRATION PENDING</span>
                <h2>PC Dial V1 cannot yet be identified</h2>
                <p>
                  The repository supplied no VID, PID, report descriptor or
                  firmware protocol. The CH552G chip alone does not identify the
                  device. No device is opened and no USB commands are sent.
                </p>
                <button onClick={scan}>Refresh HID interfaces</button>
                <p>{scanStatus}</p>
              </section>
              <section>
                <h2>Detected HID interfaces</h2>
                <p>
                  These may be keyboards, mice or other devices. None is
                  confirmed as PC Dial V1. Composite devices can appear more
                  than once. This is a HID inventory, not a complete USB
                  inventory.
                </p>
                {devices.map((d, i) => (
                  <div className="mapping" key={i}>
                    <b>{d.product || "Unnamed HID interface"}</b>
                    <code>
                      VID {d.vendor_id.toString(16).padStart(4, "0")} · PID{" "}
                      {d.product_id.toString(16).padStart(4, "0")}
                    </code>
                  </div>
                ))}
              </section>
            </>
          )}
          {page === "Settings" && (
            <section>
              <h2>Simulation output</h2>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={live}
                  onChange={(e) => setLive(e.target.checked)}
                />{" "}
                Send simulated actions to Windows
              </label>
              <p>
                Off by default on every launch. Enabling this changes volume,
                controls media, or sends your configured keyboard shortcut.
                Profile switching always works locally.
              </p>
              <hr />
              <h2>Configuration files</h2>
              <p>
                Profiles are saved locally. Import validates the entire file
                before replacing your configuration.
              </p>
              <div className="row">
                <button onClick={importConfig}>Import JSON</button>
                <button
                  onClick={() =>
                    invoke("export_config", {
                      raw: JSON.stringify(config, null, 2),
                    })
                      .then((x) =>
                        setNotice(
                          x ? "Configuration exported" : "Export cancelled",
                        ),
                      )
                      .catch((e) => setError(String(e)))
                  }
                >
                  Export JSON
                </button>
              </div>
              <p className="path">{settingsPath}</p>
              <small>
                No accounts, telemetry or application network requests.
              </small>
            </section>
          )}
          {page === "About" && (
            <section>
              <div className="aboutLogo">◉</div>
              <h2>PC Dial V1</h2>
              <p>Version 0.1.0-test</p>
              <p>
                A lightweight, open-source Windows companion for your USB rotary
                controller.
              </p>
              <p>Tauri 2 · Rust · React · TypeScript</p>
              <hr />
              <p>
                Windows 10 / 11 x64. Requires Microsoft Edge WebView2 Runtime.
                The setup program installs the runtime if needed (internet may
                be required). The portable executable uses the installed runtime
                and stores settings in your application data folder.
              </p>
              <p>
                MIT licensed. Hardware integration awaits documented firmware.
                Press-and-rotate and click timing are simulation only.
              </p>
              <p className="path">github.com/KLAASROBLOXDEV/PC-DAIL-V1-</p>
            </section>
          )}
        </fieldset>
        <footer>
          PC DIAL V1 <span>Made for a more tactile desktop.</span>
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

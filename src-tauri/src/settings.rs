use serde_json::Value;
use std::{collections::HashSet, fs, io::Write, path::Path};

const MAX_BYTES: usize = 1_048_576;
const GESTURES: [&str; 7] = ["clockwise", "counterclockwise", "single", "double", "long", "pressClockwise", "pressCounterclockwise"];
const ACTIONS: [&str; 11] = ["none", "volumeUp", "volumeDown", "mute", "playPause", "nextTrack", "previousTrack", "shortcut", "zoomIn", "zoomOut", "nextProfile"];

pub fn validate(raw: &str) -> Result<(), String> {
    if raw.len() > MAX_BYTES { return Err("Configuration exceeds 1 MB".into()); }
    let value: Value = serde_json::from_str(raw).map_err(|e| format!("Invalid configuration JSON: {e}"))?;
    if value["schemaVersion"] != 1 { return Err("Unsupported configuration version".into()); }
    let profiles = value["profiles"].as_array().ok_or("Expected profiles array")?;
    if profiles.is_empty() || profiles.len() > 50 { return Err("Expected 1–50 profiles".into()); }
    let mut ids = HashSet::new();
    for profile in profiles {
        let id = profile["id"].as_str().ok_or("Missing profile ID")?;
        let name = profile["name"].as_str().ok_or("Missing profile name")?;
        if id.is_empty() || id.encode_utf16().count() > 100 || !ids.insert(id) || name.trim().is_empty() || name.encode_utf16().count() > 60 {
            return Err("Invalid profile names or duplicate IDs".into());
        }
        for gesture in GESTURES {
            let binding = &profile["bindings"][gesture];
            let action = binding["action"].as_str().ok_or("Missing action")?;
            let shortcut = binding["shortcut"].as_str().ok_or("Missing shortcut")?;
            if !ACTIONS.contains(&action) || shortcut.encode_utf16().count() > 80 {
                return Err(format!("Invalid binding for {gesture}"));
            }
            if action == "shortcut" { crate::actions::shortcut_keys(shortcut)?; }
        }
    }
    if !ids.contains(value["activeId"].as_str().ok_or("Missing active profile")?) {
        return Err("Active profile does not exist".into());
    }
    Ok(())
}

pub fn read(path: &Path) -> Result<Option<String>, String> {
    let metadata = match fs::metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.to_string()),
    };
    if metadata.len() > MAX_BYTES as u64 { return Err("Configuration exceeds 1 MB".into()); }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    validate(&raw)?;
    Ok(Some(raw))
}

pub fn save(path: &Path, raw: &str) -> Result<(), String> {
    validate(raw)?;
    let temporary = path.with_extension("tmp");
    let backup = path.with_extension("bak");
    let mut file = fs::File::create(&temporary).map_err(|e| e.to_string())?;
    file.write_all(raw.as_bytes()).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    drop(file);
    if path.exists() { fs::copy(path, backup).map_err(|e| e.to_string())?; }
    fs::rename(temporary, path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Value {
        let bindings: serde_json::Map<String, Value> = GESTURES.iter().map(|g| (g.to_string(), serde_json::json!({"action":"mute", "shortcut":"Ctrl+M"}))).collect();
        serde_json::json!({"schemaVersion":1,"activeId":"default","profiles":[{"id":"default","name":"Everyday","bindings":bindings}]})
    }
    #[test]
    fn validates_complete_import_and_rejects_bad_mappings() {
        let valid = fixture();
        assert!(validate(&valid.to_string()).is_ok());
        for invalid in ["null", "{}", "not json"] { assert!(validate(invalid).is_err()); }
        let mut bad = valid.clone(); bad["profiles"][0]["bindings"]["single"]["action"] = "shell".into();
        assert!(validate(&bad.to_string()).is_err());
        let mut bad = valid.clone(); bad["activeId"] = "missing".into();
        assert!(validate(&bad.to_string()).is_err());
        let mut bad = valid.clone(); bad["profiles"].as_array_mut().unwrap().push(valid["profiles"][0].clone());
        assert!(validate(&bad.to_string()).is_err());
    }
    #[test]
    fn saves_reloads_and_preserves_previous_configuration() {
        let dir = std::env::temp_dir().join(format!("pc-dial-settings-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("settings.json");
        let first = fixture().to_string();
        save(&path, &first).unwrap();
        assert_eq!(read(&path).unwrap(), Some(first.clone()));
        let mut second = fixture(); second["profiles"][0]["name"] = "Media".into();
        save(&path, &second.to_string()).unwrap();
        assert_eq!(read(&path).unwrap(), Some(second.to_string()));
        assert_eq!(fs::read_to_string(path.with_extension("bak")).unwrap(), first);
        assert!(save(&path, "{}").is_err());
        assert_eq!(read(&path).unwrap(), Some(second.to_string()));
        fs::remove_file(&path).unwrap();
        fs::remove_file(path.with_extension("bak")).unwrap();
        fs::remove_dir(dir).unwrap();
    }
    #[test]
    fn rejects_oversized_files_and_invalid_shortcuts() {
        assert!(validate(&" ".repeat(MAX_BYTES + 1)).is_err());
        let mut bad = fixture();
        bad["profiles"][0]["bindings"]["single"] = serde_json::json!({"action":"shortcut","shortcut":"Win+R"});
        assert!(validate(&bad.to_string()).is_err());
    }
}

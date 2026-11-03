pub(crate) fn shortcut_keys(shortcut: &str) -> Result<Vec<u16>,String> {
 let normalized=shortcut.to_ascii_uppercase();
 let mut parts:Vec<&str>=normalized.split('+').map(str::trim).collect();
 let key=parts.pop().ok_or("Missing key")?;
 if parts.len()>3 {return Err("Too many modifiers".into());}
 let mut keys=Vec::new();
 for modifier in parts {
  let vk=match modifier {"CTRL"=>0x11,"ALT"=>0x12,"SHIFT"=>0x10,_=>return Err("Unsupported modifier".into())};
  if keys.contains(&vk){return Err("Duplicate modifier".into());}keys.push(vk);
 }
 let vk=match key {
 "SPACE"=>0x20,"ENTER"=>0x0D,"TAB"=>0x09,"ESC"=>0x1B,"LEFT"=>0x25,"RIGHT"=>0x27,"UP"=>0x26,"DOWN"=>0x28,"HOME"=>0x24,"END"=>0x23,"DELETE"=>0x2E,"PLUS"=>0xBB,"MINUS"=>0xBD,
 _ if key.len()==1 && key.as_bytes()[0].is_ascii_alphanumeric()=>key.as_bytes()[0] as u16,
 _ if key.starts_with('F')=>{let n=key[1..].parse::<u16>().map_err(|_|"Unsupported key")?;if !(1..=12).contains(&n){return Err("Unsupported function key".into());}0x70+n-1},
 _=>return Err("Unsupported key".into())};
 keys.push(vk);Ok(keys)
}
fn action_keys(action:&str,shortcut:&str)->Result<Vec<u16>,String>{
 Ok(match action {
 "volumeUp"=>vec![0xAF],"volumeDown"=>vec![0xAE],"mute"=>vec![0xAD],"playPause"=>vec![0xB3],"nextTrack"=>vec![0xB0],"previousTrack"=>vec![0xB1],
 "zoomIn"=>vec![0x11,0xBB],"zoomOut"=>vec![0x11,0xBD],"shortcut"=>shortcut_keys(shortcut)?,
 _=>return Err("Unsupported Windows action".into())})
}
#[tauri::command]
pub fn execute_action(action:String,shortcut:String)->Result<(),String>{
 let keys=action_keys(&action,&shortcut)?;
 send_keys(&keys)
}
#[cfg(windows)]
fn send_keys(keys:&[u16])->Result<(),String>{
 use windows_sys::Win32::UI::Input::KeyboardAndMouse::*;
 // Refuse chords while modifiers are held to avoid unintended combinations.
 for vk in [0x10,0x11,0x12,0x5B,0x5C] {
  if unsafe{GetAsyncKeyState(vk)}<0 {return Err("Release held modifier keys and retry.".into());}
 }
 fn event(vk:u16,up:bool)->INPUT {
  let extended=matches!(vk,0x21..=0x28|0x2D|0x2E|0xAD..=0xB3);
  INPUT{r#type:INPUT_KEYBOARD,Anonymous:INPUT_0{ki:KEYBDINPUT{wVk:vk,wScan:0,dwFlags:(if up{KEYEVENTF_KEYUP}else{0})|(if extended{KEYEVENTF_EXTENDEDKEY}else{0}),time:0,dwExtraInfo:0}}}
 }
 let inputs:Vec<INPUT>=keys.iter().map(|k|event(*k,false)).chain(keys.iter().rev().map(|k|event(*k,true))).collect();
 let sent=unsafe{SendInput(inputs.len() as u32,inputs.as_ptr(),std::mem::size_of::<INPUT>() as i32)};
 if sent!=inputs.len() as u32 {
  let release:Vec<INPUT>=keys.iter().rev().map(|k|event(*k,true)).collect();
  unsafe{SendInput(release.len() as u32,release.as_ptr(),std::mem::size_of::<INPUT>() as i32);}
  return Err("Windows rejected input. The foreground application may have higher privileges.".into());
 } Ok(())
}
#[cfg(not(windows))]
fn send_keys(_: &[u16])->Result<(),String>{Err("Windows only".into())}
#[cfg(test)]
mod tests {
 use super::*;
 #[test]fn chords(){assert_eq!(shortcut_keys("Ctrl+Shift+M").unwrap(),vec![0x11,0x10,0x4D]);assert!(shortcut_keys("Win+R").is_err());assert!(shortcut_keys("Ctrl+Ctrl+A").is_err());assert!(shortcut_keys("F13").is_err());}
 #[test]fn reject_arbitrary_commands(){assert!(action_keys("shell","cmd.exe").is_err());assert_eq!(action_keys("mute","").unwrap(),vec![0xAD]);}
}


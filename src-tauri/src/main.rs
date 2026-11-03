#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod actions;
mod device;
mod settings;
use tauri::Manager;
use std::{fs,path::PathBuf};
fn path(app:&tauri::AppHandle)->Result<PathBuf,String>{
 let dir=app.path().app_config_dir().map_err(|e|e.to_string())?;
 fs::create_dir_all(&dir).map_err(|e|e.to_string())?;Ok(dir.join("settings.json"))
}
#[tauri::command]
fn config_path(app:tauri::AppHandle)->Result<String,String>{Ok(path(&app)?.display().to_string())}
fn check_json(raw:&str)->Result<(),String>{
 settings::validate(raw)
}
#[tauri::command]
fn load_config(app:tauri::AppHandle)->Result<Option<String>,String>{
 settings::read(&path(&app)?)
}
#[tauri::command]
fn save_config(app:tauri::AppHandle,raw:String)->Result<(),String>{
 settings::save(&path(&app)?, &raw)
}
#[tauri::command]
async fn import_config()->Result<Option<String>,String>{
 let chosen=rfd::AsyncFileDialog::new().add_filter("Configuration JSON",&["json"]).pick_file().await;
 match chosen {None=>Ok(None),Some(file)=>{
  let metadata=fs::metadata(file.path()).map_err(|e|e.to_string())?;
  if metadata.len()>1_048_576{return Err("Configuration exceeds 1 MB".into());}
  let raw=fs::read_to_string(file.path()).map_err(|e|e.to_string())?;check_json(&raw)?;Ok(Some(raw))
 }}
}
#[tauri::command]
async fn export_config(raw:String)->Result<bool,String>{
 check_json(&raw)?;
 let chosen=rfd::AsyncFileDialog::new().add_filter("Configuration JSON",&["json"]).set_file_name("pc-dial-v1.json").save_file().await;
 match chosen {None=>Ok(false),Some(file)=>{fs::write(file.path(),raw).map_err(|e|e.to_string())?;Ok(true)}}
}
fn main(){
 tauri::Builder::default().invoke_handler(tauri::generate_handler![config_path,load_config,save_config,import_config,export_config,actions::execute_action,device::list_devices])
 .run(tauri::generate_context!()).expect("PC Dial V1 startup failed");
}


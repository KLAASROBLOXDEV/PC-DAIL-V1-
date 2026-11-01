//! Enumeration only. No guessed VID/PID, device opening, report reads or writes.
use serde::Serialize;
#[derive(Serialize)]
pub struct Device { vendor_id: u16, product_id: u16, product: String }
#[tauri::command]
pub fn list_devices() -> Result<Vec<Device>,String> {
 let api=hidapi::HidApi::new().map_err(|e|e.to_string())?;
 Ok(api.device_list().map(|d|Device{vendor_id:d.vendor_id(),product_id:d.product_id(),product:d.product_string().unwrap_or("").to_owned()}).collect())
}
// Future transport must decode documented reports into these shared frontend gesture names.
// Emit validated events to the same resolveGesture() path used by simulation.
// Firmware prerequisites are recorded in docs/HARDWARE.md.


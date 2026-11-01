# Hardware integration contract

The supplied public repository was empty on inspection. No VID, PID, HID descriptor, report IDs, protocol, firmware source, or gesture support was available. CH552G alone establishes none of these.

The device module only enumerates HID interfaces through hidapi. It never opens a device or sends commands. Product strings and VID/PID are displayed locally; serial numbers and device paths are not collected. No interface is labelled as PC Dial V1.

Before implementing a real transport, obtain:
- Firmware source/version and licensed specification
- Documented VID/PID and interface/usage identifiers
- Report descriptor, lengths, IDs, endianness and event encoding
- Debouncing, click timing and press/rotate behavior
- Disconnect/reconnect behavior and supported OS drivers

The adapter must validate reports and emit one of the gesture names in src/domain.ts. Feed those events through resolveGesture, the same pure mapping function used by the simulator. Do not execute device-provided arbitrary strings. Test malformed reports, disconnections, duplicate events and rapid rotation before enabling hardware mode.

Current physical gestures are all unverified. Simulator buttons produce semantic events, not raw electrical encoder pulses. Press-and-rotate is simulation-only.


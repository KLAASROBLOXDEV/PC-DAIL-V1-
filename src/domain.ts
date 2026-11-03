export const gestures = [
  "clockwise",
  "counterclockwise",
  "single",
  "double",
  "long",
  "pressClockwise",
  "pressCounterclockwise",
] as const;
export type Gesture = (typeof gestures)[number];
export const labels: Record<Gesture, string> = {
  clockwise: "Rotate clockwise",
  counterclockwise: "Rotate counterclockwise",
  single: "Single press",
  double: "Double press",
  long: "Long press",
  pressClockwise: "Press + clockwise",
  pressCounterclockwise: "Press + counterclockwise",
};
export const actions = [
  "none",
  "volumeUp",
  "volumeDown",
  "mute",
  "playPause",
  "nextTrack",
  "previousTrack",
  "shortcut",
  "zoomIn",
  "zoomOut",
  "nextProfile",
] as const;
export type Action = (typeof actions)[number];
export const actionLabels: Record<Action, string> = {
  none: "No action",
  volumeUp: "Volume up",
  volumeDown: "Volume down",
  mute: "Toggle mute",
  playPause: "Play / pause",
  nextTrack: "Next track",
  previousTrack: "Previous track",
  shortcut: "Keyboard shortcut",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  nextProfile: "Next profile",
};
export type Binding = { action: Action; shortcut: string };
export type Profile = {
  id: string;
  name: string;
  bindings: Record<Gesture, Binding>;
};
export type Config = {
  schemaVersion: 1;
  activeId: string;
  profiles: Profile[];
};
export function newProfile(
  name: string,
  id: string = crypto.randomUUID(),
): Profile {
  const defaults: Action[] = [
    "volumeUp",
    "volumeDown",
    "mute",
    "playPause",
    "nextProfile",
    "zoomIn",
    "zoomOut",
  ];
  return {
    id,
    name,
    bindings: Object.fromEntries(
      gestures.map((g, i) => [
        g,
        { action: defaults[i], shortcut: "Ctrl+Shift+M" },
      ]),
    ) as Profile["bindings"],
  };
}
export function initialConfig(): Config {
  const p = newProfile("Everyday", "default");
  return { schemaVersion: 1, activeId: p.id, profiles: [p] };
}
export function deleteProfile(config: Config, id: string): Config {
  const profiles = config.profiles.filter((p) => p.id !== id);
  if (!profiles.length) throw Error("Keep at least one profile.");
  return validateConfig({
    ...config,
    profiles,
    activeId: config.activeId === id ? profiles[0].id : config.activeId,
  });
}
export function validShortcut(s: string): boolean {
  const parts = s
    .toUpperCase()
    .split("+")
    .map((x) => x.trim());
  const key = parts.pop() || "";
  return (
    parts.length <= 3 &&
    new Set(parts).size === parts.length &&
    parts.every((x) => ["CTRL", "ALT", "SHIFT"].includes(x)) &&
    /^(?:[A-Z0-9]|F(?:[1-9]|1[0-2])|SPACE|ENTER|TAB|ESC|LEFT|RIGHT|UP|DOWN|HOME|END|DELETE|PLUS|MINUS)$/.test(
      key,
    )
  );
}
export function validateConfig(value: unknown): Config {
  const c = value as Config;
  if (
    !c ||
    c.schemaVersion !== 1 ||
    !Array.isArray(c.profiles) ||
    c.profiles.length < 1 ||
    c.profiles.length > 50
  )
    throw Error("Expected schema version 1 and 1–50 profiles.");
  const ids = new Set<string>();
  for (const p of c.profiles) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !p.id ||
      p.id.length > 100 ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 60
    )
      throw Error("Invalid profile names or IDs.");
    ids.add(p.id);
    for (const g of gestures) {
      const b = p.bindings?.[g];
      if (
        !b ||
        !actions.includes(b.action) ||
        typeof b.shortcut !== "string" ||
        b.shortcut.length > 80 ||
        (b.action === "shortcut" && !validShortcut(b.shortcut))
      )
        throw Error("Invalid action or shortcut for " + g);
    }
  }
  if (!ids.has(c.activeId)) throw Error("Active profile does not exist.");
  return {
    schemaVersion: 1,
    activeId: c.activeId,
    profiles: c.profiles.map((p) => ({
      id: p.id,
      name: p.name,
      bindings: Object.fromEntries(
        gestures.map((g) => [
          g,
          { action: p.bindings[g].action, shortcut: p.bindings[g].shortcut },
        ]),
      ) as Profile["bindings"],
    })),
  };
}
export function resolveGesture(config: Config, gesture: Gesture) {
  const p = config.profiles.find((x) => x.id === config.activeId)!;
  const binding = p.bindings[gesture];
  const nextId =
    binding.action === "nextProfile"
      ? config.profiles[
          (config.profiles.indexOf(p) + 1) % config.profiles.length
        ].id
      : config.activeId;
  return { binding, nextId };
}

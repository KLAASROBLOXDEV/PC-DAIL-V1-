import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialConfig,
  newProfile,
  deleteProfile,
  validateConfig,
  resolveGesture,
  validShortcut,
  gestures,
} from "../src/domain.ts";
test("creating profiles gives independent bindings", () => {
  const a = newProfile("A"),
    b = newProfile("B");
  assert.notEqual(a.id, b.id);
  a.bindings.single.action = "playPause";
  assert.equal(b.bindings.single.action, "mute");
});
test("deleting active profile selects remaining profile and protects last profile", () => {
  const c = initialConfig();
  c.profiles.push(newProfile("Media", "media"));
  const result = deleteProfile(c, "default");
  assert.equal(result.activeId, "media");
  assert.equal(result.profiles.length, 1);
  assert.equal(c.profiles.length, 2);
  assert.throws(() => deleteProfile(result, "media"));
});
test("reject unsupported actions and incomplete imports", () => {
  const c = initialConfig();
  const bad = JSON.parse(JSON.stringify(c));
  bad.profiles[0].bindings.single.action = "shell";
  assert.throws(() => validateConfig(bad));
  delete bad.profiles[0].bindings.single;
  assert.throws(() => validateConfig(bad));
});
test("every simulated gesture resolves through shared mapper", () => {
  const c = initialConfig();
  for (const g of gestures) assert.ok(resolveGesture(c, g).binding.action);
  assert.equal(resolveGesture(c, "clockwise").binding.action, "volumeUp");
});
test("profile cycle wraps and uses active mapping", () => {
  const c = initialConfig();
  c.profiles.push(newProfile("Media", "media"));
  assert.equal(resolveGesture(c, "long").nextId, "media");
  c.activeId = "media";
  assert.equal(resolveGesture(c, "long").nextId, "default");
});
test("configuration round trip preserves mappings", () => {
  const c = initialConfig();
  assert.deepEqual(validateConfig(JSON.parse(JSON.stringify(c))), c);
});
test("reject malformed imports without accepting partial profiles", () => {
  for (const v of [
    null,
    {},
    { schemaVersion: 2, profiles: [] },
    { ...initialConfig(), activeId: "missing" },
  ])
    assert.throws(() => validateConfig(v));
  const c = initialConfig();
  c.profiles.push(c.profiles[0]);
  assert.throws(() => validateConfig(c));
});
test("shortcut allowlist rejects unsupported and ambiguous inputs", () => {
  assert.ok(validShortcut("Ctrl+Shift+M"));
  assert.ok(validShortcut("Alt+F4"));
  for (const s of ["", "Ctrl+Ctrl+A", "Win+R", "Ctrl+", "Ctrl+🦊", "exec cmd"])
    assert.equal(validShortcut(s), false);
});

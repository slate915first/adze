// ============================================================================
// engine/i18n.js
// ----------------------------------------------------------------------------
// Translation lookup. Each user-facing string in render functions calls
// t(key, vars?) — where key is a dotted path like 'area.subarea.what_for' —
// instead of having the literal text.
//
// Ambient dependencies (resolved from the enclosing scope — globals in
// browser, global.X in Node tests):
//
//   STRINGS  — flat dotted-key dictionary loaded from a JSON sidecar tag.
//              Keys: "onboarding.welcome.title" etc.
//              Values: strings; may contain {placeholder} tokens that are
//              substituted from the `vars` object.
//
// Missing key behavior: returns "[the.key]" so the gap is loud in the UI
// (you see it, you grep, you fix it). Also console.warns once per key.
//
// Placeholder syntax: "{name}". Use `vars: { name: 'Dirk' }`.
//
// To add a new language: create content/strings/<code>.json with the same
// keys; pick one at app load time. The build inlines whichever language
// is named in the sidecar marker (currently en).
// ============================================================================

// In-module set of keys we've already warned about, so the console doesn't
// spam on repeated lookups of the same missing key during a render pass.
var __t_warned = (typeof __t_warned !== 'undefined') ? __t_warned : new Set();

function t(key, vars) {
  var s = (typeof STRINGS !== 'undefined' && STRINGS) ? STRINGS[key] : undefined;
  if (s === undefined) {
    if (!__t_warned.has(key)) {
      console.warn('[t] missing string key:', key);
      __t_warned.add(key);
    }
    return '[' + key + ']';
  }
  if (vars) {
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      }
    }
  }
  return s;
}

// CommonJS export for Node-side tests. Harmless in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { t };
}

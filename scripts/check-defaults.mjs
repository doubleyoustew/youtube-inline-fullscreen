// Verifies that the inline DEFAULT_SETTINGS in app/background.js stays in
// sync with app/settings/defaults.js.
//
// background.js must keep its own copy because the Firefox manifest loads
// it as a classic script, which cannot use ES module imports.
//
// Run with `npm test`.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Extracts the object literal assigned to DEFAULT_SETTINGS from a source
 * file and evaluates it, so the two copies can be compared.
 */
function extractDefaultSettings(source, file) {
  const match = source.match(/DEFAULT_SETTINGS\s*=\s*(\{[\s\S]*?\});/);
  if (!match) {
    throw new Error(`Could not find a DEFAULT_SETTINGS object literal in ${file}`);
  }
  return new Function(`return (${match[1]});`)();
}

/**
 * JSON.stringify with sorted object keys, so key order does not affect
 * the comparison.
 */
function stableStringify(value) {
  return JSON.stringify(value, (key, values) =>
    values && typeof values === 'object' && !Array.isArray(values)
      ? Object.fromEntries(
          Object.keys(values)
            .sort()
            .map((k) => [k, values[k]])
        )
      : values
  );
}

const files = {
  source: path.join(root, 'app', 'settings', 'defaults.js'),
  background: path.join(root, 'app', 'background.js'),
};

const settings = {};
for (const [name, file] of Object.entries(files)) {
  settings[name] = extractDefaultSettings(readFileSync(file, 'utf8'), file);
}

if (stableStringify(settings.source) !== stableStringify(settings.background)) {
  console.error('✖ DEFAULT_SETTINGS is out of sync:');
  console.error(`  app/settings/defaults.js: ${stableStringify(settings.source)}`);
  console.error(`  app/background.js:      ${stableStringify(settings.background)}`);
  console.error('Update both objects to match (see the comment in app/background.js).');
  process.exit(1);
}

console.log('✓ DEFAULT_SETTINGS in app/background.js matches app/settings/defaults.js');

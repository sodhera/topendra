const fs = require('node:fs');
const path = require('node:path');

function parseDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const values = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const match = trimmedLine.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      const inlineCommentIndex = value.search(/\s+#/);

      if (inlineCommentIndex >= 0) {
        value = value.slice(0, inlineCommentIndex).trim();
      }
    }

    values[key] = value;
  }

  return values;
}

function loadRootEnv({ override = false } = {}) {
  const repoRoot = path.resolve(__dirname, '..');
  const envFiles = ['.env', '.env.local'];
  const loaded = {};

  for (const fileName of envFiles) {
    const parsedValues = parseDotEnvFile(path.join(repoRoot, fileName));

    for (const [key, value] of Object.entries(parsedValues)) {
      loaded[key] = value;

      if (override || process.env[key] == null) {
        process.env[key] = value;
      }
    }
  }

  return loaded;
}

module.exports = {
  loadRootEnv,
  parseDotEnvFile,
};

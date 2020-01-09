/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Why this exists:
 * When a Glitch project wakes up or a file changes, it runs `npm run start`.
 * If a file changes, we want to rebuild, but if the project is just waking from sleep,
 * there's no need to rebuild. Unfortunately Glitch doesn't tell us which is happening,
 * so this script compares last-modified dates of files in the project with those from
 * the last build, and only rebuilds if something has changed.
 */
const assert = require('assert').strict;
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { promisify } = require('util');
const glob = promisify(require('glob'));
const isGlitch = 'PROJECT_DOMAIN' in process.env;
const dataPath = './.data/modified-dates.json';

function spawnP(...args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(...args);

    proc.on('exit', code => {
      if (code !== 0) {
        reject(Error('Build failed'));
        return;
      }
      resolve();
    });
  });
}

async function getModifiedDates() {
  const matches = await Promise.all(
    [
      'client/**/*',
      'lib/**/*',
      'server/**/*',
      'shared/**/*',
      'config.js',
      'generic-tsconfig.json',
      'missing-types.d.ts',
      'package.json',
      'rollup.config.js',
    ].map(pattern => glob(pattern, { nodir: true })),
  );
  const paths = matches.flat();
  const results = await Promise.all(
    paths.map(async path => [path, (await fs.stat(path)).mtimeMs]),
  );
  return Object.fromEntries(results);
}

async function requiresBuild() {
  // Non-glitch users should be using watchnserve.
  if (!isGlitch) return false;

  let lastModifiedDates;

  try {
    lastModifiedDates = require(dataPath);
  } catch (err) {
    // No data present. Requires build.
    return true;
  }

  const latestModifiedDates = await getModifiedDates();

  try {
    assert.deepStrictEqual(latestModifiedDates, lastModifiedDates);
    return false;
  } catch (err) {
    return true;
  }
}

(async () => {
  if (await requiresBuild()) {
    await spawnP('npm', ['run', 'build'], {
      stdio: 'inherit',
    });
    const results = await getModifiedDates();
    fs.writeFile(dataPath, JSON.stringify(results, null, '  '));
  }

  require('./.data/dist');
})();

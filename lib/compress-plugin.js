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
import { brotliCompress } from 'zlib';
import { promisify } from 'util';

const compress = promisify(brotliCompress);

export default function() {
  return {
    name: 'compress-plugin',
    async generateBundle(options, bundle) {
      const compressRe = /\.(js|css|svg|html)$/;

      await Promise.all(
        Object.values(bundle).map(async entry => {
          if (entry.type !== 'asset') return;
          if (!compressRe.test(entry.fileName)) return;
          const output = await compress(entry.source);
          this.emitFile({
            type: 'asset',
            source: output,
            fileName: entry.fileName + '.br',
          });
        }),
      );
    },
  };
}

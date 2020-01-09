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
import { h, FunctionalComponent } from 'preact';

import cssPath from 'css:./styles.css';
import bundleURL, { imports } from 'client-bundle:client/big-screen-iframe';
import title from 'consts:title';

const BigScreenIframePage: FunctionalComponent<{}> = () => {
  return (
    <html>
      <head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="icon"
          href="https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Ffavicon.png?v=1577974253219"
        />
        <link rel="stylesheet" href={cssPath} />
        <script type="module" src={bundleURL} />
        {imports.map(i => (
          // @ts-ignore https://github.com/preactjs/preact/pull/2068
          <link rel="preload" as="script" href={i} crossOrigin="" />
        ))}
      </head>
      <body>
        <div class="big-screen-container"></div>
      </body>
    </html>
  );
};

export default BigScreenIframePage;

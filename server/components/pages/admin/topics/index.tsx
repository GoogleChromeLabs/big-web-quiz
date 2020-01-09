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

import cssPath from 'css:../styles.css';
import bundleURL from 'client-bundle:client/admin-topics';
import title from 'consts:title';

const TopicsAdminPage: FunctionalComponent = () => {
  return (
    <html>
      <head>
        <title>Topics - Admin - {title}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={cssPath} />
        <script type="module" src={bundleURL} />
      </head>
      <body>
        <h1>Topics</h1>
        <p>
          <a href="/admin/">Back</a>
        </p>
        <div class="topics-container" />
      </body>
    </html>
  );
};

export default TopicsAdminPage;

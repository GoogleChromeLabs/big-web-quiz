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
import title from 'consts:title';

const AdminSimpleLogin: FunctionalComponent = () => {
  return (
    <html>
      <head>
        <title>Admin - {title}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={cssPath} />
      </head>
      <body>
        <h1>Login</h1>
        <form action="/auth/admin-login" method="POST" class="admin-form-items">
          <div class="admin-form-item">
            <div>
              <label>
                <span class="label">Password</span>
                <input
                  class="input"
                  type="password"
                  name="password"
                  autoFocus
                />
              </label>
            </div>
            <div>
              <button class="button">Log in</button>
            </div>
          </div>
        </form>
      </body>
    </html>
  );
};

export default AdminSimpleLogin;

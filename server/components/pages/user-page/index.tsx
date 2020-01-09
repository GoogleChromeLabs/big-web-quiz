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
import Header from '../header';
import title from 'consts:title';
import subTitle from 'consts:subTitle';

import { inline as inlineCSS } from 'css:./styles.css';

interface Props {
  user?: UserSession;
}

const UserPage: FunctionalComponent<Props> = ({ children, user }) => {
  return (
    <html>
      <head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="preload"
          as="font"
          crossOrigin=""
          href="https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Fnormal.woff2?v=1577974248786"
        />
        <link
          rel="preload"
          as="font"
          crossOrigin=""
          href="https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Fbold.woff2?v=1577974248594"
        />
        <link
          rel="icon"
          href="https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Ffavicon.png?v=1577974253219"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: inlineCSS,
          }}
        ></style>
      </head>
      <body>
        <div class="main-ui">
          <Header user={user} />
          <div class="main-content-container">
            <div class="main-content">
              <div class="site-title">
                <h1>{title}</h1>
                <p>{subTitle}</p>
              </div>
              <div class="main-action-area">{children}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};

export default UserPage;

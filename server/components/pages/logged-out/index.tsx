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
import UserPage from '../user-page';
import { palette } from 'shared/state';
import { getHexColor } from 'client/utils';

const LoggedOut: FunctionalComponent = () => {
  return (
    <UserPage>
      <div class="log-in-container">
        <form method="post" action="/auth/login">
          <button
            class="unbutton vote-button"
            style={{
              '--color-from': getHexColor(palette[5][0]),
              '--color-to': getHexColor(palette[5][1]),
            }}
          >
            Log in
          </button>
        </form>
      </div>
    </UserPage>
  );
};

export default LoggedOut;

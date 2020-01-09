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

interface Props {
  user?: UserSession;
}

const Header: FunctionalComponent<Props> = ({ user }) => {
  if (!user) return <header />;

  return (
    <header class="main-header">
      <img
        width="40"
        height="40"
        alt={user.name}
        src={`${user.picture}=s${40}-c`}
        srcset={`${user.picture}=s${80}-c 2x`}
        tabIndex={0}
        class="user-image"
      />
      <form method="post" action="/auth/logout">
        <button class="unbutton log-out-button">Logout</button>
      </form>
    </header>
  );
};

export default Header;

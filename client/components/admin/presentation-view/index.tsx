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
import { h, Component } from 'preact';
import { PresentationView } from 'shared/state';
import { Operation } from 'fast-json-patch';
import { fetchJSON } from 'client/utils';

interface Props {
  mode: PresentationView;
}

const presentationStates: { [mode in PresentationView]: string } = {
  url: 'URL',
  bracket: 'Results bracket',
  'champion-scores': 'Champion scores',
};

export default class AdminPresentationView extends Component<Props> {
  private _onRadioClick = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const newVal = el.value as PresentationView;

    const patches: Operation[] = [
      {
        op: 'replace',
        path: `/presentationView`,
        value: newVal,
      },
    ];

    // Clear the zoom state of the bracket when we go back to the URL
    if (newVal === 'url') {
      patches.push({
        op: 'replace',
        path: `/bracketZoom`,
        value: null,
      });
    }

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: patches,
    });
  };

  render({ mode }: Props) {
    return (
      <section>
        <h1>Presentation state</h1>
        <form class="radio-buttons">
          {Object.entries(presentationStates).map(([value, label]) => (
            <label>
              <input
                type="radio"
                name="mode"
                value={value}
                checked={value === mode}
                onClick={this._onRadioClick}
              />
              <span class="button">{label}</span>
            </label>
          ))}
        </form>
      </section>
    );
  }
}

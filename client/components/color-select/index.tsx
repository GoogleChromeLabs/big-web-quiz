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
import { palette } from 'shared/state';
import { getHexColor } from 'client/utils';

interface Props {
  name: string;
  value?: number;
  disabled?: boolean;
  onChange?: (newVal: number) => void;
}

export default class ColorSelect extends Component<Props, {}> {
  private _onClick = (event: Event) => {
    const onChange = this.props.onChange;
    if (!onChange) return;
    const el = event.currentTarget as HTMLInputElement;
    onChange(Number(el.value));
  };

  render({ name, disabled, value }: Props) {
    return (
      <div class={`color-select${disabled ? ' disabled' : ''}`}>
        {palette.map((paletteItem, i) => (
          <label>
            <input
              type="radio"
              name={name}
              value={i}
              disabled={disabled}
              checked={value === i}
              onClick={this._onClick}
            />
            <span
              class="color-select-item"
              style={{
                '--color-from': getHexColor(paletteItem[0]),
                '--color-to': getHexColor(paletteItem[1]),
              }}
            ></span>
          </label>
        ))}
      </div>
    );
  }
}

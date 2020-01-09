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
import { ClientVote, palette } from 'shared/state';
import { getHexColor } from 'client/utils';

interface Props {
  vote: ClientVote;
  onVote: (index: number) => void;
}

interface State {
  currentVote: number;
}

export default class VoteButtons extends Component<Props, State> {
  state: State = {
    currentVote: -1,
  };

  private _onButtonClick = (event: Event) => {
    const el = event.currentTarget as HTMLButtonElement;
    const index = Number(el.dataset.i);
    if (index === this.state.currentVote) return;
    this.setState({ currentVote: index });
    this.props.onVote(index);
  };

  render({ vote }: Props, { currentVote }: State) {
    return (
      <div class="vote-buttons">
        {vote.items.map((item, i) => [
          i > 0 ? <div class="vote-or">or</div> : '',
          <button
            class={`unbutton vote-button${
              currentVote === i
                ? ' vote-button-selected'
                : currentVote !== -1
                ? ' vote-button-unselected'
                : ''
            }`}
            style={{
              '--color-from': getHexColor(palette[item.colorId][0]),
              '--color-to': getHexColor(palette[item.colorId][1]),
            }}
            data-i={i}
            onClick={this._onButtonClick}
          >
            {item.label}
          </button>,
        ])}
      </div>
    );
  }
}

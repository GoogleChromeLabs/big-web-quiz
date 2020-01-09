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
import { h, Component, FunctionalComponent } from 'preact';

import { Vote, Champions, palette, VoteItem } from 'shared/state';
import Select from '../../select';
import ColorSelect from '../../color-select';
import { getHexColor, fetchJSON, escapePatchPathComponent } from 'client/utils';

interface Props {
  vote?: Vote;
  voteCount: [number, number] | null;
  champions: Champions;
  onNewVote: () => void;
}

interface WrapperProps {
  onNewVoteClick: (event: Event) => void;
}

interface State {
  editedVoteItems?: [VoteItem, VoteItem];
  savingVoteItems: boolean;
}

const AdminVoteWrapper: FunctionalComponent<WrapperProps> = ({
  children,
  onNewVoteClick,
}) => (
  <section>
    <h1>Active vote</h1>
    {children}
    <p>
      <button class="button" onClick={onNewVoteClick}>
        New vote
      </button>
    </p>
  </section>
);

export default class AdminVote extends Component<Props, State> {
  state: State = {
    savingVoteItems: false,
  };

  private _onEditClick = () => {
    this.setState({
      editedVoteItems: this.props.vote!.items,
    });
  };

  private _onSaveClick = async () => {
    this.setState({ savingVoteItems: true });

    await fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: this.state.editedVoteItems!.flatMap((item, i) =>
        ['championId', 'label', 'colorId'].map(key => ({
          op: 'replace',
          path: `/vote/items/${i}/${escapePatchPathComponent(key)}`,
          value: item[key as keyof typeof item],
        })),
      ),
    });

    this.setState({ savingVoteItems: false, editedVoteItems: undefined });
  };

  private _onNewVoteClick = () => {
    this.props.onNewVote();
  };

  private _onClearClick = () => {
    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/vote`,
          value: null,
        },
      ],
    });
  };

  private _onStateChange = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const state = el.value as Vote['state'];

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/vote/state`,
          value: state,
        },
      ],
    });
  };

  private _onEditInput = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const container = el.closest('.admin-form-item') as HTMLElement;
    const i = Number(container.dataset.itemIndex);

    this._setEditedItem(i, el.name as keyof VoteItem, el.value);
  };

  private _setEditedItem<Prop extends keyof VoteItem>(
    index: number,
    prop: Prop,
    newVal: VoteItem[Prop],
  ): void {
    this.setState(state => {
      const editedVoteItems = state.editedVoteItems!.slice() as [
        VoteItem,
        VoteItem,
      ];
      editedVoteItems[index] = {
        ...editedVoteItems[index],
        [prop]: newVal,
      };

      return { editedVoteItems };
    });
  }

  private _onColorChange = (index: number, newVal: number) => {
    this._setEditedItem(index, 'colorId', newVal);
  };

  render(
    { vote, voteCount, champions }: Props,
    { editedVoteItems, savingVoteItems }: State,
  ) {
    if (!vote) {
      return (
        <AdminVoteWrapper onNewVoteClick={this._onNewVoteClick}>
          <p>No active vote.</p>
        </AdminVoteWrapper>
      );
    }
    return (
      <AdminVoteWrapper onNewVoteClick={this._onNewVoteClick}>
        <div class="admin-form-items">
          {vote.items.map((voteItem, i) => {
            const item = editedVoteItems ? editedVoteItems[i] : voteItem;

            return (
              <div class="admin-form-item" data-item-index={i}>
                <div>
                  <label>
                    <span class="label">Label</span>{' '}
                    {editedVoteItems ? (
                      <input
                        class="input"
                        name="label"
                        value={item.label}
                        disabled={savingVoteItems}
                        onInput={this._onEditInput}
                      />
                    ) : (
                      <span class="prefilled-input">
                        {item.label || 'None'}
                      </span>
                    )}
                  </label>
                </div>
                <div>
                  <label>
                    <span class="label">Champion</span>{' '}
                    {editedVoteItems ? (
                      <Select
                        value={item.championId}
                        disabled={savingVoteItems}
                        onInput={this._onEditInput}
                        name="championId"
                      >
                        <option value="">None</option>
                        {Object.entries(champions).map(([id, champion]) => (
                          <option value={id}>{champion.name}</option>
                        ))}
                      </Select>
                    ) : (
                      <span class="prefilled-input">
                        {champions[item.championId]?.name || 'none'}
                      </span>
                    )}
                  </label>
                </div>
                <div>
                  <span class="label">Colour</span>{' '}
                  {editedVoteItems ? (
                    <ColorSelect
                      name={'vote-item' + i}
                      value={item.colorId || 0}
                      onChange={newVal => this._onColorChange(i, newVal)}
                      disabled={savingVoteItems}
                    />
                  ) : (
                    <span class="prefilled-input">
                      <span
                        class="prefilled-color-select-item"
                        style={{
                          '--color-from': getHexColor(palette[item.colorId][0]),
                          '--color-to': getHexColor(palette[item.colorId][1]),
                        }}
                      ></span>
                    </span>
                  )}
                </div>
                <div>
                  <div class="label">Votes</div>
                  <div class="prefilled-input">{voteCount![i]}</div>
                </div>
              </div>
            );
          })}
          <div class="admin-form-item">
            <div>
              <span class="label">Details</span>
              {editedVoteItems ? (
                <button
                  class="button"
                  disabled={savingVoteItems}
                  onClick={this._onSaveClick}
                >
                  Save
                </button>
              ) : (
                <button class="button" onClick={this._onEditClick}>
                  Edit
                </button>
              )}
            </div>
            <div>
              <span class="label">State</span>
              <form class="radio-buttons">
                <label>
                  <input
                    type="radio"
                    name="state"
                    value="staging"
                    checked={vote.state === 'staging'}
                    onChange={this._onStateChange}
                  />
                  <span class="button">Staging</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="state"
                    value="introducing"
                    checked={vote.state === 'introducing'}
                    onChange={this._onStateChange}
                  />
                  <span class="button">Introducing</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="state"
                    value="voting"
                    checked={vote.state === 'voting'}
                    onChange={this._onStateChange}
                  />
                  <span class="button">Voting</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="state"
                    value="results"
                    checked={vote.state === 'results'}
                    onChange={this._onStateChange}
                  />
                  <span class="button">Results</span>
                </label>
              </form>{' '}
              <button class="button" onClick={this._onClearClick}>
                Clear vote
              </button>
            </div>
          </div>
        </div>
      </AdminVoteWrapper>
    );
  }
}

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
import { Operation } from 'fast-json-patch';
import { Champions, Champion } from 'shared/state';
import {
  fetchJSON,
  escapePatchPathComponent,
  generateRandomId,
} from 'client/utils';

const genericAvatarURL =
  'https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Favatar.svg?v=1577974252576';

interface EditedChampion extends Champion {
  saving: boolean;
}

interface EditedChampions {
  [id: string]: EditedChampion;
}

interface Props {
  champions: Champions;
}

interface State {
  editedChampions: EditedChampions;
}

export default class AdminChampions extends Component<Props, State> {
  state: State = {
    editedChampions: {},
  };

  private _onPlusClick = (event: Event) => this._onScoreButtonClick(event, 1);
  private _onMinusClick = (event: Event) => this._onScoreButtonClick(event, -1);

  private _onScoreButtonClick(event: Event, delta: number): void {
    const el = (event.currentTarget as HTMLElement).closest(
      '.edit-champion-item',
    ) as HTMLElement;
    const id = el.dataset.id as string;

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/champions/${escapePatchPathComponent(id)}/score`,
          value: (this.props.champions[id]?.score || 0) + delta,
        },
      ],
    });
  }

  private _onResetClick = () => {
    if (!confirm('Are you sure?')) return;

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: Object.keys(this.props.champions).map(championId => ({
        op: 'replace',
        path: `/champions/${escapePatchPathComponent(championId)}/score`,
        value: 0,
      })),
    });
  };

  private _onAddClick = () => {
    this.setState(({ editedChampions }) => ({
      editedChampions: {
        ...editedChampions,
        [generateRandomId()]: {
          name: '',
          picture: '',
          score: 0,
          saving: false,
        },
      },
    }));
  };

  private _onEditClick = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const champEl = el.closest('.edit-champion-item') as HTMLInputElement;
    const id = champEl.dataset.id!;

    this.setState(({ editedChampions }) => ({
      editedChampions: {
        ...editedChampions,
        [id]: {
          ...this.props.champions[id],
          saving: false,
        },
      },
    }));
  };

  private _onDeleteClick = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const champEl = el.closest('.edit-champion-item') as HTMLInputElement;
    const id = champEl.dataset.id!;

    if (
      !confirm(`Delete ${this.props.champions[id].name || 'Unnamed champion'}?`)
    ) {
      return;
    }

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'remove',
          path: `/champions/${escapePatchPathComponent(id)}`,
        },
      ],
    });
  };

  private _onSaveClick = async (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const champEl = el.closest('.edit-champion-item') as HTMLInputElement;
    const id = champEl.dataset.id!;

    this.setState(({ editedChampions }) => ({
      editedChampions: {
        ...editedChampions,
        [id]: {
          ...editedChampions[id],
          saving: true,
        },
      },
    }));

    const keys: Array<keyof Champion> = ['name', 'picture'];
    const isNew = !(id in this.props.champions);
    const patches: Operation[] = [];

    if (isNew) {
      patches.push({
        op: 'add',
        path: `/champions/${escapePatchPathComponent(id)}`,
        value: { score: 0 },
      });
    }

    patches.push(
      ...(keys.map(key => ({
        op: 'replace',
        path: `/champions/${escapePatchPathComponent(id)}/${key}`,
        value: this.state.editedChampions[id][key],
      })) as Operation[]),
    );

    await fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: patches,
    });

    this.setState(({ editedChampions }) => {
      const newEditedChampions = { ...editedChampions };
      delete newEditedChampions[id];
      return { editedChampions: newEditedChampions };
    });
  };

  private _onChampionInput = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const champEl = el.closest('.edit-champion-item') as HTMLInputElement;
    const id = champEl.dataset.id!;
    const nameEl = champEl.querySelector(
      '.edit-champion-name',
    ) as HTMLInputElement;
    const urlEl = champEl.querySelector(
      '.edit-champion-url',
    ) as HTMLInputElement;

    this.setState(({ editedChampions }) => ({
      editedChampions: {
        ...editedChampions,
        [id]: {
          ...editedChampions[id],
          name: nameEl.value,
          picture: urlEl.value,
        },
      },
    }));
  };

  render({ champions }: Props, { editedChampions }: State) {
    const allChampions = { ...champions, ...editedChampions };

    return (
      <section>
        <h1>Champions</h1>
        <div class="edit-champions">
          {Object.entries(allChampions).map(([id, champion]) => (
            <div key={id} class="edit-champion-item" data-id={id}>
              <div class="edit-champions-data">
                {id in editedChampions ? (
                  <div class="admin-form-item">
                    <div>
                      <label>
                        <span class="label">Name</span>
                        <input
                          class="input edit-champion-name"
                          type="text"
                          disabled={editedChampions[id].saving}
                          value={champion.name}
                          onInput={this._onChampionInput}
                          autoFocus
                        />
                      </label>
                    </div>
                    <div>
                      <label>
                        <span class="label">Avatar URL (270x270)</span>
                        <input
                          class="input edit-champion-url"
                          type="url"
                          disabled={editedChampions[id].saving}
                          value={champion.picture}
                          onInput={this._onChampionInput}
                        />
                      </label>
                    </div>
                    <div>
                      <button
                        disabled={editedChampions[id].saving}
                        class="button"
                        onClick={this._onSaveClick}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <img
                      class="edit-champions-img"
                      width="270"
                      height="270"
                      src={champion.picture || genericAvatarURL}
                      alt={champion.name}
                    />
                    <div class="edit-champion-edit-delete">
                      <button class="button" onClick={this._onEditClick}>
                        ✐
                      </button>{' '}
                      <button
                        class="button button-danger"
                        onClick={this._onDeleteClick}
                      >
                        ⓧ
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!(id in editedChampions) && (
                <div class="edit-champion-score">
                  <button class="button" onClick={this._onMinusClick}>
                    -
                  </button>
                  <div class="edit-champion-score-num">
                    {champion.score || 0}
                  </div>
                  <button class="button" onClick={this._onPlusClick}>
                    +
                  </button>
                </div>
              )}
            </div>
          ))}
          <div class="edit-champion-item">
            <div class="admin-form-item">
              <div>
                <button class="button" onClick={this._onAddClick}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="reset-row">
          <button class="button button-danger" onClick={this._onResetClick}>
            Reset scores
          </button>
        </div>
      </section>
    );
  }
}

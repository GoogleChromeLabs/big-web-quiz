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

import { Topics, Champions, Topic, palette } from 'shared/state';
import {
  generateRandomId,
  escapePatchPathComponent,
  fetchJSON,
} from 'client/utils';
import WS from '../../ws';
import Select from '../select';
import ColorSelect from '../color-select';

interface LocalTopic extends Topic {
  saved: boolean;
  toDelete: boolean;
}

interface LocalTopics {
  [id: string]: LocalTopic;
}

interface State {
  topics: Topics;
  champions: Champions;
  localTopics: LocalTopics;
  saving: boolean;
  receivedData: boolean;
}

/**
 * Sync local topics with topic. Local topics are left alone if they're unsaved, unless the update is forced.
 */
function updateLocalTopics(
  topics: Topics,
  currentLocalTopics: LocalTopics,
  { forceUpdate = false }: { forceUpdate?: boolean } = {},
): LocalTopics {
  const output: LocalTopics = {};

  for (const [id, topic] of Object.entries(topics)) {
    // Keep unsaved local items
    if (
      !forceUpdate &&
      currentLocalTopics[id] &&
      currentLocalTopics[id].saved === false
    ) {
      output[id] = currentLocalTopics[id];
    } else {
      output[id] = { ...topic, saved: true, toDelete: false };
    }

    if (!forceUpdate) {
      // Look for unsaved 'new' topics in currentLocalTopics that we should keep:
      for (const [id, localItem] of Object.entries(currentLocalTopics)) {
        if (!localItem.saved && !topics[id]) {
          output[id] = localItem;
        }
      }
    }
  }

  return output;
}

export default class AdminTopics extends Component<{}, State> {
  private _topicPatches: Operation[] = [];
  private _ws = new WS('/admin/ws', msg => this._onWsMessage(msg));
  state: State = {
    topics: {},
    champions: {},
    localTopics: {},
    saving: false,
    receivedData: false,
  };

  private _onWsMessage(message: string) {
    const data = JSON.parse(message);
    const interestingKeys: Array<keyof State> = ['topics', 'champions'];
    const receivedKeys = new Set(Object.keys(data.state));
    const hasInterestingKeys = interestingKeys.some(v => receivedKeys.has(v));

    if (!hasInterestingKeys) return;

    const newState: Partial<State> = {
      receivedData: true,
    };

    for (const key of interestingKeys) {
      if (key in data.state) {
        newState[key] = data.state[key];
      }
    }

    this.setState(currentState => {
      if (newState.topics) {
        newState.localTopics = updateLocalTopics(
          newState.topics,
          currentState.localTopics,
        );
      }

      this.setState(newState);
    });
  }

  private _updateLocalTopic<Prop extends keyof Topic>(
    id: string,
    prop: Prop,
    newVal: Topic[Prop],
  ) {
    this.setState(prevState => ({
      localTopics: {
        ...prevState.localTopics,
        [id]: {
          ...prevState.localTopics[id],
          [prop]: newVal,
          saved: false,
        },
      },
    }));
  }

  private _onTopicPropInput = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const newVal = el.value;
    const id = el.dataset.id!;
    const prop = el.dataset.name as keyof Topic;

    this._updateLocalTopic(id, prop, newVal);
  };

  private _onTopicPropChange = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const newVal = el.value;
    const id = el.dataset.id!;
    const prop = el.dataset.name!;

    this._topicPatches.push({
      op: 'replace',
      path: `/topics/${escapePatchPathComponent(id)}/${prop}`,
      value: newVal,
    });
  };

  private _onTopicColorChange = (id: string, newVal: number) => {
    this._updateLocalTopic(id, 'colorId', newVal);

    this._topicPatches.push({
      op: 'replace',
      path: `/topics/${escapePatchPathComponent(id)}/colorId`,
      value: newVal,
    });
  };

  private _onTopicDeleteClick = (event: Event) => {
    const el = event.currentTarget as HTMLButtonElement;
    const id = el.dataset.id!;

    this.setState(prevState => ({
      localTopics: {
        ...prevState.localTopics,
        [id]: {
          ...prevState.localTopics[id],
          toDelete: true,
          saved: false,
        },
      },
    }));

    this._topicPatches.push({
      op: 'remove',
      path: `/topics/${escapePatchPathComponent(id)}`,
    });
  };

  private _onTopicAddClick = (event: Event) => {
    this.setState(prevState => {
      const newId = generateRandomId();
      const previousTopic = Object.values(prevState.localTopics).slice(-1)[0];
      const newTopic: Topic = {
        championId: '',
        label: '',
        slidesURL: '',
        // Pick colour after the previous item
        colorId:
          (previousTopic ? previousTopic.colorId + 1 : 0) % palette.length,
      };

      this._topicPatches.push({
        op: 'add',
        path: `/topics/${escapePatchPathComponent(newId)}`,
        value: newTopic,
      });

      return {
        localTopics: {
          ...prevState.localTopics,
          [newId]: {
            ...newTopic,
            saved: false,
            toDelete: false,
          },
        },
      };
    });
  };

  private _onTopicSaveClick = async (event: Event) => {
    this.setState({ saving: true });
    const body = this._topicPatches;
    this._topicPatches = [];

    await fetchJSON('/admin/patch', {
      method: 'PATCH',
      body,
    });

    this.setState(currentState => {
      return {
        saving: false,
        localTopics: updateLocalTopics(
          currentState.topics,
          currentState.localTopics,
          { forceUpdate: true },
        ),
      };
    });
  };

  componentWillUnmount() {
    this._ws.close();
  }

  render(_: {}, { localTopics, saving, receivedData, champions }: State) {
    if (!receivedData) return <div>Loading…</div>;
    const hasUnsavedTopics = Object.values(localTopics).some(t => !t.saved);

    return (
      <div>
        <div class="topic-save">
          <button
            class="button"
            disabled={!hasUnsavedTopics}
            onClick={this._onTopicSaveClick}
          >
            Save
          </button>{' '}
          {saving
            ? ' Saving…'
            : hasUnsavedTopics
            ? `Don't forget to save!`
            : ''}
        </div>
        <fieldset class="topic-forms-fieldset" disabled={saving}>
          <div class="topic-forms">
            {Object.entries(localTopics).map(([id, topic]) => {
              if (topic.toDelete) {
                return (
                  <div class="delete-topic" key={id}>
                    <div>
                      {topic.label || 'Unlabelled item'} will be deleted
                    </div>
                  </div>
                );
              }

              return (
                <div class="topic-form" key={id}>
                  <div>
                    <label>
                      <span class="label">Label</span>
                      <input
                        class="input"
                        data-id={id}
                        data-name={'label'}
                        type="text"
                        value={topic.label}
                        onChange={this._onTopicPropChange}
                        onInput={this._onTopicPropInput}
                      />
                    </label>
                  </div>
                  <div>
                    <label>
                      <span class="label">Champion</span>
                      <Select
                        value={topic.championId}
                        data-id={id}
                        data-name={'championId'}
                        onChange={this._onTopicPropChange}
                        onInput={this._onTopicPropInput}
                      >
                        <option value="">None</option>
                        {Object.entries(champions).map(([id, champion]) => (
                          <option value={id}>{champion.name}</option>
                        ))}
                      </Select>
                    </label>
                  </div>

                  <div>
                    <label>
                      <span class="label">Slides URL</span>
                      <input
                        class="input"
                        data-id={id}
                        data-name={'slidesURL'}
                        type="text"
                        value={topic.slidesURL}
                        onChange={this._onTopicPropChange}
                        onInput={this._onTopicPropInput}
                      />
                    </label>
                  </div>
                  <div>
                    <span class="label">Colour</span>
                    <ColorSelect
                      name={'topic-color-' + id}
                      disabled={saving}
                      value={topic.colorId || 0}
                      onChange={newVal => this._onTopicColorChange(id, newVal)}
                    />
                  </div>
                  <div>
                    <button
                      class="button button-danger"
                      data-id={id}
                      onClick={this._onTopicDeleteClick}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            <div class="add-topic">
              <button class="button" onClick={this._onTopicAddClick}>
                Add
              </button>
            </div>
          </div>
        </fieldset>
      </div>
    );
  }
}

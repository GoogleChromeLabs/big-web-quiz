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
import { Result, Topics, Champions } from 'shared/state';
import {
  getResultLabel,
  getResultTopic,
  getResultChampionName,
  fetchJSON,
  escapePatchPathComponent,
} from 'client/utils';
import Select from '../../select';

interface Props {
  topics: Topics;
  champions: Champions;
  path: string;
  result?: Result;
  onShowSlides: (url: string) => void;
  onCreateVote: () => void;
}

const AdminSelectedBracketWrapper: FunctionalComponent<{}> = ({ children }) => (
  <section>
    <h1>Selected bracket</h1>
    {children}
  </section>
);

const TopicsSelect: FunctionalComponent<{
  value: string;
  topics: Topics;
  onInput: (event: Event) => void;
}> = ({ onInput, topics, value }) => {
  const sortedTopics = Object.entries(topics).sort((a, b) =>
    a[1].label > b[1].label ? 1 : -1,
  );

  return (
    <Select onInput={onInput} value={value}>
      <option value=""></option>
      {sortedTopics.map(([id, topic]) => (
        <option value={id}>{topic.label}</option>
      ))}
    </Select>
  );
};

export default class AdminSelectedBracket extends Component<Props> {
  private _onTopicSelect = (event: Event) => {
    const el = event.currentTarget as HTMLSelectElement;
    const container = el.closest('.admin-form-item') as HTMLElement;

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/results${this.props.path}/items/${Number(
            container.dataset.itemIndex,
          )}`,
          value: el.value,
        },
      ],
    });
  };

  private _onChampionSelect = (event: Event) => {
    const el = event.currentTarget as HTMLSelectElement;
    const container = el.closest('.admin-form-item') as HTMLElement;
    const topicId = this.props.result!.items[
      Number(container.dataset.itemIndex)
    ];

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/topics/${escapePatchPathComponent(
            topicId as string,
          )}/championId`,
          value: el.value,
        },
      ],
    });
  };

  private _setWinner(index: number) {
    const path = this.props.path === '/' ? '' : this.props.path;

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/results${path}/winningIndex`,
          value: index,
        },
      ],
    });
  }

  private _onWinnerSelect = (event: Event) => {
    const el = event.currentTarget as HTMLSelectElement;
    const container = el.closest('.admin-form-item') as HTMLElement;
    this._setWinner(Number(container.dataset.itemIndex));
  };

  private _onShowSlides = (event: Event) => {
    const el = event.currentTarget as HTMLSelectElement;
    const container = el.closest('.admin-form-item') as HTMLElement;
    const index = Number(container.dataset.itemIndex);
    const topic = getResultTopic(
      this.props.topics,
      this.props.result!.items[index],
    );
    this.props.onShowSlides(topic!.slidesURL);
  };

  private _onClearWinner = () => {
    this._setWinner(-1);
  };

  private _onCreateVote = () => {
    this.props.onCreateVote();
  };

  private _onZoomHere = () => {
    let toHighlight: string[];

    if (this.props.path === '/') {
      toHighlight = ['0', '1'];
    } else {
      const parentPath = this.props.path
        .split('/items/')
        .slice(1)
        .join('-');

      toHighlight = [parentPath, parentPath + '-0', parentPath + '-1'];
    }

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/bracketZoom`,
          value: toHighlight,
        },
      ],
    });
  };

  render({ result, topics, champions }: Props) {
    if (!result) {
      return (
        <AdminSelectedBracketWrapper>
          <p>No bracket item selected</p>
        </AdminSelectedBracketWrapper>
      );
    }
    return (
      <AdminSelectedBracketWrapper>
        <div class="admin-form-items">
          {result.items.map((item, i) => {
            const isLeaf = typeof item === 'string';
            const topic = getResultTopic(topics, item);

            const topicAndChamp = isLeaf
              ? [
                  <div>
                    <label>
                      <span class="label">Topic</span>
                      <TopicsSelect
                        value={item as string}
                        topics={topics}
                        onInput={this._onTopicSelect}
                      />
                    </label>
                  </div>,
                  <div>
                    <label>
                      <span class="label">Champion</span>
                      <Select
                        disabled={!topic}
                        value={topic ? topic.championId : ''}
                        onInput={this._onChampionSelect}
                      >
                        <option value="">{topic ? 'None' : ''}</option>
                        {Object.entries(champions).map(([id, champion]) => (
                          <option value={id}>{champion.name}</option>
                        ))}
                      </Select>
                    </label>
                  </div>,
                ]
              : [
                  <div>
                    <span class="label">Topic</span>{' '}
                    <span class="prefilled-input">
                      {getResultLabel(topics, item) || 'Pending'}
                    </span>
                  </div>,
                  <div>
                    <span class="label">Champion</span>{' '}
                    <span class="prefilled-input">
                      {getResultChampionName(topics, item, champions) ||
                        'Pending'}
                    </span>
                  </div>,
                ];

            return (
              <div class="admin-form-item" data-item-index={i}>
                {topicAndChamp}
                <div>
                  <button
                    class="button"
                    disabled={result.winningIndex === i}
                    onClick={this._onWinnerSelect}
                  >
                    Set as winner
                  </button>{' '}
                  {topic && topic.slidesURL && (
                    <button class="button" onClick={this._onShowSlides}>
                      Show slides
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div class="admin-form-extras">
            <div class="label">Actions</div>
            <div>
              <button
                class="button"
                disabled={result.winningIndex === -1}
                onClick={this._onClearWinner}
              >
                Clear winner
              </button>{' '}
              <button class="button" onClick={this._onCreateVote}>
                Create vote
              </button>{' '}
              <button class="button" onClick={this._onZoomHere}>
                Zoom here
              </button>
            </div>
          </div>
        </div>
      </AdminSelectedBracketWrapper>
    );
  }
}

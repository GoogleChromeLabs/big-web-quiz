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

import WS from '../../ws';
import AdminChampions from './champions';
import {
  Result,
  Topics,
  Vote,
  VoteItem,
  PresentationView,
  Champions,
} from 'shared/state';
import {
  getValueByPath,
  generateRandomId,
  getResultTopic,
  fetchJSON,
} from 'client/utils';
import AdminBracket from './bracket';
import AdminSelectedBracket from './selected-bracket';
import AdminVote from './vote';
import AdminPresentationView from './presentation-view';
import AdminIframe from './iframe';

interface State {
  champions: Champions;
  receivedData: boolean;
  results?: Result;
  topics: Topics;
  selectedBracketPath: string;
  vote?: Vote;
  presentationView?: PresentationView;
  iframe: string;
  voteCount: [number, number] | null;
}

export default class Admin extends Component<{}, State> {
  private _ws = new WS('/admin/ws', msg => this._onWsMessage(msg));
  state: State = {
    champions: {},
    receivedData: false,
    topics: {},
    selectedBracketPath: '',
    iframe: '',
    voteCount: null,
  };

  private _onWsMessage(message: string) {
    const data = JSON.parse(message);
    const interestingKeys: Array<keyof State> = [
      'champions',
      'results',
      'topics',
      'vote',
      'voteCount',
      'presentationView',
      'iframe',
    ];
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

    this.setState(newState);
  }

  private _onSelectBracket = (path: string) => {
    this.setState({ selectedBracketPath: path });
  };

  private _onCreateBracketVote = () => {
    const result = getValueByPath(
      this.state.results!,
      this.state.selectedBracketPath,
    ) as Result;

    const items = result.items
      .map(item => getResultTopic(this.state.topics, item))
      .map(topic => {
        if (!topic) return {};
        return {
          championId: topic.championId,
          label: topic.label,
          colorId: topic.colorId,
        };
      });

    this._onNewVote(items);
  };

  private _onNewVote = (
    items: Array<{
      championId?: string;
      label?: string;
      colorId?: number;
    }> = [],
  ) => {
    const defaultItem: VoteItem = {
      championId: '',
      label: '',
      colorId: 5,
    };

    const item1 = { ...defaultItem, ...items[0] };
    const item2 = { ...defaultItem, colorId: 14, ...items[1] };

    const vote: Vote = {
      id: generateRandomId(),
      state: 'staging',
      items: [item1, item2],
    };

    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/vote`,
          value: vote,
        },
      ],
    });
  };

  private _onIframeAction = (action: string) => {
    this._ws.send(
      JSON.stringify({
        action: 'big-screen-broadcast',
        message: { iframeAction: action },
      }),
    );
  };

  private _onIframeChange = (newVal: string) => {
    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/iframe`,
          value: newVal,
        },
      ],
    });
  };

  componentWillUnmount() {
    this._ws.close();
  }

  render(
    _: {},
    {
      receivedData,
      champions,
      results,
      topics,
      selectedBracketPath,
      vote,
      voteCount,
      presentationView,
      iframe,
    }: State,
  ) {
    if (!receivedData) return <div>Loading…</div>;

    const selectedBracket: Result | undefined = selectedBracketPath
      ? getValueByPath(results, selectedBracketPath)
      : undefined;

    return (
      <div>
        <AdminPresentationView mode={presentationView!} />
        <AdminChampions champions={champions} />
        <AdminBracket
          onSelectBracket={this._onSelectBracket}
          results={results}
          topics={topics}
        />
        <AdminSelectedBracket
          topics={topics}
          champions={champions}
          result={selectedBracket}
          path={selectedBracketPath}
          onCreateVote={this._onCreateBracketVote}
          onShowSlides={this._onIframeChange}
        />
        <AdminIframe
          iframe={iframe}
          onAction={this._onIframeAction}
          onChange={this._onIframeChange}
        />
        <AdminVote
          key={vote ? vote.id : 'no-vote'}
          champions={champions}
          vote={vote}
          voteCount={voteCount}
          onNewVote={this._onNewVote}
        />
      </div>
    );
  }
}

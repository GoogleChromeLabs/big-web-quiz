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
import { h, Component, FunctionalComponent, JSX } from 'preact';
import { Result, Topics } from 'shared/state';
import { getResultLabel, fetchJSON } from 'client/utils';

interface Props {
  results?: Result;
  topics: Topics;
  onSelectBracket: (path: string) => void;
}

interface innerProps {
  onZoomOut: () => void;
  onGenerateClick: () => void;
}

const AdminBracketWrapper: FunctionalComponent<innerProps> = ({
  children,
  onGenerateClick,
  onZoomOut,
}) => (
  <section>
    <h1>Bracket</h1>
    {children}
    <div class="reset-row">
      <button class="button button-danger" onClick={onGenerateClick}>
        Regenerate bracket
      </button>{' '}
      <button class="button" onClick={onZoomOut}>
        Zoom out
      </button>
    </div>
  </section>
);

export default class AdminBracket extends Component<Props> {
  private _onRegenerateClick = () => {
    if (!confirm('Are you sure? This will reset all votes.')) return;
    const promptAnswer = prompt(
      'How many in competition?',
      Object.keys(this.props.topics).length.toString(),
    );
    if (promptAnswer === null) return;

    fetchJSON('/admin/generate-bracket', {
      method: 'POST',
      body: { num: Number(promptAnswer) },
    });
  };

  private _onZoomOutClick = () => {
    fetchJSON('/admin/patch', {
      method: 'PATCH',
      body: [
        {
          op: 'replace',
          path: `/bracketZoom`,
          value: null,
        },
      ],
    });
  };

  private _onSelectBracketClick = (event: Event) => {
    const el = event.currentTarget as HTMLElement;
    const path = el.dataset.path!;
    this.props.onSelectBracket(path);
  };

  private _getResultLabel(result: Result | string): string {
    return getResultLabel(this.props.topics, result);
  }

  private _createBracketColumns(
    results: Result[],
    resultsPaths: string[],
    stage: number,
  ): JSX.Element[] {
    const toCreate = 2 ** stage / 2;
    const mapper = Array(toCreate).fill(undefined);

    const cols = [
      <div
        class={`bracket-column${stage === 1 ? ' bracket-column-semis' : ''}`}
      >
        {mapper.map((_, i) => (
          <div class="bracket-items-container">
            {results[i] && [
              ...results[i].items.map(item => (
                <div
                  class={`bracket-item${
                    typeof item === 'string' ? ' bracket-item-leaf' : ''
                  }`}
                >
                  {this._getResultLabel(item) ||
                    (typeof item === 'string' ? 'Unselected' : 'Undecided')}
                </div>
              )),
              <button
                class="button result-edit-button"
                data-path={resultsPaths[i]}
                onClick={this._onSelectBracketClick}
              >
                ...
              </button>,
            ]}
          </div>
        ))}
      </div>,
    ];

    const nextResults: Result[] = [];
    const nextResultsPaths: string[] = [];

    for (const [i, result] of results.entries()) {
      const path = resultsPaths[i];

      for (let itemI = 0; itemI < 2; itemI++) {
        if (typeof result.items[itemI] === 'string') continue;
        nextResults.push(result.items[itemI] as Result);
        nextResultsPaths.push(path + '/items/' + itemI);
      }
    }

    if (nextResults.length !== 0) {
      cols.push(
        ...this._createBracketColumns(nextResults, nextResultsPaths, stage + 1),
      );
    }

    return cols;
  }

  private _createBracket(result: Result): JSX.Element {
    const cols = [
      <div class="bracket-center">
        <div class="bracket-center-items">
          <div class="bracket-center-item">
            {this._getResultLabel(result.items[0]) ||
              (typeof result.items[0] === 'string'
                ? 'Unselected'
                : 'Undecided')}
          </div>
          <div class="bracket-center-vs">
            <button
              class="button"
              data-path="/"
              onClick={this._onSelectBracketClick}
            >
              ...
            </button>
          </div>
          <div class="bracket-center-item">
            {this._getResultLabel(result.items[1]) ||
              (typeof result.items[0] === 'string'
                ? 'Unselected'
                : 'Undecided')}
          </div>
        </div>
      </div>,
    ];

    for (let i = 0; i < 2; i++) {
      if (typeof result.items[i] === 'string') continue;
      const newCols = this._createBracketColumns(
        [result.items[i] as Result],
        ['/items/' + i],
        1,
      );

      if (i === 0) {
        cols.unshift(...newCols.reverse());
      } else {
        cols.push(...newCols);
      }
    }

    return <div class="bracket">{cols}</div>;
  }

  render({ results }: Props) {
    if (!results) {
      return (
        <AdminBracketWrapper
          onGenerateClick={this._onRegenerateClick}
          onZoomOut={this._onZoomOutClick}
        >
          <p>No bracket initialised. Press "Regenerate bracket".</p>
        </AdminBracketWrapper>
      );
    }

    return (
      <AdminBracketWrapper
        onGenerateClick={this._onRegenerateClick}
        onZoomOut={this._onZoomOutClick}
      >
        <div class="bracket-scroller">{this._createBracket(results)}</div>
      </AdminBracketWrapper>
    );
  }
}

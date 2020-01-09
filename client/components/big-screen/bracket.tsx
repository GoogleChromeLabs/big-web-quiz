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
import { h, Component, JSX } from 'preact';
import { Result, Topics, Champions, palette } from 'shared/state';
import { getResultTopic, getMidColor, getHexColor } from 'client/utils';
import VS from './vs';

const genericAvatarURL =
  'https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Favatar.svg?v=1577974252576';

function createCenterItem(
  topics: Topics,
  champions: Champions,
  result: Result,
  index: number,
) {
  const topic = getResultTopic(topics, result.items[index]);
  const champImg = champions[topic?.championId || '']?.picture || '';
  const won = result.winningIndex === index;
  const lost = result.winningIndex !== -1 && !won;

  return (
    <div
      data-path={index}
      class={`bracket-center-item-outer bracket-center-item-outer-${
        index === 0 ? 'left' : 'right'
      }`}
    >
      <div class={`bracket-center-item-mover${lost ? ' lost' : ''}`}>
        <div
          class={`bracket-item-champion bracket-item-champion-center${
            index === 1 ? ' bracket-item-champion-center-right' : ''
          }`}
        >
          {[
            topic?.championId && <img src={champImg || genericAvatarURL} />,
            <div
              class="bracket-item-champion-unknown"
              style={{ opacity: topic?.championId ? 0 : 1 }}
            >
              ?
            </div>,
          ]}
        </div>
        <div class="bracket-center-item">
          {topic ? topic.label : 'TBD'}
          <div
            class="bracket-center-item-tbd"
            style={{ opacity: topic ? 0 : 1 }}
          >
            TBD
          </div>
          {topic && (
            <div
              class="bracket-item-win"
              style={{
                opacity: won ? 1 : 0,
                '--color-from': getHexColor(palette[topic.colorId][0]),
                '--color-to': getHexColor(palette[topic.colorId][1]),
              }}
            >
              {topic.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  results: Result;
  topics: Topics;
  champions: Champions;
  toZoomTo?: string[];
}

export default class Bracket extends Component<Props> {
  componentDidMount() {
    const root = this.base as HTMLElement;
    const scaler = root.querySelector('.bracket-scaler') as HTMLElement;
    const containerRect = root.getBoundingClientRect();
    const scalerRect = scaler.getBoundingClientRect();
    const scale = Math.min(
      containerRect.width / scalerRect.width,
      containerRect.height / scalerRect.height,
    );
    scaler.style.transform = `scale(${scale})`;

    if (this.props.toZoomTo) this._setTransform();
  }

  componentDidUpdate(previousProps: Props) {
    if (previousProps.toZoomTo !== this.props.toZoomTo) {
      this._setTransform({ animate: true });
    }
  }

  private _setTransform({ animate }: { animate?: boolean } = {}): void {
    // Dear reader: I want to apologise for everything in this function.
    // I am not good at matrix maths. Writing this nearly melted my brain.
    // I'm sure it can be done in a much simpler way.
    // The intent is to apply a transform to `mover` that makes the toZoomTo
    // elements fill the viewport.
    const root = this.base as HTMLElement;
    const toZoomTo = this.props.toZoomTo;
    const mover = root.querySelector('.bracket-mover') as HTMLElement;
    const currentTransform = new DOMMatrix(mover.style.transform);

    if (!toZoomTo) {
      mover.style.transition = animate ? '' : 'none';
      mover.style.transform = '';
      return;
    }

    const containerRect = root.getBoundingClientRect();
    const transform = new DOMMatrix();
    const getBoundsForPath = (path: string): ClientRect =>
      (root.querySelector(
        `[data-path="${path}"]`,
      ) as HTMLElement).getBoundingClientRect();

    // Get the bounds of everything we want to focus on
    const boundingRect = toZoomTo
      .slice(1)
      .reduce<ClientRect>((rect: ClientRect, path: string) => {
        const pathRect = getBoundsForPath(path);
        const x1 = Math.min(rect.left, pathRect.left);
        const y1 = Math.min(rect.top, pathRect.top);
        const x2 = Math.max(
          rect.left + rect.width,
          pathRect.left + pathRect.width,
        );
        const y2 = Math.max(
          rect.top + rect.height,
          pathRect.top + pathRect.height,
        );

        return new DOMRect(x1, y1, x2 - x1, y2 - y1);
      }, getBoundsForPath(toZoomTo[0]));

    // How much would we need to scale it by to fit it in the container?
    const perspective = 1000;
    const currentScale = perspective / (perspective - currentTransform.m43);
    const scale = Math.min(
      containerRect.width / (boundingRect.width / currentScale),
      containerRect.height / (boundingRect.height / currentScale),
    );

    // Turn that into a z translation.
    const z = (perspective * (scale - 1)) / scale - currentTransform.m43;

    // Apply that transform and see where things are.
    transform.translateSelf(0, 0, z);
    const tl = new DOMPoint(
      boundingRect.left,
      boundingRect.top,
    ).matrixTransform(transform);
    const br = new DOMPoint(
      boundingRect.left + boundingRect.width,
      boundingRect.top + boundingRect.height,
    ).matrixTransform(transform);

    // Now translate that so it's in the middle of the viewport.
    transform.translateSelf(
      (-((tl.x + br.x) / 2) + containerRect.width / 2 + containerRect.left) /
        currentScale,
      (-((tl.y + br.y) / 2) + containerRect.height / 2 + containerRect.top) /
        currentScale,
    );

    // Now apply the original transformation.
    transform.preMultiplySelf(currentTransform);

    // And set it
    mover.style.transform = transform.toString();
    mover.style.transition = animate ? '' : 'none';
  }

  private _createBracketColumns(
    results: Result[],
    resultPaths: number[][],
    stage: number,
    isLeftHandSide: boolean,
  ): JSX.Element[] {
    const toCreate = 2 ** stage / 2;
    const mapper = Array(toCreate).fill(undefined);

    const cols = [
      <div
        class={`bracket-column${stage === 1 ? ' bracket-column-semis' : ''}${
          isLeftHandSide ? ' bracket-column-left' : ''
        }`}
      >
        {mapper.map((_, i) => {
          // lol this needs refactoring
          let topColor = '';
          let bottomColor = '';
          let nextColor = '';

          if (results[i]) {
            const result = results[i];
            const topTopic = getResultTopic(this.props.topics, result.items[0]);
            const bottomTopic = getResultTopic(
              this.props.topics,
              result.items[1],
            );

            if (result.winningIndex === 0 && topTopic) {
              nextColor = topColor = getHexColor(
                getMidColor(
                  palette[topTopic.colorId][0],
                  palette[topTopic.colorId][1],
                ),
              );
            } else if (result.winningIndex === 1 && bottomTopic) {
              nextColor = bottomColor = getHexColor(
                getMidColor(
                  palette[bottomTopic.colorId][0],
                  palette[bottomTopic.colorId][1],
                ),
              );
            }
          }

          return (
            <div class="bracket-items-container">
              {results[i] && [
                ...results[i].items.map((item, itemIndex) => {
                  const topic = getResultTopic(this.props.topics, item);
                  const champImg =
                    this.props.champions[topic?.championId || '']?.picture ||
                    '';
                  const won = results[i].winningIndex === itemIndex;
                  const lost = results[i].winningIndex !== -1 && !won;

                  return (
                    <div class="bracket-item">
                      <div
                        class={`bracket-item-content${lost ? ' lost' : ''}`}
                        data-path={[...resultPaths[i], itemIndex].join('-')}
                      >
                        <div class="bracket-item-box">
                          {topic ? topic.label : 'TBD'}
                          <div
                            class="bracket-item-tbd"
                            style={{ opacity: topic ? 0 : 1 }}
                          >
                            TBD
                          </div>
                          {topic && (
                            <div
                              class="bracket-item-win"
                              style={{
                                opacity: won ? 1 : 0,
                                '--color-from': getHexColor(
                                  palette[topic.colorId][0],
                                ),
                                '--color-to': getHexColor(
                                  palette[topic.colorId][1],
                                ),
                              }}
                            >
                              {topic ? topic.label : 'TBD'}
                            </div>
                          )}
                        </div>
                        <div class="bracket-item-champion">
                          {[
                            topic?.championId && (
                              <img src={champImg || genericAvatarURL} />
                            ),
                            <div
                              class="bracket-item-champion-unknown"
                              style={{ opacity: topic?.championId ? 0 : 1 }}
                            >
                              ?
                            </div>,
                          ]}
                        </div>
                      </div>
                    </div>
                  );
                }),
                stage === 1 ? (
                  <div class="bracket-lines-semi">
                    <div
                      class="bracket-line bracket-line-semi-top"
                      style={{ '--line-color': topColor }}
                    />
                    <div
                      class="bracket-line bracket-line-semi-bottom"
                      style={{ '--line-color': bottomColor }}
                    />
                    <div
                      class="bracket-line-circle bracket-line-circle-top-1"
                      style={{
                        '--line-color': topColor,
                        background: topColor,
                      }}
                    />
                    <div
                      class="bracket-line-circle bracket-line-circle-top-2"
                      style={{
                        '--line-color': topColor,
                        background: topColor,
                      }}
                    />
                    <div
                      class="bracket-line-circle bracket-line-circle-bottom-1"
                      style={{
                        '--line-color': bottomColor,
                        background: bottomColor,
                      }}
                    />
                    <div
                      class="bracket-line-circle bracket-line-circle-bottom-2"
                      style={{
                        '--line-color': bottomColor,
                        background: bottomColor,
                      }}
                    />
                  </div>
                ) : (
                  <div class="bracket-lines">
                    <div
                      class="bracket-line bracket-line-top"
                      style={{ '--line-color': topColor }}
                    />
                    <div
                      class="bracket-line bracket-line-bottom"
                      style={{ '--line-color': bottomColor }}
                    />
                    <div
                      class="bracket-line bracket-line-vertical-1"
                      style={{ '--line-color': topColor }}
                    />
                    <div
                      class="bracket-line bracket-line-vertical-2"
                      style={{ '--line-color': bottomColor }}
                    />
                    <div
                      class="bracket-line bracket-line-next"
                      style={{ '--line-color': nextColor }}
                    />
                    <div
                      class="bracket-line-circle bracket-line-circle-top"
                      style={{ '--line-color': topColor, background: topColor }}
                    />
                    <div
                      class="bracket-line-circle bracket-line-circle-bottom"
                      style={{
                        '--line-color': bottomColor,
                        background: bottomColor,
                      }}
                    />
                    <div
                      class="bracket-line-circle bracket-line-circle-next"
                      style={{
                        '--line-color': nextColor,
                        background: nextColor,
                      }}
                    />
                  </div>
                ),
              ]}
            </div>
          );
        })}
      </div>,
    ];

    const nextResults: Result[] = [];
    const nextResultsPath: number[][] = [];

    for (const [i, result] of results.entries()) {
      for (let itemI = 0; itemI < 2; itemI++) {
        if (typeof result.items[itemI] === 'string') continue;
        nextResults.push(result.items[itemI] as Result);
        nextResultsPath.push([...resultPaths[i], itemI]);
      }
    }

    if (nextResults.length !== 0) {
      cols.push(
        ...this._createBracketColumns(
          nextResults,
          nextResultsPath,
          stage + 1,
          isLeftHandSide,
        ),
      );
    }

    return cols;
  }

  private _createBracket(result: Result): JSX.Element {
    const cols = [
      <div class="bracket-center">
        <div class="bracket-center-items">
          {createCenterItem(this.props.topics, this.props.champions, result, 0)}
          <div class="bracket-center-vs">
            <VS />
          </div>
          {createCenterItem(this.props.topics, this.props.champions, result, 1)}
        </div>
      </div>,
    ];

    for (let i = 0; i < 2; i++) {
      if (typeof result.items[i] === 'string') continue;
      const newCols = this._createBracketColumns(
        [result.items[i] as Result],
        [[i]],
        1,
        i === 0,
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
    return (
      <div class="bracket-container">
        <div class="bracket-mover">
          <div class="bracket-scaler">{this._createBracket(results)}</div>
        </div>
      </div>
    );
  }
}

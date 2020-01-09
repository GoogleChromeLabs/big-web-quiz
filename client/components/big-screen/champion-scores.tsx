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
import { Champions } from 'shared/state';
import Transition from '../transition';
import { animate } from 'client/utils';

const genericAvatarURL =
  'https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Favatar.svg?v=1577974252576';

interface Props {
  champions: Champions;
}

export default class PresentationChampionScores extends Component<Props> {
  private _onScoreTransition = async (el: HTMLElement) => {
    const outgoing = el.children[0] as HTMLElement;
    const incoming = el.children[1] as HTMLElement;

    const moveDistance = 200;
    const newIsLarger =
      Number(incoming.textContent) > Number(outgoing.textContent);
    const duration = 250;
    const easing = 'cubic-bezier(0.645, 0.045, 0.355, 1.000)'; // easeInOutCubic

    animate(
      outgoing,
      {
        to: {
          transform: `translateY(${moveDistance * (newIsLarger ? -1 : 1)}px)`,
          opacity: '0',
        },
      },
      { duration, easing },
    );

    return animate(
      incoming,
      {
        from: {
          transform: `translateY(${moveDistance * (newIsLarger ? 1 : -1)}px)`,
          opacity: '0',
        },
      },
      { duration, easing },
    );
  };

  render({ champions }: Props) {
    return (
      <div class="champ-scores">
        {Object.values(champions).map((champion, i) => (
          <div class="champ-scores-champ">
            <div class="champ-scores-img">
              <img
                width="270"
                height="270"
                src={champion.picture || genericAvatarURL}
              />
              <div class="champ-scores-score" style={{ '--index': i }}>
                <Transition onTransition={this._onScoreTransition}>
                  <div class="champ-scores-score-num" key={champion.score}>
                    {champion.score}
                  </div>
                </Transition>
              </div>
            </div>
            <div class="champ-scores-name">{champion.name}</div>
          </div>
        ))}
      </div>
    );
  }
}

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
import { Champions, Vote, palette } from 'shared/state';
import Transition from '../transition';
import { animate, getHexColor, getMidColor } from 'client/utils';
import VS from './vs';

interface BarsProps {
  voteCount: [number, number];
  voteGradients: [[string, string], [string, string]];
  voteTextColors: [string, string];
}

const easeOutCubic = (t: number) => --t * t * t + 1;
const barAnimDuration = 500;

class Bars extends Component<BarsProps> {
  private _animStart: number = 0;
  private _animFrom: number[] = [0, 0];
  private _animTo: number[] = [0, 0];
  private _voteBars?: NodeListOf<HTMLElement>;
  private _votePercents?: NodeListOf<HTMLElement>;
  private _animating: boolean = false;

  componentDidMount() {
    this._voteBars = (this.base as HTMLElement).querySelectorAll(
      '.vote-bar',
    ) as NodeListOf<HTMLElement>;
    this._votePercents = (this.base as HTMLElement).querySelectorAll(
      '.vote-percent',
    ) as NodeListOf<HTMLElement>;

    const totalVotes = this.props.voteCount.reduce((a, b) => a + b);

    if (totalVotes !== 0) {
      this._setAnimState([0, 0], this.props.voteCount);
      this._doAnim();
    }
  }

  shouldComponentUpdate(nextProps: BarsProps) {
    if (this.props.voteCount !== nextProps.voteCount) {
      this._setAnimState(this.props.voteCount, nextProps.voteCount);

      this._doAnim();
    }

    // This component only needs to render once.
    return false;
  }

  private _setAnimState(fromCounts: number[], toCounts: number[]) {
    const distributions = [fromCounts, toCounts].map(counts => {
      const total = counts.reduce((a, b) => a + b);
      return total ? counts.map(count => count / total) : [0, 0];
    });

    this._animFrom = distributions[0];
    this._animTo = distributions[1];
  }

  private _doAnim() {
    this._animStart = performance.now();

    if (this._animating) return;
    this._animating = true;

    const frame = () => {
      const now = performance.now();
      const pos = Math.min((now - this._animStart) / barAnimDuration, 1);
      const eased = easeOutCubic(pos);

      for (let i = 0; i < 2; i++) {
        const from = this._animFrom[i];
        const to = this._animTo[i];
        const val = (to - from) * eased + from;

        const bar = this._voteBars![i];
        const percent = this._votePercents![i];

        bar.style.setProperty('--vote-distribution', val.toString());
        percent.textContent = Math.round(val * 100) + '%';
      }

      if (pos === 1) {
        this._animating = false;
      } else {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }

  render({ voteCount, voteGradients, voteTextColors }: BarsProps) {
    return (
      <div class="vote-graph">
        {voteCount.map((number, i) => (
          <div class="vote-graph-item">
            <div
              class="vote-bar"
              style={{
                '--vote-distribution': 0,
                '--color-from': voteGradients[i][0],
                '--color-to': voteGradients[i][1],
              }}
            />
            <div class="vote-percent" style={{ color: voteTextColors[i] }}>
              0%
            </div>
          </div>
        ))}
        <div class="vote-line"></div>
      </div>
    );
  }
}

interface Props {
  vote: Vote;
  champions: Champions;
  voteCount: [number, number];
}

interface State {
  voteGradients: [[string, string], [string, string]];
  voteTextColors: [string, string];
}

export default class PresentationVote extends Component<Props, State> {
  static getDerivedStateFromProps(
    props: Props,
    state: State,
  ): Partial<State> | null {
    if (state.voteGradients) return null;

    return {
      voteGradients: props.vote.items.map(item =>
        palette[item.colorId].map(color => getHexColor(color)),
      ) as [[string, string], [string, string]],
      voteTextColors: props.vote.items.map(item =>
        getHexColor(
          getMidColor(...(palette[item.colorId] as [number, number])),
        ),
      ) as [string, string],
    };
  }

  private _onOuterTransition = (el: HTMLElement): Promise<void> => {
    const outgoing = el.children[0] as HTMLElement;
    const incoming = el.children[1] as HTMLElement;

    animate(
      outgoing,
      { to: { opacity: '0', transform: 'translateZ(-600px)' } },
      {
        duration: 500,
        // ease-in cubic
        easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
      },
    );

    return animate(
      incoming,
      { from: { opacity: '0', transform: 'translateZ(800px)' } },
      {
        duration: 200,
        delay: 300,
        // ease-in cubic
        easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
        fill: 'backwards',
      },
    ).then(() => {
      const target = document.querySelector('.main-ui') as HTMLElement;
      const duration = 300;
      const maxDistance = 25;
      const start = performance.now();

      function frame() {
        const now = performance.now();
        const progress = Math.min((now - start) / duration, 1);
        const frameMaxDistance = maxDistance - maxDistance * progress;
        const x = Math.random() * frameMaxDistance * 2 - frameMaxDistance;
        const y = Math.random() * frameMaxDistance * 2 - frameMaxDistance;

        target.style.transform = `translate(${x}px, ${y}px)`;

        if (progress !== 1) {
          requestAnimationFrame(frame);
        }
      }

      requestAnimationFrame(frame);
    });
  };

  private _onMiddleTransition = (el: HTMLElement): Promise<void> => {
    const outgoing = el.children[0] as HTMLElement;
    const incoming = el.children[1] as HTMLElement;

    if (incoming.classList.contains('vote-graph')) {
      animate(
        outgoing,
        { to: { opacity: '0', transform: 'translateZ(-300px)' } },
        {
          duration: 500,
          // ease-in cubic
          easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
        },
      ).then(() => {
        outgoing.style.opacity = '0';
      });

      return animate(
        incoming,
        { from: { opacity: '0' } },
        {
          duration: 500,
          delay: 800,
          // ease-out cubic
          easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
          fill: 'backwards',
        },
      ).then(() => {
        outgoing.style.opacity = '';
      });
    }

    animate(
      outgoing,
      { to: { opacity: '0', transform: 'translateZ(-300px)' } },
      {
        duration: 500,
        // ease-in cubic
        easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
      },
    ).then(() => {
      outgoing.style.opacity = '0';
    });

    return animate(
      incoming,
      { from: { opacity: '0', transform: 'translateZ(400px)' } },
      {
        duration: 500,
        delay: 400,
        // ease-out cubic
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        fill: 'backwards',
      },
    ).then(() => {
      outgoing.style.opacity = '';
    });
  };

  render(
    { vote, champions, voteCount }: Props,
    { voteTextColors, voteGradients }: State,
  ) {
    return (
      <div class="vote">
        <Transition onTransition={this._onOuterTransition}>
          {vote.state !== 'results' ? (
            <div key="voting">
              <Transition onTransition={this._onMiddleTransition}>
                {vote.state === 'introducing' ? (
                  <div class="vote-vs-container">
                    <VS />
                  </div>
                ) : (
                  <Bars
                    voteCount={voteCount}
                    voteTextColors={voteTextColors}
                    voteGradients={voteGradients}
                  />
                )}
              </Transition>
              <div class="vote-labels">
                {vote.items.map(item => (
                  <div
                    class={`vote-label${
                      vote.state !== 'introducing' ? ' voting' : ''
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div class="vote-results" key="results">
              <div class="vote-vs-container">
                {voteCount[0] !== voteCount[1] ? (
                  <VS
                    colorFrom={
                      voteGradients[voteCount[0] > voteCount[1] ? 0 : 1][0]
                    }
                    colorTo={
                      voteGradients[voteCount[0] > voteCount[1] ? 0 : 1][1]
                    }
                  >
                    {Math.round(
                      (Math.max(...voteCount) / (voteCount[0] + voteCount[1])) *
                        100,
                    )}
                    %
                  </VS>
                ) : (
                  <VS>Draw!</VS>
                )}
              </div>
              <div class="vote-labels">
                {vote.items.map((item, i) => (
                  <div
                    class={`vote-label${
                      voteCount[i] < voteCount[(i + 1) % 2] ? ' vote-lost' : ''
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Transition>
        <div class="vote-champs">
          {vote.items.map((item, i) =>
            champions[item.championId] ? (
              <div
                class={`vote-champ${
                  vote.state === 'results' &&
                  voteCount[i] < voteCount[(i + 1) % 2]
                    ? ' vote-lost'
                    : ''
                }`}
              >
                <div class="champ-scores-img">
                  <img
                    width="270"
                    height="270"
                    src={champions[item.championId].picture}
                  />
                </div>
                <div class="champ-scores-name">
                  {champions[item.championId].name}
                </div>
              </div>
            ) : (
              <div />
            ),
          )}
        </div>
      </div>
    );
  }
}

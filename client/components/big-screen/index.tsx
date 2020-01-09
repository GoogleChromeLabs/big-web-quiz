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
import Bracket from './bracket';
import {
  Result,
  Topics,
  PresentationView,
  Champions,
  Vote,
} from 'shared/state';
import title from 'consts:title';
import subTitle from 'consts:subTitle';
import Transition from '../transition';
import { animate } from 'client/utils';
import PresentationChampionScores from './champion-scores';
import PresentationVote from './vote';
import Audio from './audio';
import PresentationIframe from './iframe';

// Safari and Edge don't quite support extending Event, this works around it.
function fixExtendedEvent(instance: Event, type: Function) {
  if (!(instance instanceof type)) {
    Object.setPrototypeOf(instance, type.prototype);
  }
}

interface IframeActionEventInit extends EventInit {
  action: string;
}

export class IframeActionEvent extends Event {
  private _action: string;

  constructor(eventInitDict: IframeActionEventInit) {
    super('action', eventInitDict);
    fixExtendedEvent(this, IframeActionEvent);
    this._action = eventInitDict.action;
  }

  get action() {
    return this._action;
  }
}

export interface IframeActionTarget extends EventTarget {
  addEventListener(
    type: 'action',
    listener: (ev: IframeActionEvent) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: 'action',
    listener: (ev: IframeActionEvent) => any,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface Props {}

interface State {
  results?: Result;
  topics: Topics;
  bracketZoom?: string[];
  receivedData: boolean;
  presentationView?: PresentationView;
  champions: Champions;
  vote?: Vote;
  voteCount?: [number, number];
  iframe: string;
}

export default class BigScreen extends Component<Props, State> {
  private _ws = new WS('/big-screen/ws', msg => this._onWsMessage(msg));
  private _iframeActionTarget = new MessageChannel()
    .port1 as IframeActionTarget;

  state: State = {
    receivedData: false,
    iframe: '',
    topics: {},
    champions: {},
  };

  private _onWsMessage(message: string) {
    const data = JSON.parse(message);

    if ('iframeAction' in data) {
      this._iframeActionTarget.dispatchEvent(
        new IframeActionEvent({ action: data.iframeAction }),
      );
      return;
    }

    const interestingKeys: Array<keyof State> = [
      'results',
      'topics',
      'bracketZoom',
      'presentationView',
      'champions',
      'vote',
      'voteCount',
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

  componentWillUnmount() {
    this._ws.close();
  }

  private _onTransition = async (el: HTMLElement): Promise<void> => {
    const outgoing = el.children[0] as HTMLElement;
    const incoming = el.children[1] as HTMLElement;

    // Wait a microtask so the bracket can lay itself out before we apply transformations.
    await Promise.resolve();

    // Special 'slam' animation for the vote
    if (incoming.classList.contains('vote')) {
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
    _: Props,
    {
      results,
      topics,
      receivedData,
      bracketZoom,
      presentationView,
      champions,
      vote,
      voteCount,
      iframe,
    }: State,
  ) {
    if (!receivedData) return <div></div>;

    return (
      <div class="main-ui">
        <div
          class="site-title"
          style={{
            opacity:
              !vote && presentationView === 'bracket' && bracketZoom ? 0 : 1,
          }}
        >
          <h1>{title}</h1>
          <p>{subTitle}</p>
        </div>
        <Audio
          state={
            !vote || vote.state === 'results'
              ? 'stop'
              : vote.state === 'introducing'
              ? 'play'
              : vote.state === 'voting'
              ? 'upgrade'
              : 'stop'
          }
        >
          <Transition onTransition={this._onTransition}>
            {vote ? (
              <PresentationVote
                champions={champions}
                key={vote.id}
                vote={vote}
                voteCount={voteCount!}
              />
            ) : presentationView === 'url' ? (
              <div key="site-url" class="site-url">
                {location.host}
              </div>
            ) : presentationView === 'bracket' ? (
              results ? (
                <Bracket
                  key="bracket"
                  champions={champions}
                  results={results}
                  topics={topics}
                  toZoomTo={bracketZoom}
                />
              ) : (
                <div />
              )
            ) : (
              <PresentationChampionScores champions={champions} />
            )}
          </Transition>
        </Audio>
        <PresentationIframe
          src={iframe}
          actionTarget={this._iframeActionTarget}
        />
      </div>
    );
  }
}

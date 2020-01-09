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
import { ClientVote } from 'shared/state';
import Transition from '../transition';
import VoteButtons from './vote-buttons';
import { animate } from 'client/utils';

interface Props {
  initialState: Partial<State>;
}
interface State {
  vote: ClientVote | null;
}

const reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion: boolean = reduceMotionMQ.matches;
reduceMotionMQ.addListener(() => (reduceMotion = reduceMotionMQ.matches));

export default class Vote extends Component<Props, State> {
  private _ws = new WS('/ws', msg => this._onWsMessage(msg));
  state: State = {
    vote: null,
    ...this.props.initialState,
  };

  private _onWsMessage(message: string) {
    const data = JSON.parse(message);
    if (!data.state) return;
    this.setState(data.state);
  }

  private _onVote = (index: number) => {
    this._ws.send('v:' + index);
  };

  private _onTransition = async (el: HTMLElement): Promise<void> => {
    if (reduceMotion) return;

    const outgoing = el.children[0] as HTMLElement;
    const incoming = el.children[1] as HTMLElement;

    if (
      outgoing.classList.contains('waiting') &&
      incoming.classList.contains('vote-buttons')
    ) {
      animate(
        outgoing,
        { to: { opacity: '0', transform: 'translateZ(-150px)' } },
        {
          duration: 500,
          // ease-in cubic
          easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
        },
      );

      return animate(
        incoming,
        { from: { opacity: '0', transform: 'translateZ(400px)' } },
        {
          duration: 200,
          delay: 300,
          // ease-in cubic
          easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
          fill: 'backwards',
        },
      ).then(() => {
        const target = document.querySelector('.main-content') as HTMLElement;
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
    if (
      outgoing.classList.contains('vote-buttons') &&
      incoming.classList.contains('waiting')
    ) {
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
      );
    }
  };

  componentWillUnmount() {
    this._ws.close();
  }

  render(_: Props, { vote }: State) {
    return (
      <Transition onTransition={this._onTransition}>
        {!vote ? (
          <p class="waiting">Waiting on next round</p>
        ) : (
          <VoteButtons key={vote.id} vote={vote} onVote={this._onVote} />
        )}
      </Transition>
    );
  }
}

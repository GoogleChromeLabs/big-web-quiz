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
import * as comlink from 'comlink';

import Transition from '../transition';
import { animate } from 'client/utils';

interface IframeComlink {
  [comlink.releaseProxy]: () => void;
  [prop: string]: () => Promise<void>;
}

interface Props {
  src: string;
  actionTarget: import('./').IframeActionTarget;
}

interface State {
  src: string;
  showIframe: boolean;
}

export default class PresentationIframe extends Component<Props> {
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> {
    const newState: Partial<State> = {};

    if (props.src !== state.src) {
      newState.src = props.src;
      newState.showIframe = false;
    }

    return newState;
  }

  state: State = {
    src: '',
    showIframe: false,
  };

  private _iframeLink?: IframeComlink;

  componentDidMount() {
    this.props.actionTarget.addEventListener('action', this._onAction);
  }

  componentWillUnmount() {
    this.props.actionTarget.removeEventListener('action', this._onAction);
  }

  private _onAction = (event: import('./').IframeActionEvent) => {
    if (!this._iframeLink) return;
    this._iframeLink[event.action]();
  };

  private _onIframeLoad = (event: Event) => {
    const el = event.currentTarget as HTMLIFrameElement;

    if (this._iframeLink) this._iframeLink[comlink.releaseProxy]();

    this._iframeLink = comlink.wrap(
      comlink.windowEndpoint(el.contentWindow!),
    ) as IframeComlink;

    this.setState({ showIframe: true });
  };

  private _onTransition = async (el: HTMLElement): Promise<void> => {
    const outgoing = el.children[0] as HTMLElement;

    if (outgoing.nodeName === 'IFRAME') {
      return animate(
        outgoing,
        { to: { opacity: '0' } },
        // easeInOutCubic
        { duration: 500, easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)' },
      );
    }
  };

  render(_: Props, { src, showIframe }: State) {
    return (
      <div class="presentation-iframe">
        <Transition onTransition={this._onTransition}>
          {src ? (
            <iframe
              key={src}
              class={showIframe ? 'show' : ''}
              src={src}
              onLoad={this._onIframeLoad}
            ></iframe>
          ) : (
            <div />
          )}
        </Transition>
      </div>
    );
  }
}

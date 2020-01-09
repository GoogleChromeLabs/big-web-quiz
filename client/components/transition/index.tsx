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
import { h, Component, RenderableProps, toChildArray, VNode } from 'preact';

type VDOMChild = string | number | VNode;

interface Props {
  onTransition: (el: HTMLElement) => PromiseLike<void>;
}

function childIsVNode(child: VDOMChild): child is VNode {
  return typeof child === 'object';
}

export default class Transition extends Component<Props> {
  private _currentChild?: VDOMChild;
  private _transitioningOut?: VDOMChild;
  private _pendingTransition: boolean = false;

  async componentDidUpdate() {
    if (!this._pendingTransition) return;
    this._pendingTransition = false;
    await this.props.onTransition(this.base as HTMLElement);
    this._transitioningOut = undefined;
    this.setState({});
  }

  render({ children }: RenderableProps<Props>) {
    const childArray = toChildArray(children);

    if (toChildArray(children).length > 1) {
      throw Error('<Transition/> may only have one child');
    }

    const [child] = childArray;

    const updatingCurrent =
      !this._currentChild ||
      (!childIsVNode(child) && !childIsVNode(this._currentChild)) ||
      (childIsVNode(child) &&
        childIsVNode(this._currentChild) &&
        child.type === this._currentChild.type &&
        child.key === this._currentChild.key);

    if (!updatingCurrent) {
      this._transitioningOut = this._currentChild;
      this._pendingTransition = true;
    }

    this._currentChild = child;

    return (
      <div class="transition-grid">
        {[this._transitioningOut || <div />, child || <div />]}
      </div>
    );
  }
}

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

import { presetIframes } from 'shared/state';

interface IframeComlink {
  getActions: () => Promise<string[]>;
  [comlink.releaseProxy]: () => void;
}

interface Props {
  iframe: string;
  onChange: (newVal: string) => void;
  onAction: (action: string) => void;
}

interface State {
  iframe: string;
  editedIframe: string;
  editing: boolean;
  saving: boolean;
  actions: string[];
}

export default class AdminIframe extends Component<Props, State> {
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> {
    const newState: Partial<State> = {};

    if (props.iframe !== state.iframe) {
      newState.iframe = props.iframe;
      newState.actions = [];

      if (state.saving) {
        newState.saving = false;
        newState.editing = false;
      }
    }

    return newState;
  }

  state: State = {
    iframe: '',
    editedIframe: '',
    editing: false,
    saving: false,
    actions: [],
  };

  private _iframeLink?: IframeComlink;
  private _getActionsController?: AbortController;

  componentDidUpdate(_: Props, prevState: State) {
    if (this.state.iframe !== prevState.iframe) {
      if (this._iframeLink) this._iframeLink[comlink.releaseProxy]();
      if (this._getActionsController) this._getActionsController.abort();
      this.setState({ actions: [] });
    }
  }

  private _onIframeInput = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    this.setState({ editedIframe: el.value });
  };

  private _onEditClick = () => {
    this.setState(state => ({
      editedIframe: state.iframe,
      editing: true,
    }));
  };

  private _onSaveClick = () => {
    this.setState(state => {
      this.props.onChange(state.editedIframe);
      return { saving: true };
    });
  };

  private _onClearClick = () => {
    this.props.onChange('');
    this.setState({ saving: true });
  };

  private _onPresetClick = (event: Event) => {
    const el = event.currentTarget as HTMLButtonElement;
    this.props.onChange(el.dataset.url!);
    this.setState({ saving: true });
  };

  private _onIframeLoad = async (event: Event) => {
    const el = event.currentTarget as HTMLIFrameElement;

    this._iframeLink = (comlink.wrap(
      comlink.windowEndpoint(el.contentWindow!),
    ) as unknown) as IframeComlink;

    this._getActionsController = new AbortController();
    const signal = this._getActionsController.signal;

    try {
      const actions = await Promise.race([
        this._iframeLink.getActions(),
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
      ]);

      this.setState({ actions });
    } catch (err) {}
  };

  private _onActionClick = (event: Event) => {
    const el = event.currentTarget as HTMLButtonElement;
    this.props.onAction(el.textContent!);
  };

  render(_: Props, { iframe, editing, editedIframe, saving, actions }: State) {
    return (
      <section>
        <h1>Present iframe</h1>
        {iframe && (
          <iframe
            class="hidden-iframe"
            src={iframe}
            onLoad={this._onIframeLoad}
          />
        )}
        <div class="admin-form-items">
          <div class="admin-form-item">
            <div>
              <label>
                <span class="label">URL</span>
                {editing ? (
                  <input
                    class="input"
                    type="text"
                    disabled={saving}
                    value={editedIframe}
                    onInput={this._onIframeInput}
                    autoFocus
                  />
                ) : (
                  <span class="prefilled-input">{iframe || 'None'}</span>
                )}
              </label>
            </div>
            <div>
              {editing ? (
                <button
                  class="button"
                  disabled={saving}
                  onClick={this._onSaveClick}
                >
                  Save
                </button>
              ) : (
                <span>
                  <button
                    disabled={saving}
                    class="button"
                    onClick={this._onEditClick}
                  >
                    Edit
                  </button>{' '}
                  {Object.entries(presetIframes).map(([name, url]) => [
                    <button
                      class="button"
                      data-url={url}
                      onClick={this._onPresetClick}
                    >
                      {name}
                    </button>,
                    ' ',
                  ])}
                  <button
                    disabled={saving || !iframe}
                    class="button"
                    onClick={this._onClearClick}
                  >
                    Clear
                  </button>
                </span>
              )}
            </div>
          </div>
          {actions[0] && (
            <div class="admin-form-item">
              <div>
                <div class="label">Actions</div>
                {actions.map(action => [
                  <button class="button" onClick={this._onActionClick}>
                    {action}
                  </button>,
                  ' ',
                ])}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }
}

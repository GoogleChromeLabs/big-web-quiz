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
import webSocketOrigin from 'consts:webSocketOrigin';

export default class WS {
  private _wsSendBuffer: string[] = [];
  private _openWs?: WebSocket;
  private _closed: boolean = false;

  constructor(
    private _url: string,
    private _onMessage: (message: string) => void,
  ) {
    this._connectWs();
  }

  send(msg: string): void {
    this._wsSendBuffer.push(msg);
    if (this._openWs) this._sendMessages();
  }

  close() {
    this._closed = true;
    if (this._openWs) this._openWs.close();
  }

  private _sendMessages(): void {
    const toSend = this._wsSendBuffer;
    this._wsSendBuffer = [];

    for (const msg of toSend) this._openWs!.send(msg);
  }

  private _connectWs(): void {
    const url = new URL(this._url, webSocketOrigin || location.href);
    url.protocol = url.protocol.replace('http', 'ws');
    const ws = new WebSocket(url.href);

    ws.addEventListener('open', () => {
      this._openWs = ws;
      if (this._wsSendBuffer.length > 0) this._sendMessages();
    });

    ws.addEventListener('close', () => {
      this._openWs = undefined;

      if (this._closed) return;

      setTimeout(() => {
        this._connectWs();
      }, 2000);
    });

    ws.addEventListener('message', event => {
      this._onMessage(event.data);
    });
  }
}

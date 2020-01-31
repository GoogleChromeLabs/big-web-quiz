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
import { Socket } from 'net';

import { Router, Request } from 'express';
import { h } from 'preact';
import WebSocket from 'ws';

import { renderPage } from 'server/render';
import { pingClients } from 'server/utils';
import {
  emitter as stateEmitter,
  state as serverState,
  State as ServerState,
} from 'server/state';
import BigScreenPage from 'server/components/pages/big-screen';
import BigScreenIframePage from 'server/components/pages/big-screen-iframe';

export const router: Router = Router({
  strict: true,
});

router.get('/', (req, res) => {
  res.status(200).send(renderPage(<BigScreenPage />));
});

router.get('/iframe/', (req, res) => {
  res.status(200).send(renderPage(<BigScreenIframePage />));
});

const wss = new WebSocket.Server({ noServer: true });
pingClients(wss);

export function broadcast(message: Object) {
  const messageStr = JSON.stringify(message);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}

function broadcastState(state: Partial<ServerState>): void {
  broadcast({ state });
}

const interestingStateKeys: Array<keyof ServerState> = [
  'topics',
  'champions',
  'results',
  'vote',
  'voteCount',
  'bracketZoom',
  'presentationView',
  'iframe',
];

let pendingUpdate = false;

stateEmitter.on('change', async (oldState, newState, changedKeys) => {
  const interestingState: Partial<ServerState> = {};

  // Staged votes shouldn't be sent
  if (newState.vote && newState.vote.state === 'staging') {
    newState = { ...newState, vote: null };
  }

  // Throttle broadcasts to voteCount
  if (changedKeys.length === 1 && changedKeys[0] === 'voteCount') {
    if (pendingUpdate) return;
    pendingUpdate = true;
    await new Promise(r => setTimeout(r, 500));
    pendingUpdate = false;
    // Get latest values
    newState = serverState;
  }

  let foundInterestingState = false;

  for (const key of interestingStateKeys) {
    if (oldState[key] !== newState[key]) {
      // Need to cast to 'any' here as TS isn't smart enough to know key === key.
      interestingState[key] = newState[key] as any;
      foundInterestingState = true;
    }
  }

  if (!foundInterestingState) return;

  broadcastState(interestingState);
});

wss.on('connection', ws => {
  const interestingState: Partial<ServerState> = {};
  for (const key of interestingStateKeys) {
    // Need to cast to 'any' here as TS isn't smart enough to know key === key.
    interestingState[key] = serverState[key] as any;
  }

  if (interestingState.vote && interestingState.vote.state === 'staging') {
    interestingState.vote = null;
  }

  ws.send(JSON.stringify({ state: interestingState }));
});

export function upgrade(req: Request, socket: Socket, head: Buffer) {
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req);
  });
}

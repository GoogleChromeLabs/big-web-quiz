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

import { Router, Request, json } from 'express';
import { h } from 'preact';
import WebSocket from 'ws';

import { requireAdmin, assertAdmin } from '../auth';
import { renderPage } from '../render';
import AdminPage from '../components/pages/admin';
import { abortHandshake, pingClients, requireSameOrigin } from '../utils';
import {
  state,
  emitter as stateEmitter,
  State,
  patchState,
  generateBracket,
} from 'server/state';
import TopicsAdminPage from '../components/pages/admin/topics';
import { broadcast as bigScreenBroadcast } from 'server/big-screen';
import AdminSimpleLogin from 'server/components/pages/admin/simple-login';

export const router: Router = Router({
  strict: true,
});

router.get('/login/', (req, res) => {
  res.status(200).send(renderPage(<AdminSimpleLogin />));
});

router.use(requireAdmin());

router.get('/', (req, res) => {
  res.status(200).send(renderPage(<AdminPage />));
});

router.get('/topics/', (req, res) => {
  res.status(200).send(renderPage(<TopicsAdminPage />));
});

router.patch(
  '/patch',
  requireSameOrigin(),
  json({ limit: '500kb' }),
  (req, res) => {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ err: 'Expected JSON array.' });
      return;
    }

    try {
      patchState(req.body);
    } catch (err) {
      res.status(400).json({ err: 'Patch failed.' });
      console.error('Patch failed', err);
      return;
    }

    res.status(200).json({ ok: true });
  },
);

router.post('/generate-bracket', requireSameOrigin(), json(), (req, res) => {
  try {
    generateBracket(req.body.num || 16);
  } catch (err) {
    console.error('Error generating bracket', err);
    res.status(500).json({ err: 'Error generating bracket' });
    return;
  }

  res.status(200).json({ ok: true });
});

const interestingStateKeys: Array<keyof State> = [
  'topics',
  'champions',
  'results',
  'vote',
  'voteCount',
  'presentationView',
  'iframe',
];
const wss = new WebSocket.Server({ noServer: true });
pingClients(wss);

function broadcastState(interestingState: Partial<State>): void {
  const message = JSON.stringify({ state: interestingState });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

let pendingUpdate = false;

stateEmitter.on('change', async (oldState, newState, changedKeys) => {
  // Throttle broadcasts to voteCount
  if (changedKeys.length === 1 && changedKeys[0] === 'voteCount') {
    if (pendingUpdate) return;
    pendingUpdate = true;
    await new Promise(r => setTimeout(r, 500));
    pendingUpdate = false;
    // Get latest values
    newState = state;
  }

  const interestingState: Partial<State> = {};

  let foundInterestingState = false;

  for (const key of interestingStateKeys) {
    if (oldState[key] !== newState[key]) {
      // Need to cast to 'any' here as TS isn't smart enough to know key === key.
      interestingState[key] = newState[key] as any;
      foundInterestingState = true;
    }
  }

  if (foundInterestingState) {
    broadcastState(interestingState);
  }
});

wss.on('connection', ws => {
  const interestingState: Partial<State> = {};
  for (const key of interestingStateKeys) {
    // Need to cast to 'any' here as TS isn't smart enough to know key === key.
    interestingState[key] = state[key] as any;
  }

  ws.on('message', data => {
    if (typeof data !== 'string') {
      console.error(`Unexpected client data type`);
      return;
    }

    let json;

    try {
      json = JSON.parse(data);
    } catch (err) {
      console.error(`Couldn't parse client message`);
    }

    if (json.action === 'big-screen-broadcast') {
      bigScreenBroadcast(json.message);
    } else {
      console.error(`Unexpected client action`);
    }
  });

  ws.send(JSON.stringify({ state: interestingState }));
});

export function upgrade(req: Request, socket: Socket, head: Buffer) {
  try {
    assertAdmin(req);
  } catch (err) {
    abortHandshake(socket, 403);
    return;
  }

  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req);
  });
}

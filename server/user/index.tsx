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
import uuidv4 from 'uuid/v4';

import { renderPage } from 'server/render';
import { abortHandshake, pingClients } from 'server/utils';
import {
  emitter as stateEmitter,
  state as serverState,
  userVotes,
  setState,
  State as ServerState,
} from 'server/state';
import { ClientVote } from 'shared/state';
import { userAuthorized } from 'server/auth';
import LoggedOut from 'server/components/pages/logged-out';
import LoggedIn from 'server/components/pages/logged-in';
import { requirePlayerLogin } from 'server/config';

export const router: Router = Router({
  strict: true,
});

router.get('/', (req, res) => {
  if (userAuthorized(req)) {
    res
      .status(200)
      .send(
        renderPage(
          <LoggedIn
            user={req.session!.user}
            initialState={generateState(serverState)}
          />,
        ),
      );
    return;
  }
  res.status(200).send(renderPage(<LoggedOut />));
});

const wss = new WebSocket.Server({ noServer: true });
pingClients(wss);

function broadcastState(state: Partial<State>): void {
  // Adding a delay here to give priority to the admin & presentation broadcasts.
  setTimeout(() => {
    const message = JSON.stringify({ state });

    for (const client of wss.clients) {
      client.send(message);
    }
  }, 50);
}

stateEmitter.on('change', (oldState, newState) => {
  // We're only interested in votes that are in the voting state:
  const newVote =
    newState.vote && newState.vote.state === 'voting' ? newState.vote : null;
  const oldVote =
    oldState.vote && oldState.vote.state === 'voting' ? oldState.vote : null;
  if (newVote === oldVote) return;
  broadcastState(generateState(newState));
});

const wsToVoterId = new WeakMap<WebSocket, string>();

wss.on('connection', ws => {
  ws.on('message', data => {
    if (typeof data !== 'string') {
      console.error(`Unexpected client data type`);
      return;
    }

    // Voting. Format is v:0 or v:1
    if (data.startsWith('v:')) {
      // If there's no vote, or it isn't in the voting state, exit early
      if (!serverState.vote || serverState.vote.state !== 'voting') return;
      const voterId = wsToVoterId.get(ws)!;
      const index = Number(data.slice(2));
      // Exit early if the value isn't 1 or 0.
      if (index !== 0 && index !== 1) return;
      // Get this user's existing vote
      const userVote = userVotes.get(voterId);
      // If they're voting for the same item, exit early.
      if (userVote === index) return;
      const newVoteCount = serverState.voteCount!.slice();
      // Decrement the thing the user previously voted for
      if (userVote !== undefined) newVoteCount[userVote]--;
      // Increment the thing the user voted for
      newVoteCount[index]++;
      // Record it for this user
      userVotes.set(voterId, index);
      setState({ voteCount: newVoteCount as [number, number] });
    } else {
      console.error(`Unexpected client action`);
    }
  });

  ws.send(JSON.stringify({ state: generateState(serverState) }));
});

export function upgrade(req: Request, socket: Socket, head: Buffer) {
  if (requirePlayerLogin && !req.session!.user) {
    abortHandshake(socket, 403);
    return;
  }

  let voterId: string;

  if (req.session!.user) {
    voterId = req.session!.user.id;
  } else if (req.session!.voterId) {
    voterId = req.session!.voterId;
  } else {
    const id = uuidv4();
    voterId = id;
    req.session!.voterId = id;
  }

  wss.handleUpgrade(req, socket, head, ws => {
    wsToVoterId.set(ws, voterId);
    wss.emit('connection', ws, req);
  });
}

export interface State {
  vote: ClientVote | null;
}

export function generateState(state: ServerState): State {
  const { vote } = state;
  if (!vote || vote.state !== 'voting') return { vote: null };
  return {
    vote: {
      id: vote.id,
      items: vote.items,
    },
  };
}

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
import { STATUS_CODES } from 'http';

import WebSocket, { Server as WebSocketServer } from 'ws';
import { RequestHandler } from 'express';
import { origin } from './config';

export function abortHandshake(
  socket: Socket,
  code: number,
  message: string = STATUS_CODES[code] || 'unknown',
  headers: { [headerName: string]: string } = {},
) {
  if (socket.writable) {
    headers = {
      Connection: 'close',
      'Content-type': 'text/html',
      'Content-Length': Buffer.byteLength(message).toString(),
      ...headers,
    };

    socket.write(
      `HTTP/1.1 ${code} ${STATUS_CODES[code]}\r\n` +
        Object.keys(headers)
          .map(h => `${h}: ${headers[h]}`)
          .join('\r\n') +
        '\r\n\r\n' +
        message,
    );
  }

  socket.destroy();
}

export function pingClients(wss: WebSocketServer) {
  const aliveClients = new WeakSet<WebSocket>();

  wss.on('connection', ws => {
    aliveClients.add(ws);
    ws.on('pong', () => {
      aliveClients.add(ws);
    });
  });

  setInterval(() => {
    for (const client of wss.clients) {
      if (!aliveClients.has(client)) return client.terminate();
      aliveClients.delete(client);
      client.ping();
    }
  }, 30000);
}

export function requireSameOrigin(): RequestHandler {
  return (req, res, next) => {
    const reqOrigin = req.headers['origin'];

    if (reqOrigin !== origin) {
      res.status(403).json({ err: 'Request must be same origin' });
      return;
    }

    next();
  };
}

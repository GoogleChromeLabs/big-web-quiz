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
import { createServer } from 'http';
import { parse as parseURL } from 'url';
import { Socket } from 'net';

import express, { Request, Response } from 'express';
import session from 'express-session';
import fileStoreFactory from 'session-file-store';
import compressedStatic from 'express-static-gzip';

import { cookieSecret, origin, port, cookieDomain } from './config';
import { router as authRouter } from './auth';
import { router as adminRouter, upgrade as adminUpgrade } from './admin';
import { router as userRouter, upgrade as userUpgrade } from './user';
import {
  router as bigScreenRouter,
  upgrade as bigScreenUpgrade,
} from './big-screen';
import { abortHandshake } from './utils';

const app = express();
const FileStore = fileStoreFactory(session);

app.use((req, res, next) => {
  res.set('X-Frame-Options', 'sameorigin');
  next();
});

app.use(
  '/assets/',
  compressedStatic('.data/dist/assets/', {
    enableBrotli: true,
    serveStatic: {
      maxAge: '1y',
      lastModified: false,
    },
  }),
);

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});

const sessionParser = session({
  resave: false,
  saveUninitialized: false,
  secret: cookieSecret,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 365,
    domain: cookieDomain || '',
  },
  store: new FileStore({
    path: `${process.env.STORAGE_ROOT || './.data'}/storage/sessions`,
  }),
});

// A place to ping to keep glitch alive. This is used on the admin page.
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

app.use(sessionParser);

app.use('/auth/', authRouter);
app.use('/admin/', adminRouter);
app.use('/big-screen/', bigScreenRouter);
app.use('/', userRouter);

const server = createServer(app);

server.on('upgrade', (req: Request, socket: Socket, head: Buffer) => {
  sessionParser(req, {} as Response, () => {
    const parsedURL = parseURL(req.url);
    const path = parsedURL.path;
    const reqOrigin = req.headers['origin'];

    if (reqOrigin !== origin) {
      abortHandshake(socket, 403);
      return;
    }

    if (path === '/admin/ws') {
      adminUpgrade(req, socket, head);
      return;
    }
    if (path === '/ws') {
      userUpgrade(req, socket, head);
      return;
    }
    if (path === '/big-screen/ws') {
      bigScreenUpgrade(req, socket, head);
      return;
    }

    abortHandshake(socket, 404);
  });
});

server.listen(port, () => {
  console.log('Your app is listening on port ' + port);
});

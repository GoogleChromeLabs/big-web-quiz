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
import { RequestHandler, Router, Request, urlencoded } from 'express';
import { OAuth2Client } from 'google-auth-library';
import asyncHandler from 'express-async-handler';

import {
  requirePlayerLogin,
  oauthClientId,
  oauthClientSecret,
  origin,
  admins,
  simpleAdminPassword,
  useGoogleLogin,
} from 'server/config';

const createClient = () =>
  new OAuth2Client({
    clientId: oauthClientId,
    clientSecret: oauthClientSecret,
    redirectUri: origin + '/auth/oauth2callback',
  });

/**
 * If login is required, is the user logged in?
 */
export function userAuthorized(req: Request): boolean {
  return !requirePlayerLogin || !!req.session!.user;
}

export function maybeRequireLogin(): RequestHandler {
  return (req, res, next) => {
    if (!requirePlayerLogin || req.session!.user) {
      next();
      return;
    }

    const error = 'Login required';
    res.status(403).send(error);
  };
}

export function assertAdmin(req: Request) {
  if (!useGoogleLogin) {
    if (req.session!.simpleAdminPassword !== simpleAdminPassword) {
      throw Error('Must be logged in.');
    }
    return;
  }

  if (!req.session!.user) {
    throw Error('Must be logged in.');
  } else if (!admins.includes(req.session!.user.email)) {
    throw Error('Admin required.');
  } else if (!req.session!.user.emailVerified) {
    throw Error('Admin email must be verified.');
  }
}

export function requireAdmin(): RequestHandler {
  return (req, res, next) => {
    if (useGoogleLogin) {
      if (!req.session!.user) {
        res.redirect(301, '/auth/login?state=/admin/');
        return;
      }
    } else if (req.session!.simpleAdminPassword !== simpleAdminPassword) {
      res.redirect(301, '/admin/login/');
      return;
    }

    try {
      assertAdmin(req);
    } catch (err) {
      const error = err as Error;
      res.status(403).send(error.message);
      return;
    }
    next();
  };
}

export const router: Router = Router({
  strict: true,
});

router.all('/login', (req, res) => {
  const oauth2Client = createClient();
  const url = oauth2Client.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state: req.query.state || req.get('Referer') || '/',
  });

  res.redirect(301, url);
});

router.post('/logout', (req, res) => {
  req.session!.destroy(() => {
    res.clearCookie('connect.sid', { path: '/' });
    res.redirect(301, '/');
  });
});

router.post('/admin-login', urlencoded({ extended: false }), (req, res) => {
  if (useGoogleLogin) {
    res.status(403).send('Google login required');
    return;
  }

  if (req.body.password !== simpleAdminPassword) {
    res.status(403).send('Incorrect password');
    return;
  }

  req.session!.simpleAdminPassword = req.body.password;
  res.redirect(301, '/admin/');
});

router.get(
  '/oauth2callback',
  asyncHandler(async (req, res) => {
    const oauth2Client = createClient();
    const result = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(result.tokens);
    const verifyResult = await oauth2Client.verifyIdToken({
      idToken: result.tokens.id_token!,
      audience: oauthClientId,
    });
    const loginData = verifyResult.getPayload();

    req.session!.user = {
      email: loginData!.email || '',
      emailVerified: Boolean(loginData!.email_verified),
      name: loginData!.name!,
      id: loginData!.sub,
      picture: (loginData!.picture || '').replace('=s96-c', ''),
    };

    res.redirect(301, req.query.state || '/');
  }),
);

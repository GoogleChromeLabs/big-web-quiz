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

/**
 * Google login is a little harder to set up, but it's more secure,
 * and is required if you want players to log in to vote.
 */
export const useGoogleLogin = false;

/**
 * Do players need to log in to vote?
 * Requiring login makes it harder to vote multiple times for a question.
 * This requires useGoogleLogin to be true, otherwise it's ignored.
 */
export const requirePlayerLogin = false;

/**
 * If you're not using Google login, the admin page is protected by a
 * simple password, set in your env file.
 */
export const simpleAdminPassword = process.env.ADMIN_PASSWORD!;

/**
 * If you're using Google login, add the email addresses of admin users
 * here.
 */
export const admins: string[] = [];

export const port = Number(process.env.PORT) || 8081;

export const origin = (() => {
  if (process.env.ORIGIN) return process.env.ORIGIN;
  if (process.env.PROJECT_DOMAIN) {
    return `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
  }
  return `http://localhost:${port}`;
})();

export const cookieDomain = process.env.COOKIE_DOMAIN || '';

export const cookieSecret: string = process.env.COOKIE_SECRET!;
if (!cookieSecret) throw Error('No cookie secret set');

export const oauthClientId: string = process.env.OAUTH_CLIENT!;
if (useGoogleLogin && !oauthClientId) throw Error('No oauth client set');

export const oauthClientSecret: string = process.env.OAUTH_SECRET!;
if (useGoogleLogin && !oauthClientSecret) throw Error('No oauth secret set');

if (!useGoogleLogin && requirePlayerLogin) {
  throw Error('Google login must be enabled if players are required to log in');
}

if (!useGoogleLogin && !simpleAdminPassword) {
  throw Error('No admin password set');
}

if (useGoogleLogin && admins.length === 0) {
  throw Error('No admins listed');
}

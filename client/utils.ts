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
import { Result, Topic, Topics } from 'shared/state';
import { Champions } from '../shared/state';

/**
 * Returns a random 12 char base64 string
 */
export function generateRandomId(): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(9));
  const binaryString = String.fromCharCode(...randomValues);
  return btoa(binaryString);
}

/**
 * Escape path component in a JSON patch path.
 * @param pathComponent
 */
export function escapePatchPathComponent(pathComponent: string): string {
  // Taken from fast-json-patch, which doesn't tree-shake well.
  if (pathComponent.indexOf('/') === -1 && pathComponent.indexOf('~') === -1) {
    return pathComponent;
  }
  return pathComponent.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Unescapes a JSON patch path
 * @param pathComponent
 */
export function unescapePathComponent(pathComponent: string): string {
  if (!pathComponent.includes('~')) return pathComponent;
  return pathComponent.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * Get value from object using a JSON patch path
 *
 * @param obj
 * @param path
 */
export function getValueByPath(obj: any, path: string): any {
  // Somewhat taken from fast-json-patch, which doesn't tree-shake well.
  if (path === '/') return obj;

  const keys = path.split('/');
  let currentObj = obj;

  for (const key of keys.slice(1)) {
    let calculatedKey: string | number = key;

    if (Array.isArray(obj)) {
      if (calculatedKey === '-') {
        calculatedKey = obj.length;
      } else {
        calculatedKey = Number(calculatedKey);
      }
    } else {
      calculatedKey = unescapePathComponent(calculatedKey);
    }

    currentObj = currentObj[calculatedKey];
  }

  return currentObj;
}

const resultNameCache = new WeakMap<Result, Topic | undefined>();

export function getResultTopic(
  topics: Topics,
  result: Result | string,
): Topic | undefined {
  if (typeof result === 'string') return topics[result];

  if (!resultNameCache.has(result)) {
    if (!result.items[result.winningIndex]) {
      resultNameCache.set(result, undefined);
    } else {
      resultNameCache.set(
        result,
        getResultTopic(topics, result.items[result.winningIndex]),
      );
    }
  }

  return resultNameCache.get(result)!;
}

export function getResultLabel(
  topics: Topics,
  result: Result | string,
): string {
  const topic = getResultTopic(topics, result);
  return topic ? topic.label : '';
}

export function getResultChampionName(
  topics: Topics,
  result: Result | string,
  champions: Champions,
): string {
  const topic = getResultTopic(topics, result);
  return champions[topic?.championId || '']?.name || '';
}

export function keepServerAlive() {
  setInterval(() => {
    fetch('/ping');
  }, 30 * 1000);
}

interface AnimateOptions {
  duration?: number;
  delay?: number;
  easing?: string;
  fill?: 'backwards' | 'none';
}

interface AnimateKeyframe {
  [prop: string]: string;
}

interface AnimateKeyframes {
  [pos: string]: AnimateKeyframe;
}

export function animate(
  el: HTMLElement,
  keyframes: AnimateKeyframes | AnimateKeyframe[],
  {
    duration = 1000,
    delay = 0,
    easing = 'linear',
    fill = 'none',
  }: AnimateOptions = {},
): Promise<void> {
  // We can't use generateRandomId here as it includes invalid chars.
  const animName =
    'a' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
  let computedKeyframes: AnimateKeyframes;

  if (!Array.isArray(keyframes)) {
    computedKeyframes = keyframes;
  } else {
    computedKeyframes = Object.fromEntries(
      keyframes.map((keyframe, i) => [
        (i / keyframes.length) * 100 + '%',
        keyframe,
      ]),
    );
  }

  const style = document.createElement('style');
  style.textContent =
    `@keyframes ${animName} {` +
    Object.entries(computedKeyframes)
      .map(
        ([pos, keyframe]) =>
          pos +
          '{' +
          Object.entries(keyframe)
            .map(([prop, val]) => `${prop}: ${val};`)
            .join('') +
          '}',
      )
      .join('') +
    '}';

  document.head.append(style);
  el.style.animation = `${duration}ms ${easing} ${delay}ms ${fill} ${animName}`;

  return new Promise(resolve => {
    function completeListener(event: AnimationEvent) {
      if (event.target !== el) return;
      resolve();
      el.removeEventListener('animationend', completeListener);
      el.removeEventListener('animationcancel', completeListener);
      style.remove();
    }
    el.addEventListener('animationend', completeListener);
    el.addEventListener('animationcancel', completeListener);
  });
}

function getRGB(color: number): [number, number, number] {
  const mask = 0x0000ff;
  return [color >> 16, (color >> 8) & mask, color & mask];
}

export function getMidColor(color1: number, color2: number): number {
  // Ideally this should be converting to LAB, but meh, don't care.
  const [c1r, c1g, c1b] = getRGB(color1);
  const [c2r, c2g, c2b] = getRGB(color2);
  return (
    (Math.round((c1r + c2r) / 2) << 16) +
    (Math.round((c1g + c2g) / 2) << 8) +
    Math.round((c1b + c2b) / 2)
  );
}

export function getHexColor(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

interface FetchJSONOptions {
  body?: any;
  method?: string;
}

export async function fetchJSON(
  path: RequestInfo,
  { body, method = 'GET' }: FetchJSONOptions = {},
) {
  const response = await fetch(path, {
    body: body ? JSON.stringify(body) : undefined,
    method,
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (data.err) throw Error(data.err);
  return data;
}

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
import { readFileSync, promises as fs } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

import {
  Topics,
  Result,
  Vote,
  PresentationView,
  Champions,
} from 'shared/state';
import { Operation, applyPatch } from 'fast-json-patch';
import produce from 'immer';

export interface State {
  champions: Champions;
  topics: Topics;
  results: Result | null;
  vote: Vote | null;
  voteCount: [number, number] | null;
  bracketZoom: number[][] | null;
  presentationView: PresentationView;
  iframe: string;
}

type StateChangeCallback = (
  oldState: State,
  newState: State,
  changedKeys: Array<keyof State>,
) => void;

interface StateEmitter extends EventEmitter {
  addListener(event: 'change', callback: StateChangeCallback): this;
  emit(event: 'change', ...args: Parameters<StateChangeCallback>): boolean;
  on(event: 'change', callback: StateChangeCallback): this;
  once(event: 'change', callback: StateChangeCallback): this;
  prependListener(event: 'change', callback: StateChangeCallback): this;
  prependOnceListener(event: 'change', callback: StateChangeCallback): this;
  removeListener(event: 'change', callback: StateChangeCallback): this;
}

const statePath = join(
  process.env.STORAGE_ROOT || '.data',
  'storage',
  'state.json',
);
const keysToSave: Array<keyof State> = ['champions', 'topics', 'results'];

export let state: State = {
  champions: {},
  topics: {},
  results: null,
  vote: null,
  voteCount: null,
  bracketZoom: null,
  presentationView: 'url',
  iframe: '',
};

export const userVotes = new Map<string, 0 | 1>();
export const emitter: StateEmitter = new EventEmitter();

{
  let savedDataFile;

  try {
    savedDataFile = JSON.parse(readFileSync(statePath, { encoding: 'utf8' }));
  } catch (err) {}

  if (savedDataFile) {
    state = { ...state, ...savedDataFile };
  }
}

let writeQueue = Promise.resolve();

function saveState(state: State) {
  const saveableState: Partial<State> = {};

  for (const key of keysToSave) {
    // Need to cast to 'any' here as TS isn't smart enough to know key === key.
    saveableState[key] = state[key] as any;
  }

  const data = JSON.stringify(saveableState, null, '  ');

  writeQueue = writeQueue.then(async () => {
    try {
      await fs.writeFile(statePath, data, { encoding: 'utf8' });
    } catch (err) {
      console.error('State saving failed');
    }
  });
}

export function generateBracket(num: number) {
  const topicsCount = num;

  if (topicsCount < 4) {
    console.error('Cannot generate bracket. Must have at least 2 topics.');
    return;
  }

  const results: Result = {
    items: ['', ''],
    winningIndex: -1,
  };
  let remaining = topicsCount - 2;
  let currentLevel: Result[] = [results];

  mainLoop: while (true) {
    const nextLevel = [];

    for (const result of currentLevel) {
      for (const i of [0, 1]) {
        if (remaining === 0) break mainLoop;

        const innerResult: Result = {
          items: ['', ''],
          winningIndex: -1,
        };

        result.items[i] = innerResult;
        nextLevel.push(innerResult);
        remaining--;
      }
    }

    currentLevel = nextLevel;
  }

  // Also remove champions from items.
  // Maybe this should be a different button.
  const newState = produce(state, newState => {
    newState.results = results;

    for (const topic of Object.values(newState.topics)) {
      topic.championId = '';
    }
  });

  setState(newState);
}

export function patchState(patches: Operation[]): void {
  const newState = produce(state, newState => {
    applyPatch(newState, patches);
  });

  setState(newState);
}

export function setState(toMerge: Partial<State>): void {
  const oldState = state;
  state = { ...state, ...toMerge };

  // Do the right thing with additional vote state
  if (oldState.vote && !state.vote) {
    userVotes.clear();
    state.voteCount = null;
  } else if (
    (!oldState.vote && state.vote) ||
    (oldState.vote && state.vote && oldState.vote.id !== state.vote.id)
  ) {
    userVotes.clear();
    state.voteCount = [0, 0];
  }

  const changedKeys = Object.keys(toMerge);

  emitter.emit(
    'change',
    oldState,
    state,
    changedKeys as Array<keyof typeof toMerge>,
  );

  for (const savableKey of keysToSave) {
    if (changedKeys.includes(savableKey)) {
      saveState(state);
      break;
    }
  }
}

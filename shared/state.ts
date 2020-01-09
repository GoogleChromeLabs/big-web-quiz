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
export interface Champion {
  name: string;
  picture: string;
  score: number;
}

export interface Champions {
  [id: string]: Champion;
}

export interface Vote extends ClientVote {
  state: 'staging' | 'introducing' | 'voting' | 'results';
}

export interface VoteItem {
  label: string;
  championId: string;
  colorId: number;
}

export interface ClientVote {
  id: string;
  items: [VoteItem, VoteItem];
}

export interface Topic {
  label: string;
  slidesURL: string;
  championId: string;
  colorId: number;
}

export interface Topics {
  [id: string]: Topic;
}

export interface Result {
  items: [string | Result, string | Result];
  winningIndex: number;
}

export type PresentationView = 'url' | 'champion-scores' | 'bracket';

export const palette = [
  // [top, bottom] gradients as hex colours.
  [0xef5350, 0xb71d1c],
  [0xed407a, 0x890e50],
  [0xab47bc, 0x4b158d],
  [0x673bb7, 0x311b93],

  [0x5d6bc0, 0x1b237e],
  [0x43a5f6, 0x0d48a2],
  [0x2ab5f5, 0x02579b],
  [0x25c6da, 0x02695c],

  [0x29a69b, 0x004e41],
  [0x66bb6a, 0x1a5e20],
  [0x9dcc65, 0x33691f],
  [0xdde776, 0x837819],

  [0xf670fd, 0x93009a],
  [0x8d6e63, 0x3e2723],
  [0xffa726, 0xe65100],
  [0xff7044, 0xbf360c],
];

/**
 * Default iframes to list. In the form { 'label': 'url' }. Eg:
 * { 'Promo': 'https://example.com/promo' }
 */
export const presetIframes = {};

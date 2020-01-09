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
import { h, Component, RenderableProps } from 'preact';

const context = new AudioContext();
const safetyOffset = 0.25;
const loop1BufferP = loadSoundAsAudioBuffer(
  'https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Floop1.mp3?v=1577451600356',
);
const loop1BarLength = (60 / 110) /*BPM*/ * 4;
const loop2BufferP = loadSoundAsAudioBuffer(
  'https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Floop2.mp3?v=1577451600714',
);
const loop2BarLength = (60 / 123) /*BPM*/ * 4;
const stabBufferP = loadSoundAsAudioBuffer(
  'https://cdn.glitch.com/b7996c5b-5a36-4f1b-84db-52a31d101dfc%2Fstab.mp3?v=1577451594952',
);

function wait(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function loadSoundAsAudioBuffer(url: string) {
  const buffer = await fetch(url).then(r => r.arrayBuffer());
  return context.decodeAudioData(buffer);
}

function audioSourceFromBuffer(buffer: AudioBuffer) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}

function nextBarSwitchTime(
  playTime: number,
  loopStart: number,
  loopBarLength: number,
) {
  const loopPlaytime = playTime - loopStart;
  const timeInBar = loopPlaytime % loopBarLength;
  let untilSwitch = loopBarLength - timeInBar;
  if (untilSwitch < safetyOffset) {
    untilSwitch += loopBarLength;
  }

  return untilSwitch + playTime;
}

type LoopStatus = 'stop' | 'play' | 'upgrade';

class BWQAudio {
  private _loop1Source?: AudioBufferSourceNode;
  private _loop2Source?: AudioBufferSourceNode;
  private _loop1Start: number = 0;
  private _loop2Start: number = 0;
  private _loopStatus: LoopStatus = 'stop';

  constructor(
    private _loop1Buffer: AudioBuffer,
    private _loop2Buffer: AudioBuffer,
    private _stabBuffer: AudioBuffer,
  ) {}

  playLoop(): void {
    if (this._loopStatus === 'play') return;

    this._loopStatus = 'play';
    this._loop1Source = audioSourceFromBuffer(this._loop1Buffer);

    // This would only happen if we go from "revealing" back to activate
    if (this._loop2Source) {
      this._loop2Source.stop();
      this._loop2Source = undefined;
    }

    this._loop1Source.connect(context.destination);
    this._loop1Source.loop = true;

    this._loop1Start = context.currentTime + safetyOffset;
    this._loop1Source.start(this._loop1Start);
  }

  async upgradeLoop(): Promise<void> {
    if (this._loopStatus === 'upgrade') return;

    this._loopStatus = 'upgrade';

    this._loop2Source = audioSourceFromBuffer(this._loop2Buffer);
    this._loop2Source.connect(context.destination);
    this._loop2Source.loop = true;

    const switchTime = nextBarSwitchTime(
      context.currentTime,
      this._loop1Start,
      loop1BarLength,
    );

    this._loop2Start = switchTime;

    if (this._loop1Source) {
      this._loop1Source.stop(switchTime);
      this._loop1Source = undefined;
    }

    this._loop2Source.start(switchTime);

    return wait((switchTime - context.currentTime) * 1000);
  }

  async playStab(): Promise<void> {
    if (this._loopStatus === 'stop') {
      return;
    }

    this._loopStatus = 'stop';

    const stabSource = audioSourceFromBuffer(this._stabBuffer);
    stabSource.connect(context.destination);

    let switchTime = context.currentTime;

    if (this._loop2Source) {
      switchTime = nextBarSwitchTime(
        context.currentTime,
        this._loop2Start,
        loop2BarLength,
      );
      this._loop2Source.stop(switchTime);
      this._loop2Source = undefined;
    } else if (this._loop1Source) {
      switchTime = nextBarSwitchTime(
        context.currentTime,
        this._loop1Start,
        loop1BarLength,
      );
      this._loop1Source.stop(switchTime);
    }

    stabSource.start(switchTime);

    return wait((switchTime - context.currentTime) * 1000);
  }

  stopLoops() {
    if (this._loop1Source) {
      this._loop1Source.stop();
      this._loop1Source = undefined;
    }

    if (this._loop2Source) {
      this._loop2Source.stop();
      this._loop2Source = undefined;
    }

    this._loopStatus = 'stop';
  }
}

async function getAudio() {
  return new BWQAudio(
    await loop1BufferP,
    await loop2BufferP,
    await stabBufferP,
  );
}

interface Props {
  state: LoopStatus;
}

export default class Audio extends Component<Props> {
  private _lastState: LoopStatus = 'stop';
  private _lastChildren?: preact.ComponentChildren;
  private _lockedChildren?: preact.ComponentChildren;
  private _audio = getAudio();

  async componentWillUnmount() {
    const audio = await this._audio;
    audio.stopLoops();
  }

  render({ state, children }: RenderableProps<Props>) {
    if (state !== this._lastState) {
      this._lastState = state;
      this._lockedChildren = this._lastChildren;
      this._audio.then(async audio => {
        if (state === 'play') {
          audio.playLoop();
        } else if (state === 'upgrade') {
          await audio.upgradeLoop();
        } else if (state === 'stop') {
          await audio.playStab();
        }

        this._lockedChildren = undefined;
        // Trigger a render
        this.setState({});
      });
    }

    this._lastChildren = children;
    return this._lockedChildren || children;
  }
}

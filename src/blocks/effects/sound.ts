/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Effect } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";
import { browser } from "webextension-polyfill-ts";
import { propertiesToSchema } from "@/validators/generic";

const sprite: { [key: string]: [number, number] } = {
  "alien death": [1000, 2000],
  "boss hit": [3000, 3500],
  escape: [4000, 7200],
  meow: [8000, 8500],
  numkey: [9000, 9100],
  ping: [10000, 11000],
  death: [12000, 16200],
  shot: [17000, 18000],
  squit: [19000, 19300],
};

let _howl: any;

export class SoundEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/audio",
      "Play a sound effect",
      "Play a built-in sound effect",
      "faPlay"
    );
  }

  inputSchema: Schema = propertiesToSchema({
    sound: {
      type: "string",
      description: "The sound effect to play",
      enum: Array.from(Object.keys(sprite)),
      default: "ping",
    },
  });

  async effect({ sound = "ping" }: BlockArg): Promise<void> {
    const { Howl } = await import(
      /* webpackChunkName: "howler" */
      "howler"
    );

    if (!_howl) {
      const url = browser.runtime.getURL("audio/sprite.mp3");
      _howl = new Howl({
        src: [url],
        sprite,
      });
    }

    _howl.play(sound as string);
  }
}

registerBlock(new SoundEffect());

/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { StorageItem } from "webext-storage";

// Stow away the original console, so that we can use it where necessary
export const realConsole = globalThis.console;

let enableRuntimeLogging = false;

const noop = () => {
  /* */
};

export const runtimeLogging = new StorageItem("RUNTIME_LOGGING", {
  defaultValue: enableRuntimeLogging,
});

export async function setRuntimeLogging(config: boolean): Promise<void> {
  await runtimeLogging.set(config);
}

export async function initRuntimeLogging(): Promise<void> {
  enableRuntimeLogging = await runtimeLogging.get();

  globalThis.console = new Proxy(realConsole, {
    get(target: typeof realConsole, prop: string | symbol) {
      // @ts-expect-error -- proxy
      if (!enableRuntimeLogging && typeof target[prop] === "function") {
        return noop;
      }

      // @ts-expect-error -- proxy
      return target[prop];
    },
  });

  runtimeLogging.onChanged((newValue: true) => {
    enableRuntimeLogging = newValue;
  });
}

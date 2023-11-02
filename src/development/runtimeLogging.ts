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

declare global {
  // eslint-disable-next-line no-var -- required for typescript
  var realConsole: typeof console;
  function setRuntimeLogging(config: boolean): void;
}

const alreadyImported = Boolean(globalThis.realConsole);

// Stow away the original console, so that we can use it where necessary
export const realConsole = alreadyImported
  ? globalThis.realConsole
  : { ...globalThis.console };

// Store in memory to avoid re-fetching from storage on every call
let enableRuntimeLogging = false;

const noop = () => {
  /* */
};

const runtimeLogging = new StorageItem("RUNTIME_LOGGING", {
  defaultValue: enableRuntimeLogging,
});

export async function setRuntimeLogging(config: boolean): Promise<void> {
  await runtimeLogging.set(config);
}

// Attach to window to allow developers to enable/disable runtime logging from the console
globalThis.setRuntimeLogging = (config: boolean) => {
  void setRuntimeLogging(config);
};

export async function initRuntimeLogging(): Promise<void> {
  enableRuntimeLogging = await runtimeLogging.get();

  runtimeLogging.onChanged((newValue: boolean) => {
    enableRuntimeLogging = newValue;
  });

  if (!alreadyImported) {
    if (!enableRuntimeLogging) {
      console.debug(
        "PixieBrix: runtime logging is disabled. Enable it with `window.setRuntimeLogging(true)`."
      );
    }

    globalThis.console = new Proxy(globalThis.console, {
      get(target: typeof globalThis.console, prop: string | symbol) {
        // @ts-expect-error -- proxy
        if (!enableRuntimeLogging && typeof target[prop] === "function") {
          return noop;
        }

        // @ts-expect-error -- proxy
        return target[prop];
      },
    });
  }
}

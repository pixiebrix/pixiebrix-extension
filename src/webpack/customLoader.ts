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

/**
 * Custom webpack loader for Firefox because it doesn't support ES6 modules in content scripts.
 *
 * References:
 *   - https://bugzilla.mozilla.org/show_bug.cgi?id=1536094
 *   - https://bugzilla.mozilla.org/show_bug.cgi?id=1451545
 *
 * As an alternative, could use the webpack-target-webextension target:
 *   - https://github.com/crimx/webpack-target-webextension/blob/master/lib/WebExtMainTemplatePlugin.js#L5
 */

import { WEBPACK_INJECT_FILE } from "@/webpack/protocol";

const CHUNK_TIMEOUT_SECONDS = 10;

type PromiseHandlers = [
  (value?: unknown) => void,
  (reason: unknown) => void,
  Promise<unknown>?
];

type ChunkData = 0 | PromiseHandlers;

const installedChunks: { [key: string]: ChunkData } = {
  page: 0,
};

type SuccessResponse = {
  type: typeof WEBPACK_INJECT_FILE;
  payload: { file: string };
  error?: boolean;
};

type ErrorResponse = {
  type: typeof WEBPACK_INJECT_FILE;
  error: true;
  payload: unknown;
};

type InjectResponse = ErrorResponse | SuccessResponse;

__webpack_require__.e = function requireEnsure(chunkId: string) {
  const promises = [];

  // JSONP chunk loading for javascript

  let installedChunkData: ChunkData = installedChunks[chunkId];

  // "0" is the signal for "already loaded"
  if (installedChunkData !== 0) {
    // a Promise means "currently loading".
    if (installedChunkData) {
      promises.push(installedChunkData[2]);
    } else {
      // setup Promise in chunk cache
      const promise = new Promise(function (resolve, reject) {
        installedChunkData = installedChunks[chunkId] = [resolve, reject];
      });
      promises.push((installedChunkData[2] = promise));

      // create error before stack unwound to get useful stacktrace later
      const error = new Error();
      const onScriptComplete = function (event: InjectResponse | undefined) {
        let injectError;
        if (chrome.runtime.lastError) {
          console.error("Error loading chunk", chrome.runtime.lastError);
          injectError = true;
        } else if (event) {
          injectError = event.error;
        } else {
          injectError = true;
        }

        // if type is injected & success set chunk to loaded and resolve promise
        if (!injectError) {
          (installedChunks[chunkId] as PromiseHandlers)[0]();
          installedChunks[chunkId] = 0;
        }
        // avoid mem leaks in IE.
        window.clearTimeout(timeout);
        const chunk = installedChunks[chunkId];
        if (chunk !== 0) {
          if (chunk) {
            const errorType = "load";
            const realSrc = chunkId;
            error.message =
              "Loading chunk " +
              chunkId +
              " failed.\n(" +
              errorType +
              ": " +
              realSrc +
              ")";
            error.name = "ChunkLoadError";
            (error as any).type = errorType;
            (error as any).request = realSrc;
            chunk[1](error);
          }
          installedChunks[chunkId] = undefined;
        }
      };
      const timeout = setTimeout(function () {
        onScriptComplete({
          type: WEBPACK_INJECT_FILE,
          error: true,
          payload: new Error("Chunk load timed out"),
        });
      }, CHUNK_TIMEOUT_SECONDS * 1000);

      // FIXME: need to adapt for CSS chunks?
      const filename = `bundles/${chunkId}.bundle.js`;
      console.debug(`Loading chunk ${chunkId}: ${filename}`);
      chrome.runtime.sendMessage(
        { type: WEBPACK_INJECT_FILE, payload: { file: filename } },
        onScriptComplete
      );
    }
  }
  return Promise.all(promises);
};

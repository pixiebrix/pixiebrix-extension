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

// WARNING: this file MUST NOT directly or transitively import webext-messenger because it does not support being
// imported multiple times in the same contentScript. It's only save to import webext-messenger in contentScriptCore.ts
// which is behind a guarded dynamic import.
import "./contentScript.scss";
import { addContentScriptIndicator } from "@/development/visualInjection";
import { uuidv4 } from "@/types/helpers";
import {
  isInstalledInThisSession,
  setInstalledInThisSession,
  setReadyInThisDocument,
  unsetReadyInThisDocument,
} from "@/contentScript/ready";
import { logPromiseDuration } from "@/utils";
import { onContextInvalidated } from "@/errors/contextInvalidated";

// Track module load so we hear something from content script in the console if Chrome attempted to import the module.
console.debug("contentScript: module load");

// See note in `@/contentScript/ready.ts` for further details about the lifecycle of content scripts
async function initContentScript() {
  const context = top === self ? "" : `in frame ${location.href}`;
  const uuid = uuidv4();

  if (isInstalledInThisSession()) {
    // `webext-dynamic-content-scripts` to 10.0.0-1 can inject the same content script multiple times
    // https://github.com/pixiebrix/pixiebrix-extension/pull/5743
    // Must prevent multiple injection because repeat messenger registration causes message handling errors:
    // https://github.com/pixiebrix/webext-messenger/issues/88
    console.warn(
      `contentScript: was requested twice in the same context, skipping content script initialization ${context}`
    );
    return;
  }

  console.debug(`contentScript: importing ${uuid} ${context}`);

  setInstalledInThisSession();

  // Keeping the import separate ensures that no side effects are run until this point
  const contentScriptPromise = import(
    /* webpackChunkName: "contentScriptCore" */ "./contentScriptCore"
  );

  // "imported" timing includes the parsing of the file, which can take 500-1000ms
  void logPromiseDuration("contentScript: imported", contentScriptPromise);

  const { init } = await contentScriptPromise;
  await logPromiseDuration("contentScript: ready", init());
  setReadyInThisDocument(uuid);

  // eslint-disable-next-line promise/prefer-await-to-then -- It's an unrelated event listener
  void onContextInvalidated().then(() => {
    unsetReadyInThisDocument(uuid);
    console.debug("contentScript: invalidated", uuid);
  });

  if (process.env.ENVIRONMENT === "development") {
    addContentScriptIndicator();
  }
}

if (location.protocol === "https:") {
  // eslint-disable-next-line promise/prefer-await-to-then -- Top-level await isn't available
  void initContentScript().catch((error) => {
    throw new Error("Error initializing contentScript", { cause: error });
  });
} else {
  console.warn("Unsupported protocol", location.protocol);
}

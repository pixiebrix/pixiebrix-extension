/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
// imported multiple times in the same contentScript. It's only safe to import webext-messenger in contentScriptCore.ts
// which is behind a guarded dynamic import.

import "./contentScript.scss";
import { addContentScriptIndicator } from "@/development/visualInjection";
import { uuidv4 } from "@/types/helpers";
import {
  getContentScriptState,
  setContentScriptState,
} from "@/contentScript/ready";
import { onContextInvalidated } from "webext-events";
import { logPromiseDuration } from "@/utils/promiseUtils";
import { initRuntimeLogging } from "@/development/runtimeLogging";
import { type Runtime } from "webextension-polyfill";
import { init as contentScriptInit } from "./contentScriptCore";

// eslint-disable-next-line prefer-destructuring -- process.env substitution
const DEBUG = process.env.DEBUG;

/**
 * Protocol allowlist for running the content script. See manifest.json for content script registration.
 * @since 1.7.36 allow http protocol to support some enterprise development use cases without https tunnel
 * @since 1.7.36 allow about: protocol to support srcdoc iframes
 */
const ALLOWED_PROTOCOLS = [
  "https:",
  "http:",
  // Does not appear in manifest.json, because it corresponds to iframes using srcdoc
  "about:",
];

// Track module load so we hear something from content script in the console if Chrome attempted to import the module.
console.debug("contentScript: module load");
void initRuntimeLogging();

// See note in `@/contentScript/ready.ts` for further details about the lifecycle of content scripts
async function initContentScript() {
  const urlInfo = top === self ? "" : `in frame ${location.href}`;
  const uuid = uuidv4();

  if (getContentScriptState() != null) {
    // Must prevent multiple injection because repeat messenger registration causes message handling errors:
    // https://github.com/pixiebrix/webext-messenger/issues/88
    // Prior to 1.7.31 we had been using `webext-dynamic-content-scripts` which can inject the same content script
    // multiple times: https://github.com/pixiebrix/pixiebrix-extension/pull/5743
    console.warn(
      `contentScript: was requested twice in the same context, skipping content script initialization ${urlInfo}`,
    );
    return;
  }

  // Do not use the Messenger, it cannot appear in this bundle
  const context = (await browser.runtime.sendMessage({ type: "WHO_AM_I" })) as
    | Runtime.MessageSender
    | undefined;
  if (!context) {
    console.error(
      "contentScript: nobody answered the WHO_AM_I context check. Loading might fail later.",
    );
  } else if (!("tab" in context)) {
    console.warn("contentScript: not available in tabless iframes", {
      context,
    });
    return;
  }

  console.debug(`contentScript: importing ${uuid} ${urlInfo}`);

  setContentScriptState("installed");

  await logPromiseDuration("contentScript: ready", contentScriptInit());
  setContentScriptState("ready");

  onContextInvalidated.addListener(() => {
    console.debug("contentScript: invalidated", uuid);
  });

  if (process.env.ENVIRONMENT === "development") {
    addContentScriptIndicator();
  }
}

// Support running in secure pages and about: pages, which are used by srcdoc frames
// Note: Due to our permissive settings for content script running in frames, there
// are cases where this can execute in a frame within an invalid parent context/protocol.
if (ALLOWED_PROTOCOLS.includes(location.protocol) || DEBUG) {
  // eslint-disable-next-line promise/prefer-await-to-then -- top-level await isn't available
  void initContentScript().catch((error) => {
    throw new Error("Error initializing contentScript", { cause: error });
  });
} else {
  console.warn("Unsupported protocol", location.protocol);
}

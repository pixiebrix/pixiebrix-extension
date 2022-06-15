/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import "./contentScript.scss";
import { uuidv4 } from "@/types/helpers";

const PIXIEBRIX_CONTENT_SCRIPT_NONCE = "data-pb-nonce";
const PIXIEBRIX_SYMBOL = Symbol.for("pixiebrix-content-script");
const uuid = uuidv4();
// Should set attribute as early as possible
document.documentElement.setAttribute(PIXIEBRIX_CONTENT_SCRIPT_NONCE, uuid);

const start = Date.now();
// Importing for the side effects. Should import as early as possible
import "@/extensionContext";
import { uncaughtErrorHandlers } from "@/telemetry/reportUncaughtErrors";

// Normal imports
// eslint-disable-next-line import/no-restricted-paths -- Legacy code, needs https://github.com/pixiebrix/webext-messenger/issues/6
import registerExternalMessenger from "@/background/messenger/external/registration";
import registerMessenger from "@/contentScript/messenger/registration";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import { handleNavigate } from "@/contentScript/lifecycle";
import { markReady, updateTabInfo } from "@/contentScript/context";
import { whoAmI, initTelemetry } from "@/background/messenger/api";
import { ENSURE_CONTENT_SCRIPT_READY } from "@/messaging/constants";
// eslint-disable-next-line import/no-restricted-paths -- Custom devTools mechanism to transfer data
import { addListenerForUpdateSelectedElement } from "@/pageEditor/getSelectedElement";
import { initToaster } from "@/utils/notify";
import { isConnectionError } from "@/errors/errorHelpers";
import { showConnectionLost } from "@/contentScript/connection";

registerMessenger();
registerExternalMessenger();
registerBuiltinBlocks();
registerContribBlocks();

function ignoreConnectionErrors(
  errorEvent: ErrorEvent | PromiseRejectionEvent
): void {
  if (isConnectionError(errorEvent)) {
    showConnectionLost();
    errorEvent.preventDefault();
  }
}

// Must come before the default handler for ignoring errors. Otherwise, this handler might not be run
uncaughtErrorHandlers.unshift(ignoreConnectionErrors);

declare global {
  interface Window {
    [PIXIEBRIX_SYMBOL]?: string;
  }
}

async function init(): Promise<void> {
  addListenerForUpdateSelectedElement();
  initTelemetry();
  initToaster();

  const sender = await whoAmI();

  updateTabInfo({ tabId: sender.tab.id, frameId: sender.frameId });
  console.debug(
    `Loading contentScript for tabId=${sender.tab.id}, frameId=${sender.frameId}: ${uuid}`
  );

  try {
    await handleNavigate();
  } catch (error) {
    console.error("Error initializing contentScript", error);
    throw error;
  }

  // Inform the external website
  markReady();

  // Inform `ensureContentScript`
  void browser.runtime.sendMessage({ type: ENSURE_CONTENT_SCRIPT_READY });

  console.info(`contentScript ready in ${Date.now() - start}ms`);
}

// Make sure we don't install the content script multiple times. Using just the window may not be reliable because
// the content script might be running in a different VM.
// See discussion at https://github.com/pixiebrix/pixiebrix-extension/issues/3510
// eslint-disable-next-line security/detect-object-injection -- using PIXIEBRIX_SYMBOL
const existingSymbol: string = window[PIXIEBRIX_SYMBOL];
const existingAttribute = document.documentElement.getAttribute(
  PIXIEBRIX_CONTENT_SCRIPT_NONCE
);
if (existingSymbol) {
  console.debug(
    `PixieBrix contentScript already installed (JS): ${existingSymbol}`
  );
  // eslint-disable-next-line no-negated-condition -- for consistency
} else if (existingAttribute !== uuid) {
  console.debug(
    `PixieBrix contentScript already installed (DOM): ${existingAttribute}`
  );
} else {
  // eslint-disable-next-line security/detect-object-injection -- using PIXIEBRIX_SYMBOL
  window[PIXIEBRIX_SYMBOL] = uuid;
  void init();
}

/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { uuidv4 } from "@/types/helpers";

const start = Date.now();

import "@/extensionContext";
import addErrorListeners from "@/contentScript/errors";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import "@/contentScript/devTools";
import "@/contentScript/contextMenus";
import "@/contentScript/browserAction";
import addContentScriptListener from "@/contentScript/backgroundProtocol";
import { handleNavigate } from "@/contentScript/lifecycle";
import addExecutorListener, { notifyReady } from "@/contentScript/executor";
import "@/messaging/external";
import "@/contentScript/script";
import "@/vendors/notify";
import { updateTabInfo } from "@/contentScript/context";
import { initTelemetry } from "@/telemetry/events";
import "@/contentScript/uipath";
import { whoAmI } from "@/background/messenger/api";

const PIXIEBRIX_SYMBOL = Symbol.for("pixiebrix-content-script");
const uuid = uuidv4();

registerBuiltinBlocks();
registerContribBlocks();

declare global {
  interface Window {
    [PIXIEBRIX_SYMBOL]?: string;
  }
}

async function init(): Promise<void> {
  // Add error listeners first so they can catch any initialization errors
  addErrorListeners();

  addContentScriptListener();
  addExecutorListener();
  initTelemetry();

  const sender = await whoAmI();

  updateTabInfo({ tabId: sender.tab.id, frameId: sender.frameId });
  console.debug(
    `Loading contentScript for tabId=${sender.tab.id}, frameId=${sender.frameId}: ${uuid}`
  );

  try {
    await handleNavigate();
  } catch (error: unknown) {
    console.error("Error initializing contentScript", error);
    throw error;
  }

  try {
    // Notify the background script know we're ready to execute remote actions
    await notifyReady();
    console.info(`contentScript ready in ${Date.now() - start}ms`);
  } catch (error: unknown) {
    console.error("Error pinging the background script", error);
    throw error;
  }
}

// Make sure we don't install the content script multiple times
// eslint-disable-next-line security/detect-object-injection -- using PIXIEBRIX_SYMBOL
const existing: string = window[PIXIEBRIX_SYMBOL];
if (existing) {
  console.debug(`PixieBrix contentScript already installed: ${existing}`);
} else {
  // eslint-disable-next-line security/detect-object-injection -- using PIXIEBRIX_SYMBOL
  window[PIXIEBRIX_SYMBOL] = uuid;
  void init();
}

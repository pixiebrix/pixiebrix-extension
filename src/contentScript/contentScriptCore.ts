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

import "@/extensionContext";

// Normal imports
// eslint-disable-next-line import/no-restricted-paths -- Legacy code, needs https://github.com/pixiebrix/webext-messenger/issues/6
import registerExternalMessenger from "@/background/messenger/external/registration";
import registerMessenger from "@/contentScript/messenger/registration";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import { handleNavigate } from "@/contentScript/lifecycle";
import { updateTabInfo } from "@/contentScript/context";
import { whoAmI, initTelemetry } from "@/background/messenger/api";
import { ENSURE_CONTENT_SCRIPT_READY } from "@/messaging/constants";
// eslint-disable-next-line import/no-restricted-paths -- Custom devTools mechanism to transfer data
import { addListenerForUpdateSelectedElement } from "@/pageEditor/getSelectedElement";
import { initToaster } from "@/utils/notify";
import { initPartnerIntegrations } from "@/contentScript/partnerIntegrations";
import { UUID } from "@/core";
import { isConnectionError } from "@/errors/errorHelpers";
import { showConnectionLost } from "./connection";
import { uncaughtErrorHandlers } from "@/telemetry/reportUncaughtErrors";
import { PIXIEBRIX_READY_ATTRIBUTE } from "@/common";

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

export async function init(uuid: UUID): Promise<void> {
  registerMessenger();
  registerExternalMessenger();
  registerBuiltinBlocks();
  registerContribBlocks();

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

  // Mark the document as ready
  document.documentElement.setAttribute(PIXIEBRIX_READY_ATTRIBUTE, "");

  // Inform `ensureContentScript`
  void browser.runtime.sendMessage({ type: ENSURE_CONTENT_SCRIPT_READY });

  // Let the partner page know
  initPartnerIntegrations();
}

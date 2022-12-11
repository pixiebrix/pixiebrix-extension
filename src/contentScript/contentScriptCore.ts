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
import registerExternalMessenger from "@/background/messenger/external/registration";
import registerMessenger from "@/contentScript/messenger/registration";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import { handleNavigate } from "@/contentScript/lifecycle";
import { initTelemetry } from "@/background/messenger/api";
import { ENSURE_CONTENT_SCRIPT_READY } from "@/messaging/constants";
// eslint-disable-next-line import/no-restricted-paths -- Custom devTools mechanism to transfer data
import { addListenerForUpdateSelectedElement } from "@/pageEditor/getSelectedElement";
import { initToaster } from "@/utils/notify";
import { initPartnerIntegrations } from "@/contentScript/partnerIntegrations";
import {
  isContextInvalidatedError,
  notifyContextInvalidated,
} from "@/errors/contextInvalidated";
import { onUncaughtError } from "@/errors/errorHelpers";
import { type UUID } from "@/core";
import initSandbox from "@/sandbox/messenger/api";

// Must come before the default handler for ignoring errors. Otherwise, this handler might not be run
onUncaughtError((error) => {
  // Rather than a global `onContextInvalidated` listener, we want to notify the user only when
  // they're actually interacting with PixieBrix, otherwise they might receive the notification
  // at random times.
  if (isContextInvalidatedError(error)) {
    void notifyContextInvalidated();
  }
});

export async function init(uuid: UUID): Promise<void> {
  registerMessenger();
  registerExternalMessenger();
  registerBuiltinBlocks();
  registerContribBlocks();

  addListenerForUpdateSelectedElement();
  initTelemetry();
  initToaster();
  initSandbox();

  await handleNavigate();

  // Inform `ensureContentScript`
  void browser.runtime.sendMessage({ type: ENSURE_CONTENT_SCRIPT_READY });

  // Let the partner page know
  initPartnerIntegrations();
}

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

import "./contentScript.scss";

import "@/extensionContext";

// Normal imports
import { initMessengerLogging } from "@/development/messengerLogging";
import registerExternalMessenger from "@/background/messenger/external/registration";
import registerMessenger from "@/contentScript/messenger/registration";
import registerBuiltinBlocks from "@/bricks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import brickRegistry from "@/bricks/registry";
import { handleNavigate, initNavigation } from "@/contentScript/lifecycle";
import { initTelemetry } from "@/background/messenger/api";
import { ENSURE_CONTENT_SCRIPT_READY } from "@/contentScript/ready";
import { initToaster } from "@/utils/notify";
import { initPartnerIntegrations } from "@/contentScript/partnerIntegrations";
import {
  isContextInvalidatedError,
  notifyContextInvalidated,
} from "@/errors/contextInvalidated";
import { onUncaughtError } from "@/errors/errorHelpers";
import initFloatingActions from "@/components/floatingActions/initFloatingActions";
import { initSidebarActivation } from "@/contentScript/sidebarActivation";
import { initPerformanceMonitoring } from "@/contentScript/performanceMonitoring";
import { initRuntime } from "@/runtime/reducePipeline";

// Must come before the default handler for ignoring errors. Otherwise, this handler might not be run
onUncaughtError((error) => {
  // Rather than a global `onContextInvalidated` listener, we want to notify the user only when
  // they're actually interacting with PixieBrix, otherwise they might receive the notification
  // at random times.
  if (isContextInvalidatedError(error)) {
    void notifyContextInvalidated();
  }
});

export async function init(): Promise<void> {
  console.debug(`contentScriptCore: init, location: ${location.href}`);

  void initMessengerLogging();
  registerMessenger();
  registerExternalMessenger();
  registerBuiltinBlocks();
  registerContribBlocks();
  // Since 1.8.2, the brick registry was de-coupled from the runtime to avoid circular dependencies
  initRuntime(brickRegistry);

  initTelemetry();
  initToaster();

  await handleNavigate();
  initNavigation();

  void initSidebarActivation();

  // Inform `ensureContentScript`
  void browser.runtime.sendMessage({ type: ENSURE_CONTENT_SCRIPT_READY });

  // Let the partner page know
  initPartnerIntegrations();
  void initFloatingActions();

  void initPerformanceMonitoring();
}

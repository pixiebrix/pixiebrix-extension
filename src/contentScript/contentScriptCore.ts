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

import "./contentScript.scss";

import "@/extensionContext";

// Normal imports
import { initMessengerLogging } from "@/development/messengerLogging";
import registerExternalMessenger from "@/background/messenger/external/registration";
import registerMessenger from "@/contentScript/messenger/registration";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import registerContribBricks from "@/contrib/registerContribBricks";
import brickRegistry from "@/bricks/registry";
import { initNavigation } from "@/contentScript/lifecycle";
import { initTelemetry } from "@/background/messenger/api";
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
import { setPlatform } from "@/platform/platformContext";
import { markDocumentAsFocusableByUser } from "@/utils/focusTracker";
import contentScriptPlatform from "@/contentScript/contentScriptPlatform";
import axios from "axios";
import { initDeferredLoginController } from "@/contentScript/integrations/deferredLoginController";
import { debounce } from "lodash";
import { flagOn } from "@/auth/featureFlagStorage";

const SANDBOX_SRCDOC_HACK_FLAG = "iframe-srcdoc-sandbox-hack";

setPlatform(contentScriptPlatform);

// XXX: ideally would enforce via webpack config or eslint. Enforcing via transformRequest requires importing
// axios in the content script bundle even though it should never be called. Could we somehow conditionally import
// checking for process.env.DEBUG?
axios.defaults.transformRequest = () => {
  // The content Script is subject to the CSP of the page, so PixieBrix should call from background script instead
  throw new Error(
    "API calls from the content script are not allowed. Use the background messenger API/worker instead.",
  );
};

// Must come before the default handler for ignoring errors. Otherwise, this handler might not be run
onUncaughtError((error) => {
  // Rather than a global `onContextInvalidated` listener, we want to notify the user only when
  // they're actually interacting with PixieBrix, otherwise they might receive the notification
  // at random times.
  if (isContextInvalidatedError(error)) {
    void notifyContextInvalidated();
  }
});

/**
 * There is a bug introduced in chromium that prevents the content script from getting injected into
 * iframes with both the `srcdoc` and `sandbox` attributes. This function reloads affected iframes after removing the
 * `sandbox` attribute to force content script injection.
 *
 * See https://issues.chromium.org/issues/355256366
 */
const ensureSandboxedSrcdocIframeInjection = async () => {
  const isSandboxSrcdocHackEnabled = await flagOn(SANDBOX_SRCDOC_HACK_FLAG);
  if (!isSandboxSrcdocHackEnabled) {
    return;
  }

  const applyFixToIframes = () => {
    // Use the faster querySelector first to check if there are any iframes that need fixing
    if (!document.querySelector("iframe[srcdoc][sandbox]")) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- selecting iframes with srcdoc and sandbox messes up type inference for iframe elements
    const iframes = document.querySelectorAll(
      "iframe[srcdoc][sandbox]",
    ) as NodeListOf<HTMLIFrameElement>;
    if (iframes.length > 0) {
      for (const iframe of iframes) {
        iframe.removeAttribute("sandbox");
        // eslint-disable-next-line no-self-assign -- force the iframe to reload
        iframe.srcdoc = iframe.srcdoc;
      }
    }
  };

  const domObserver = new MutationObserver(
    debounce(applyFixToIframes, 800, {
      leading: true,
      maxWait: 1600,
    }),
  );

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

export async function init(): Promise<void> {
  console.debug(`contentScriptCore: init, location: ${location.href}`);

  void initMessengerLogging();
  registerMessenger();
  registerExternalMessenger();
  registerBuiltinBricks();
  registerContribBricks();
  markDocumentAsFocusableByUser();
  // Since 1.8.2, the brick registry was de-coupled from the runtime to avoid circular dependencies
  // Since 1.8.10, we inject the platform into the runtime
  initRuntime(brickRegistry);
  initDeferredLoginController();
  void ensureSandboxedSrcdocIframeInjection();

  initTelemetry();
  initToaster();

  void initNavigation();

  void initSidebarActivation();

  // Let the partner page know
  initPartnerIntegrations();
  void initFloatingActions();

  void initPerformanceMonitoring();
}

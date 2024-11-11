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

// Keep in order so precedence is preserved
import "@/vendors/theme/app/app.scss";
import "@/utils/global.scss";
import "@/utils/layout.scss";
import "./sidebar.scss";

import "@/extensionContext";
import "@/development/darkMode.js";

import { initMessengerLogging } from "@/development/messengerLogging";
import registerMessenger from "@/sidebar/messenger/registration";
import App from "@/sidebar/SidebarApp";
import ReactDOM from "react-dom";
import React, { StrictMode } from "react";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import registerContribBricks from "@/contrib/registerContribBricks";
import { initToaster } from "@/utils/notify";
import { initRuntimeLogging } from "@/development/runtimeLogging";
import { initCopilotMessenger } from "@/contrib/automationanywhere/aaFrameProtocol";
import { initPerformanceMonitoring } from "@/telemetry/performance";
import {
  getConnectedTarget,
  getConnectedTargetUrl,
} from "@/sidebar/connectedTarget";
import { sidebarWasLoaded } from "@/contentScript/messenger/api";
import { markDocumentAsFocusableByUser } from "@/utils/focusTracker";
import { setPlatform } from "@/platform/platformContext";
import extensionPagePlatform from "@/extensionPages/extensionPagePlatform";
import { isMicrosoftEdge } from "@/utils/browserUtils";
import openAllLinksInPopups from "@/utils/openAllLinksInPopups";
import { FeatureFlags } from "@/auth/featureFlags";
// eslint-disable-next-line no-restricted-imports -- tsx file for the ReactDOM.render
import { flagOn } from "@/auth/featureFlagStorage";
import { isPixieBrixDomain } from "@/utils/urlUtils";
import { CONNECTED_TAB_URL_PERFORMANCE_KEY } from "@/sidebar/telemetryConstants";

/**
 * Return performance init arguments, including session replay sample rate for the sidebar session.
 */
async function getInitPerformanceValues() {
  const [forceRecord, url] = await Promise.all([
    flagOn(FeatureFlags.ONBOARDING_SIDEBAR_FORCE_SESSION_REPLAY),
    getConnectedTargetUrl(),
  ]);

  return {
    // Force replay recording on pixiebrix domains. Activate anywhere with nextUrl might put the user back
    // onto a non-welcome page landing page.
    sessionReplaySampleRate:
      forceRecord && isPixieBrixDomain(url) ? 100 : undefined,
    additionalGlobalContext: {
      [CONNECTED_TAB_URL_PERFORMANCE_KEY]: url,
    },
  };
}

async function init(): Promise<void> {
  setPlatform(extensionPagePlatform);
  void initMessengerLogging();
  void initRuntimeLogging();

  try {
    await initPerformanceMonitoring(await getInitPerformanceValues());
  } catch (error) {
    console.error("Failed to initialize performance monitoring", error);
  }

  registerMessenger();
  registerContribBricks();
  registerBuiltinBricks();
  initToaster();

  ReactDOM.render(
    <StrictMode>
      <App />
    </StrictMode>,
    document.querySelector("#container"),
  );

  // XXX: Do we really want to delay the `init`? Maybe this should be last or use `getConnectedTarget().then`
  sidebarWasLoaded(await getConnectedTarget());

  markDocumentAsFocusableByUser();

  // Handle an embedded AA business copilot frame
  void initCopilotMessenger();

  // Edge crashes on plain target=_blank links
  // https://github.com/pixiebrix/pixiebrix-extension/pull/7832
  if (isMicrosoftEdge()) {
    openAllLinksInPopups();
  }
}

void init();

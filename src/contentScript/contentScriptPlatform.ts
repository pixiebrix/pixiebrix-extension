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

import { PlatformABC } from "@/platform/platformProtocol";
import { showNotification } from "@/utils/notify";
import { setToolbarBadge } from "@/background/messenger/strict/api";
import { getState, setState } from "@/platform/state/stateController";
import quickBarRegistry, {
  type QuickBarRegistryProtocol,
} from "@/components/quickBar/quickBarRegistry";
import { expectContext } from "@/utils/expectContext";
import type { PlatformCapability } from "@/platform/capabilities";
import { getReferenceForElement } from "@/contentScript/elementReference";
import { performConfiguredRequestInBackground } from "@/background/messenger/api";
import { ephemeralForm } from "@/contentScript/ephemeralForm";
import { ephemeralPanel } from "@/contentScript/ephemeralPanel";
import type { ElementReference } from "@/types/runtimeTypes";

/**
 * @file Platform definition for mods running in a content script
 * @see PlatformProtocol
 */

async function playSound(sound: string): Promise<void> {
  const audio = new Audio(browser.runtime.getURL(`audio/${sound}.mp3`));
  // NOTE: this does not wait for the sound effect to complete
  await audio.play();
}

async function userSelectElementRefs(): Promise<ElementReference[]> {
  // The picker uses `bootstrap-switch-button`, which does a `window` check on load and breaks
  // the MV3 background worker. Lazy-loading it keeps the background worker from breaking.
  const { userSelectElement } = await import(
    /* webpackChunkName: "editorContentScript" */ "@/contentScript/pageEditor/elementPicker"
  );

  const { elements } = await userSelectElement();

  return elements.map((element) => getReferenceForElement(element));
}

class ContentScriptPlatform extends PlatformABC {
  override capabilities: PlatformCapability[] = [
    "dom",
    "contentScript",
    "alert",
    "toast",
    "sandbox",
    "form",
    "clipboardWrite",
    "audio",
    "state",
    "quickBar",
    "http",
  ];

  // Running unbound window methods throws Invocation Error
  override alert = window.alert.bind(window);
  override prompt = window.prompt.bind(window);

  override notify = showNotification;

  override setBadgeText = setToolbarBadge;

  override playSound = playSound;

  override userSelectElementRefs = userSelectElementRefs;

  // Perform requests via the background so 1/ the host pages CSP doesn't conflict, and 2/ credentials aren't
  // passed to the content script
  override request = performConfiguredRequestInBackground;

  override form = ephemeralForm;

  override panel = ephemeralPanel;

  override get state() {
    // Double-check already in contentScript because the calls don't go through the messenger
    expectContext("contentScript");

    return {
      getState,
      setState,
    };
  }

  override get quickBarRegistry(): QuickBarRegistryProtocol {
    return quickBarRegistry;
  }
}

/**
 * Platform for web extensions running in the content script.
 */
const contentScriptPlatform = new ContentScriptPlatform();
export default contentScriptPlatform;

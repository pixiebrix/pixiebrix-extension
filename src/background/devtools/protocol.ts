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

import { browser, Runtime } from "webextension-polyfill-ts";
import * as contentScriptProtocol from "@/contentScript/devTools";
import { Framework, FrameworkMeta } from "@/messaging/constants";
import type { SelectMode } from "@/nativeEditor/selector";
import { PanelSelectionResult } from "@/nativeEditor/insertPanel";
import { Availability } from "@/blocks/types";
import { ReaderTypeConfig } from "@/blocks/readers/factory";
import {
  liftBackground,
  registerPort as internalRegisterPort,
} from "@/background/devtools/internal";
import { ensureContentScript } from "@/background/util";
import { isEmpty } from "lodash";
import type { Target } from "@/types";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import { RegistryId, UUID } from "@/core";
import {
  removeActionPanel,
  showActionPanel,
} from "@/contentScript/messenger/api";
import * as contentScript from "@/contentScript/messenger/api";

export const registerPort = liftBackground(
  "REGISTER_PORT",
  (target: Target, port: Runtime.Port) => async () => {
    internalRegisterPort(target.tabId, port);
  }
);

export const checkTargetPermissions = liftBackground(
  "CHECK_TARGET_PERMISSIONS",
  (target: Target) => async () => {
    try {
      await browser.tabs.executeScript(target.tabId, {
        code: "true",
        frameId: target.frameId,
      });
      return true;
    } catch {
      return false;
    }
  }
);

export const ensureScript = liftBackground(
  "INJECT_SCRIPT",
  (target: Target) => async () => ensureContentScript(target)
);

export const readSelectedElement = liftBackground(
  "READ_ELEMENT",
  (target: Target) => async () => contentScript.readSelected(target)
);

export const detectFrameworks: (
  port: Runtime.Port
) => Promise<FrameworkMeta[]> = liftBackground(
  "DETECT_FRAMEWORKS",
  (target: Target) => async () => contentScript.detectFrameworks(target, null)
);

export const cancelSelectElement = liftBackground(
  "CANCEL_SELECT_ELEMENT",
  (target: Target) => async () => contentScript.cancelSelect(target)
);

export const selectElement = liftBackground(
  "SELECT_ELEMENT",
  (target: Target) => async ({
    mode = "element",
    framework,
    traverseUp = 0,
    root,
  }: {
    framework?: Framework;
    mode: SelectMode;
    traverseUp?: number;
    root?: string;
  }) => {
    const element = await contentScript.selectElement(target, {
      framework,
      mode,
      traverseUp,
      root,
    });

    if (isEmpty(element)) {
      throw new Error("selectElement returned an empty element");
    }

    return element;
  }
);

export const insertButton = liftBackground(
  "INSERT_BUTTON",
  (target: Target) => async () => contentScript.insertButton(target)
);

export const insertPanel: (
  port: Runtime.Port
) => Promise<PanelSelectionResult> = liftBackground(
  "INSERT_PANEL",
  (target: Target) => async () => contentScript.insertPanel(target)
);

export const showBrowserActionPanel = liftBackground(
  "SHOW_BROWSER_ACTION_PANEL",
  (target: Target) => async () => showActionPanel(target)
);

export const updateDynamicElement = liftBackground(
  "UPDATE_DYNAMIC_ELEMENT",
  (target: Target) => async (element: DynamicDefinition) =>
    contentScript.updateDynamicElement(target, element)
);

export const clearDynamicElements = liftBackground(
  "CLEAR_DYNAMIC",
  (target: Target) => async ({ uuid }: { uuid?: UUID }) =>
    contentScript.clearDynamicElements(target, { uuid })
);

export const enableDataOverlay = liftBackground(
  "ENABLE_ELEMENT",
  (target: Target) => async (uuid: UUID) =>
    contentScript.enableOverlay(target, `[data-uuid="${uuid}"]`)
);

export const enableSelectorOverlay = liftBackground(
  "ENABLE_SELECTOR",
  (target: Target) => async (selector: string) =>
    contentScript.enableOverlay(target, selector)
);

export const disableOverlay = liftBackground(
  "DISABLE_ELEMENT",
  (target: Target) => async () => contentScript.disableOverlay(target)
);

export const getInstalledExtensionPointIds = liftBackground(
  "INSTALLED_EXTENSION_POINT_IDS",
  (target: Target) => async () =>
    contentScript.getInstalledExtensionPointIds(target)
);

export const checkAvailable = liftBackground(
  "CHECK_AVAILABLE",
  (target: Target) => async (availability: Availability) =>
    contentScript.checkAvailable(target, availability)
);

export const searchWindow: (
  port: Runtime.Port,
  query: string
) => Promise<{ results: unknown[] }> = liftBackground(
  "SEARCH_WINDOW",
  (target: Target) => async (query: string) =>
    contentScript.searchWindow(target, query)
);

export const runBlock = liftBackground(
  "RUN_BLOCK",
  (target: Target) => async (args: contentScriptProtocol.RunBlockArgs) =>
    contentScript.runBlock(target, args)
);

export const runReaderBlock = liftBackground(
  "RUN_READER_BLOCK",
  (target: Target) => async ({
    id,
    rootSelector,
  }: {
    id: RegistryId;
    rootSelector?: string;
  }) =>
    contentScript.runReaderBlock(target, {
      id,
      rootSelector,
    })
);

export const runReader = liftBackground(
  "RUN_READER",
  (target: Target) => async ({
    config,
    rootSelector,
  }: {
    config: ReaderTypeConfig;
    rootSelector?: string;
  }) =>
    contentScript.runReader(target, {
      config,
      rootSelector,
    })
);

export const uninstallActionPanelPanel = liftBackground(
  "UNINSTALL_ACTION_PANEL_PANEL",
  (target) => async ({ extensionId }: { extensionId: UUID }) =>
    removeActionPanel(target, extensionId)
);

export const initUiPathRobot = liftBackground(
  "UIPATH_INIT",
  (target: Target) => async () => contentScript.initRobot(target)
);

export const getUiPathProcesses = liftBackground(
  "UIPATH_GET_PROCESSES",
  (target: Target) => async () => contentScript.getProcesses(target)
);

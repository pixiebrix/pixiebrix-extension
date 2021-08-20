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
import * as robotProtocol from "@/contentScript/uipath";
import { Framework, FrameworkMeta } from "@/messaging/constants";
import * as nativeSelectionProtocol from "@/nativeEditor/selector";
import * as nativeEditorProtocol from "@/nativeEditor";
import { PanelSelectionResult } from "@/nativeEditor/insertPanel";
import * as browserActionProtocol from "@/contentScript/browserAction";
import { Availability } from "@/blocks/types";
import { ReaderTypeConfig } from "@/blocks/readers/factory";
import {
  liftBackground,
  registerPort as internalRegisterPort,
} from "@/background/devtools/internal";
import { ensureContentScript } from "@/background/util";
import { isEmpty } from "lodash";
import * as contextMenuProtocol from "@/background/contextMenus";
import { Target } from "@/background/devtools/contract";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import { RegistryId, UUID } from "@/core";

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
  (target: Target) => async () => contentScriptProtocol.readSelected(target)
);

export const detectFrameworks: (
  port: Runtime.Port
) => Promise<FrameworkMeta[]> = liftBackground(
  "DETECT_FRAMEWORKS",
  (target: Target) => async () =>
    contentScriptProtocol.detectFrameworks(target) as Promise<FrameworkMeta[]>
);

export const cancelSelectElement = liftBackground(
  "CANCEL_SELECT_ELEMENT",
  (target: Target) => async () => nativeSelectionProtocol.cancelSelect(target)
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
    mode: nativeSelectionProtocol.SelectMode;
    traverseUp?: number;
    root?: string;
  }) => {
    const element = await nativeSelectionProtocol.selectElement(target, {
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
  (target: Target) => async () => nativeEditorProtocol.insertButton(target)
);

export const insertPanel: (
  port: Runtime.Port
) => Promise<PanelSelectionResult> = liftBackground(
  "INSERT_PANEL",
  (target: Target) => async () => nativeEditorProtocol.insertPanel(target)
);

export const showBrowserActionPanel = liftBackground(
  "SHOW_BROWSER_ACTION_PANEL",
  (target: Target) => async () => browserActionProtocol.showActionPanel(target)
);

export const updateDynamicElement = liftBackground(
  "UPDATE_DYNAMIC_ELEMENT",
  (target: Target) => async (element: DynamicDefinition) =>
    nativeEditorProtocol.updateDynamicElement(target, element)
);

export const clearDynamicElements = liftBackground(
  "CLEAR_DYNAMIC",
  (target: Target) => async ({ uuid }: { uuid?: UUID }) =>
    nativeEditorProtocol.clear(target, { uuid })
);

export const enableDataOverlay = liftBackground(
  "ENABLE_ELEMENT",
  (target: Target) => async (uuid: UUID) =>
    nativeEditorProtocol.enableOverlay(target, `[data-uuid="${uuid}"]`)
);

export const enableSelectorOverlay = liftBackground(
  "ENABLE_SELECTOR",
  (target: Target) => async (selector: string) =>
    nativeEditorProtocol.enableOverlay(target, selector)
);

export const disableOverlay = liftBackground(
  "DISABLE_ELEMENT",
  (target: Target) => async () => nativeEditorProtocol.disableOverlay(target)
);

export const getInstalledExtensionPointIds = liftBackground(
  "INSTALLED_EXTENSION_POINT_IDS",
  (target: Target) => async () =>
    nativeEditorProtocol.getInstalledExtensionPointIds(target)
);

export const checkAvailable = liftBackground(
  "CHECK_AVAILABLE",
  (target: Target) => async (availability: Availability) =>
    nativeEditorProtocol.checkAvailable(target, availability)
);

export const searchWindow: (
  port: Runtime.Port,
  query: string
) => Promise<{ results: unknown[] }> = liftBackground(
  "SEARCH_WINDOW",
  (target: Target) => async (query: string) =>
    contentScriptProtocol.searchWindow(target, query)
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
    contentScriptProtocol.runReaderBlock(target, {
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
    contentScriptProtocol.runReader(target, {
      config,
      rootSelector,
    })
);

export const uninstallContextMenu = liftBackground(
  "UNINSTALL_CONTEXT_MENU",
  // False positive - it's the inner method that should be async
  // eslint-disable-next-line unicorn/consistent-function-scoping
  () => async ({ extensionId }: { extensionId: UUID }) =>
    contextMenuProtocol.uninstall(extensionId)
);

export const uninstallActionPanelPanel = liftBackground(
  "UNINSTALL_ACTION_PANEL_PANEL",
  // False positive - it's the inner method that should be async
  (target) => async ({ extensionId }: { extensionId: UUID }) =>
    browserActionProtocol.removeActionPanelPanel(target, extensionId)
);

export const initUiPathRobot = liftBackground(
  "UIPATH_INIT",
  (target: Target) => async () => robotProtocol.initRobot(target)
);

export const getUiPathProcesses = liftBackground(
  "UIPATH_GET_PROCESSES",
  (target: Target) => async () => robotProtocol.getProcesses(target)
);

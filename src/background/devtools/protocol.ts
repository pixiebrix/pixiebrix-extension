/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { browser, Runtime } from "webextension-polyfill-ts";
import * as contentScriptProtocol from "@/contentScript/devTools";
import * as robotProtocol from "@/contentScript/uipath";
import { Framework, FrameworkMeta } from "@/messaging/constants";
import * as nativeSelectionProtocol from "@/nativeEditor/selector";
import * as nativeEditorProtocol from "@/nativeEditor";
import { PanelSelectionResult } from "@/nativeEditor/insertPanel";
import { Availability } from "@/blocks/types";
import { ReaderTypeConfig } from "@/blocks/readers/factory";
import {
  liftBackground,
  registerPort as internalRegisterPort,
} from "@/background/devtools/internal";
import { testTabPermissions, injectContentScript } from "@/background/util";
import { sleep } from "@/utils";
import { isEmpty } from "lodash";
import * as contextMenuProtocol from "@/background/contextMenus";
import { Target } from "@/background/devtools/contract";

export const registerPort = liftBackground(
  "REGISTER_PORT",
  (target: Target, port: Runtime.Port) => async () => {
    internalRegisterPort(target.tabId, port);
  }
);

export const getTabInfo = liftBackground(
  "CURRENT_URL",
  (target: Target) => async () => {
    if (target.frameId !== 0) {
      console.warn(
        `getTabInfo called targeting non top-level frame: ${target.frameId}`
      );
    }
    const hasPermissions = await testTabPermissions({ ...target, frameId: 0 });
    const { url } = await browser.tabs.get(target.tabId);
    return {
      url,
      hasPermissions,
    };
  }
);

export const injectScript = liftBackground(
  "INJECT_SCRIPT",
  (target: Target) => async ({ file }: { file: string }) => {
    return injectContentScript(target, file);
  }
);

export const waitReady = liftBackground(
  "WAIT_READY",
  (target: Target) => async ({ maxWaitMillis }: { maxWaitMillis: number }) => {
    const start = Date.now();
    do {
      const { ready } = await contentScriptProtocol.isInstalled(target);
      if (ready) {
        return;
      }
      await sleep(150);
    } while (Date.now() - start < maxWaitMillis);
    throw new Error(`contentScript not ready in ${maxWaitMillis}ms`);
  }
);

export const readSelectedElement = liftBackground(
  "READ_ELEMENT",
  (target: Target) => async () => {
    return contentScriptProtocol.readSelected(target);
  }
);

export const detectFrameworks: (
  port: Runtime.Port
) => Promise<FrameworkMeta[]> = liftBackground(
  "DETECT_FRAMEWORKS",
  (target: Target) => async () => {
    return (await contentScriptProtocol.detectFrameworks(
      target
    )) as FrameworkMeta[];
  }
);

// export const findComponent = liftBackground(
//     "FIND_COMPONENT",
//     (tabId: number) => async ({
//         selector,
//         framework
//       }: {
//       selector: string
//       framework: Framework
//     }) => {
//       return await nativeSelectionProtocol.findComponent(tabId, { selector, framework });
//     }
// )

export const cancelSelectElement = liftBackground(
  "CANCEL_SELECT_ELEMENT",
  (target: Target) => async () => {
    return nativeSelectionProtocol.cancelSelect(target);
  }
);

export const selectElement = liftBackground(
  "SELECT_ELEMENT",
  (target: Target) => async ({
    mode = "element",
    framework,
    traverseUp = 0,
    root = undefined,
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

export const dragButton = liftBackground(
  "DRAG_BUTTON",
  (target: Target) => async ({ uuid }: { uuid: string }) => {
    return nativeEditorProtocol.dragButton(target, { uuid });
  }
);

export const insertButton = liftBackground(
  "INSERT_BUTTON",
  (target: Target) => async () => {
    return nativeEditorProtocol.insertButton(target);
  }
);

export const insertPanel: (
  port: Runtime.Port
) => Promise<PanelSelectionResult> = liftBackground(
  "INSERT_PANEL",
  (target: Target) => async () => {
    return nativeEditorProtocol.insertPanel(target);
  }
);

export const updateDynamicElement = liftBackground(
  "UPDATE_DYNAMIC_ELEMENT",
  (target: Target) => async (
    element: nativeEditorProtocol.DynamicDefinition
  ) => {
    return nativeEditorProtocol.updateDynamicElement(target, element);
  }
);

export const clearDynamicElements = liftBackground(
  "CLEAR_DYNAMIC",
  (target: Target) => async ({ uuid }: { uuid?: string }) => {
    return nativeEditorProtocol.clear(target, { uuid });
  }
);

export const toggleOverlay = liftBackground(
  "TOGGLE_ELEMENT",
  (target: Target) => async ({
    uuid,
    on = true,
  }: {
    uuid: string;
    on: boolean;
  }) => {
    return nativeEditorProtocol.toggleOverlay(target, {
      selector: `[data-uuid="${uuid}"]`,
      on,
    });
  }
);

export const toggleSelector = liftBackground(
  "TOGGLE_SELECTOR",
  (target: Target) => async ({
    selector,
    on = true,
  }: {
    selector: string;
    on: boolean;
  }) => {
    return nativeEditorProtocol.toggleOverlay(target, { selector, on });
  }
);

export const getInstalledExtensionPointIds = liftBackground(
  "INSTALLED_EXTENSION_POINT_IDS",
  (target: Target) => async () => {
    return nativeEditorProtocol.getInstalledExtensionPointIds(target);
  }
);

export const checkAvailable = liftBackground(
  "CHECK_AVAILABLE",
  (target: Target) => async (availability: Availability) => {
    return nativeEditorProtocol.checkAvailable(target, availability);
  }
);

export const searchWindow: (
  port: Runtime.Port,
  query: string
) => Promise<{ results: unknown[] }> = liftBackground(
  "SEARCH_WINDOW",
  (target: Target) => async (query: string) => {
    return contentScriptProtocol.searchWindow(target, query);
  }
);

export const runReaderBlock = liftBackground(
  "RUN_READER_BLOCK",
  (target: Target) => async ({
    id,
    rootSelector,
  }: {
    id: string;
    rootSelector?: string;
  }) => {
    return contentScriptProtocol.runReaderBlock(target, {
      id,
      rootSelector,
    });
  }
);

export const runReader = liftBackground(
  "RUN_READER",
  (target: Target) => async ({
    config,
    rootSelector,
  }: {
    config: ReaderTypeConfig;
    rootSelector?: string;
  }) => {
    return contentScriptProtocol.runReader(target, {
      config,
      rootSelector,
    });
  }
);

export const uninstallContextMenu = liftBackground(
  "UNINSTALL_CONTEXT_MENU",
  () => async ({ extensionId }: { extensionId: string }) => {
    return contextMenuProtocol.uninstall(extensionId);
  }
);

export const initUiPathRobot = liftBackground(
  "UIPATH_INIT",
  (target: Target) => async () => {
    return robotProtocol.initRobot(target);
  }
);

export const getUiPathProcesses = liftBackground(
  "UIPATH_GET_PROCESSES",
  (target: Target) => async () => {
    return robotProtocol.getProcesses(target);
  }
);

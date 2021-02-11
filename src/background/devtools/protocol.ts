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
import * as contextMenuProtocol from "@/background/contextMenus";

export const registerPort = liftBackground(
  "REGISTER_PORT",
  (tabId: number, port: Runtime.Port) => async () => {
    internalRegisterPort(tabId, port);
  }
);

export const getTabInfo = liftBackground(
  "CURRENT_URL",
  (tabId: number) => async () => {
    const hasPermissions = await testTabPermissions(tabId);
    const { url } = await browser.tabs.get(tabId);
    return {
      url,
      hasPermissions,
    };
  }
);

export const injectScript = liftBackground(
  "INJECT_SCRIPT",
  (tabId: number) => async ({ file }: { file: string }) => {
    return await injectContentScript(tabId, file);
  }
);

export const waitReady = liftBackground(
  "WAIT_READY",
  (tabId: number) => async ({ maxWaitMillis }: { maxWaitMillis: number }) => {
    const start = Date.now();
    do {
      const { ready } = await contentScriptProtocol.isInstalled(tabId);
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
  (tabId: number) => async () => {
    return await contentScriptProtocol.readSelected(tabId);
  }
);

export const detectFrameworks: (
  port: Runtime.Port
) => Promise<FrameworkMeta[]> = liftBackground(
  "DETECT_FRAMEWORKS",
  (tabId: number) => async () => {
    return (await contentScriptProtocol.detectFrameworks(
      tabId
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
  (tabId: number) => async () => {
    return await nativeSelectionProtocol.cancelSelect(tabId);
  }
);

export const selectElement = liftBackground(
  "SELECT_ELEMENT",
  (tabId: number) => async ({
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
    return await nativeSelectionProtocol.selectElement(tabId, {
      framework,
      mode,
      traverseUp,
      root,
    });
  }
);

export const dragButton = liftBackground(
  "DRAG_BUTTON",
  (tabId: number) => async ({ uuid }: { uuid: string }) => {
    return await nativeEditorProtocol.dragButton(tabId, { uuid });
  }
);

export const insertButton = liftBackground(
  "INSERT_BUTTON",
  (tabId: number) => async () => {
    return await nativeEditorProtocol.insertButton(tabId);
  }
);

export const insertPanel: (
  port: Runtime.Port
) => Promise<PanelSelectionResult> = liftBackground(
  "INSERT_PANEL",
  (tabId: number) => async () => {
    return await nativeEditorProtocol.insertPanel(tabId);
  }
);

export const updateDynamicElement = liftBackground(
  "UPDATE_DYNAMIC_ELEMENT",
  (tabId: number) => async (
    element: nativeEditorProtocol.DynamicDefinition
  ) => {
    return await nativeEditorProtocol.updateDynamicElement(tabId, element);
  }
);

export const clearDynamicElements = liftBackground(
  "CLEAR_DYNAMIC",
  (tabId: number) => async ({ uuid }: { uuid?: string }) => {
    return await nativeEditorProtocol.clear(tabId, { uuid });
  }
);

export const toggleOverlay = liftBackground(
  "TOGGLE_ELEMENT",
  (tabId: number) => async ({
    uuid,
    on = true,
  }: {
    uuid: string;
    on: boolean;
  }) => {
    return await nativeEditorProtocol.toggleOverlay(tabId, {
      selector: `[data-uuid="${uuid}"]`,
      on,
    });
  }
);

export const toggleSelector = liftBackground(
  "TOGGLE_SELECTOR",
  (tabId: number) => async ({
    selector,
    on = true,
  }: {
    selector: string;
    on: boolean;
  }) => {
    return await nativeEditorProtocol.toggleOverlay(tabId, { selector, on });
  }
);

export const getInstalledExtensionPointIds = liftBackground(
  "INSTALLED_EXTENSION_POINT_IDS",
  (tabId: number) => async () => {
    return await nativeEditorProtocol.getInstalledExtensionPointIds(tabId);
  }
);

export const checkAvailable = liftBackground(
  "CHECK_AVAILABLE",
  (tabId: number) => async (availability: Availability) => {
    return await nativeEditorProtocol.checkAvailable(tabId, availability);
  }
);

export const searchWindow: (
  port: Runtime.Port,
  query: string
) => Promise<{ results: unknown[] }> = liftBackground(
  "SEARCH_WINDOW",
  (tabId: number) => async (query: string) => {
    return await contentScriptProtocol.searchWindow(tabId, query);
  }
);

export const runReaderBlock = liftBackground(
  "RUN_READER_BLOCK",
  (tabId: number) => async ({
    id,
    rootSelector,
  }: {
    id: string;
    rootSelector?: string;
  }) => {
    return await contentScriptProtocol.runReaderBlock(tabId, {
      id,
      rootSelector,
    });
  }
);

export const runReader = liftBackground(
  "RUN_READER",
  (tabId: number) => async ({
    config,
    rootSelector,
  }: {
    config: ReaderTypeConfig;
    rootSelector?: string;
  }) => {
    return await contentScriptProtocol.runReader(tabId, {
      config,
      rootSelector,
    });
  }
);

export const uninstallContextMenu = liftBackground(
  "UNINSTALL_CONTEXT_MENU",
  () => async ({ extensionId }: { extensionId: string }) => {
    return await contextMenuProtocol.uninstall(extensionId);
  }
);

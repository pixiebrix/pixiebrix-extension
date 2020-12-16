/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

// https://github.com/facebook/react/blob/7559722a865e89992f75ff38c1015a865660c3cd/packages/react-devtools-shared/src/backend/views/Highlighter/index.js

import { v4 as uuidv4 } from "uuid";
import { liftContentScript } from "@/contentScript/backgroundProtocol";
import Overlay from "./Overlay";
import { ElementInfo } from "@/nativeEditor/frameworks";
import { userSelectElement } from "@/nativeEditor/selector";
import * as pageScript from "@/pageScript/protocol";
import {
  DEFAULT_ACTION_CAPTION,
  findContainer,
  inferButtonHTML,
} from "@/nativeEditor/infer";
import {
  MenuDefinition,
  MenuItemExtensionConfig,
} from "@/extensionPoints/menuItemExtension";
import { runDynamic, clearDynamic } from "@/contentScript/lifecycle";
import { IExtension, IExtensionPoint } from "@/core";
import {
  ReaderConfig,
  ReaderDefinition,
  readerFactory,
} from "@/blocks/readers/factory";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { html as beautifyHTML } from "js-beautify";
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";

let overlay: Overlay | null = null;

export interface DynamicDefinition<
  TExtensionPoint extends ExtensionPointDefinition = ExtensionPointDefinition,
  TExtension = unknown,
  TReader extends ReaderDefinition = ReaderDefinition
> {
  extensionPoint: ExtensionPointConfig<TExtensionPoint>;
  extension: IExtension<TExtension>;
  reader: ReaderConfig<TReader>;
}

export type ButtonDefinition = DynamicDefinition<
  MenuDefinition,
  MenuItemExtensionConfig
>;

export interface ButtonSelectionResult {
  uuid: string;
  menu: Omit<MenuDefinition, "defaultOptions" | "isAvailable" | "reader">;
  item: Pick<MenuItemExtensionConfig, "caption">;
  containerInfo: ElementInfo;
}

const _temporaryExtensions: Map<string, IExtensionPoint> = new Map();

export const clear = liftContentScript(
  "CLEAR_DYNAMIC",
  async ({ uuid }: { uuid?: string }) => {
    clearDynamic(uuid);
    if (uuid) {
      _temporaryExtensions.delete(uuid);
    } else {
      _temporaryExtensions.clear();
    }
  }
);

export const updateDynamicElement = liftContentScript(
  "UPDATE_DYNAMIC_ELEMENT",
  async ({
    extensionPoint: extensionPointConfig,
    extension: extensionConfig,
    reader: readerConfig,
  }: DynamicDefinition) => {
    const extensionPoint = extensionPointFactory(extensionPointConfig);

    // the reader won't be in the registry, so override the method
    const reader = readerFactory(readerConfig);
    extensionPoint.defaultReader = async () => reader;

    _temporaryExtensions.set(extensionConfig.id, extensionPoint);

    extensionPoint.addExtension(extensionConfig);

    await runDynamic(extensionConfig.id, extensionPoint);
  }
);

export const insertButton = liftContentScript("INSERT_BUTTON", async () => {
  const selected = await userSelectElement();
  const { container, selectors } = findContainer(selected);

  const element: ButtonSelectionResult = {
    uuid: uuidv4(),
    item: {
      caption: DEFAULT_ACTION_CAPTION,
    },
    menu: {
      type: "menuItem",
      containerSelector: selectors[0],
      template: beautifyHTML(inferButtonHTML(container, selected), {
        indent_handlebars: true,
        wrap_line_length: 80,
        wrap_attributes: "force",
      }),
      shadowDOM: null,
      position: "append",
    },
    containerInfo: await pageScript.getElementInfo({ selector: selectors[0] }),
  };

  return element;
});

export const toggleOverlay = liftContentScript(
  "TOGGLE_OVERLAY",
  async ({ selector, on = true }: { selector: string; on: boolean }) => {
    if (on) {
      if (overlay == null) {
        overlay = new Overlay();
      }
      const $elt = $(document).find(selector);
      overlay.inspect($elt.toArray(), null);
    } else if (overlay != null) {
      overlay.remove();
      overlay = null;
    }
  }
);

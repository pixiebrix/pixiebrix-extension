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
import { ElementInfo } from "./frameworks";
import { userSelectElement } from "./selector";
import * as pageScript from "@/pageScript/protocol";
import { findContainer, inferButtonHTML } from "./infer";
import {
  DATA_ATTR,
  MenuDefinition,
  MenuItemExtensionConfig,
} from "@/extensionPoints/menuItemExtension";
import { html as beautifyHTML } from "js-beautify";
import { DynamicDefinition } from "./dynamic";
import dragula from "dragula";

export const DEFAULT_ACTION_CAPTION = "Action";

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

// let drake = null;

function dragPromise(uuid: string): Promise<void> {
  const drake = dragula({
    isContainer: (el?: Element) => {
      return ["DIV", "SECTION"].includes(el.tagName);
    },
    moves: (el?: Element) => {
      return el.getAttribute(DATA_ATTR) === uuid;
    },
  });

  return new Promise((resolve) => {
    drake.on("dragend", () => {
      resolve();
      drake.destroy();
    });
  });
}

export const dragButton = liftContentScript(
  "DRAG_BUTTON",
  async ({ uuid }: { uuid: string }) => {
    await dragPromise(uuid);
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

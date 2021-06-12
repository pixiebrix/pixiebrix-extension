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
import { findContainer, inferButtonHTML, inferSelectors } from "./infer";
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

export interface DragResult {
  target: ElementInfo;
  // element to place the button before
  sibling: string[] | null;
}

function dragPromise(uuid: string): Promise<DragResult | null> {
  const drake = dragula({
    isContainer: (el?: Element) => {
      return ["DIV", "SECTION"].includes(el.tagName);
    },
    moves: (el?: Element) => {
      return el.getAttribute(DATA_ATTR) === uuid;
    },
  });

  let resolved = false;

  return new Promise((resolve) => {
    drake.on("dragend", () => {
      if (!resolved) {
        resolve(null);
      }
      drake.destroy();
    });

    drake.on(
      "drop",
      async (
        el: Element,
        target: Element,
        source: Element,
        sibling: Element
      ) => {
        resolved = true;

        console.debug("Drop element", {
          el,
          target,
          source,
          sibling,
        });

        const selectors = inferSelectors(target as HTMLElement);
        const targetInfo = await pageScript.getElementInfo({
          selector: selectors[0],
        });
        resolve({
          target: targetInfo,
          sibling: sibling
            ? inferSelectors(sibling as HTMLElement, target)
            : null,
        });
      }
    );
  });
}

export const dragButton = liftContentScript(
  "DRAG_BUTTON",
  async ({ uuid }: { uuid: string }) => {
    return dragPromise(uuid);
  }
);

export const insertButton = liftContentScript("INSERT_BUTTON", async () => {
  let selected = await userSelectElement();

  // anchor is an inline element, so if the structure in a > span, the user has no way of
  // selecting the outer anchor unless there's padding/margin involved.
  //
  // if the parent is BUTTON, the user probably just selected the wrong thing
  if (
    selected.length === 1 &&
    ["A", "BUTTON"].includes(selected[0].parentElement?.tagName)
  ) {
    selected = [selected[0].parentElement];
  }

  const { container, selectors: containerSelectors } = findContainer(selected);

  console.debug("insertButton", { container, selected });

  const element: ButtonSelectionResult = {
    uuid: uuidv4(),
    item: {
      caption: DEFAULT_ACTION_CAPTION,
    },
    menu: {
      type: "menuItem",
      containerSelector: containerSelectors[0],
      template: beautifyHTML(inferButtonHTML(container, selected), {
        indent_handlebars: true,
        wrap_line_length: 80,
        wrap_attributes: "force",
      }),
      shadowDOM: null,
      position: "append",
    },
    containerInfo: await pageScript.getElementInfo({
      selector: containerSelectors[0],
    }),
  };

  return element;
});

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

// https://github.com/facebook/react/blob/7559722a865e89992f75ff38c1015a865660c3cd/packages/react-devtools-shared/src/backend/views/Highlighter/index.js

import { uuidv4 } from "@/types/helpers";
import { ElementInfo } from "./frameworks";
import { userSelectElement } from "./selector";
import * as pageScript from "@/pageScript/protocol";
import { findContainer, inferButtonHTML } from "./infer";
import {
  MenuDefinition,
  MenuItemExtensionConfig,
} from "@/extensionPoints/menuItemExtension";
import { html as beautifyHTML } from "js-beautify";
import type { DynamicDefinition } from "./dynamic";
import { Except } from "type-fest";
import { UUID } from "@/core";
import { PRIVATE_ATTRIBUTES_SELECTOR } from "@/common";

export const DEFAULT_ACTION_CAPTION = "Action";

export type ButtonDefinition = DynamicDefinition<
  MenuDefinition,
  MenuItemExtensionConfig
>;

export type ButtonSelectionResult = {
  uuid: UUID;
  menu: Except<MenuDefinition, "defaultOptions" | "isAvailable" | "reader">;
  item: Pick<MenuItemExtensionConfig, "caption">;
  containerInfo: ElementInfo;
};

export async function insertButton(
  useNewFilter = false
): Promise<ButtonSelectionResult> {
  let selected;
  if (useNewFilter) {
    selected = await userSelectElement({
      filter: `:is(a, button):not(${PRIVATE_ATTRIBUTES_SELECTOR})`,
    });
  } else {
    selected = await userSelectElement();

    // Anchor is an inline element, so if the structure in a > span, the user has no way of
    // selecting the outer anchor unless there's padding/margin involved.
    //
    // if the parent is BUTTON, the user probably just selected the wrong thing
    if (
      selected.length === 1 &&
      ["A", "BUTTON"].includes(selected[0].parentElement?.tagName)
    ) {
      selected = [selected[0].parentElement];
    }
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
}

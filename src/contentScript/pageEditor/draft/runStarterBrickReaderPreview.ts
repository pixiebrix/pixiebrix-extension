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

import { type JsonObject } from "type-fest";
import { type SelectorRoot } from "@/types/runtimeTypes";
import { $safeFind } from "@/utils/domUtils";
import { type DraftModComponent } from "@/contentScript/pageEditor/types";
import { expectContext } from "@/utils/expectContext";
import { fromJS as starterBrickFactory } from "@/starterBricks/factory";
import { type Nullishable } from "@/utils/nullishUtils";

/**
 * Returns a preview of the output of the reader for a DraftModComponent.
 */
export async function runStarterBrickReaderPreview(
  { extensionPointConfig }: Pick<DraftModComponent, "extensionPointConfig">,
  rootSelector: Nullishable<string>,
): Promise<JsonObject> {
  expectContext("contentScript");

  const { activeElement } = document;
  let root: SelectorRoot | undefined;

  // Handle element-based reader context for triggers
  if (rootSelector) {
    const $root = $safeFind(rootSelector);
    if ($root.length === 1) {
      // If there's a single root, use that even if it's not the active element (because that's likely the one the user
      // is intending to use).
      root = $root.get(0);
    } else if ($root.length > 1 && activeElement) {
      $root.each(function () {
        if (activeElement === this) {
          root = activeElement as HTMLElement;
        }
      });

      if (root == null) {
        throw new Error(
          `Focused element ${activeElement.tagName} does not match the root selector. There are ${$root.length} matching elements on the page`,
        );
      }
    } else if ($root.length === 0) {
      throw new Error(
        `No elements matching selector are currently on the page: ${rootSelector}`,
      );
    }
  }

  const starterBrick = starterBrickFactory(extensionPointConfig);

  const reader = await starterBrick.previewReader();

  // FIXME: this will return an incorrect value in the following scenario(s):
  //  - A menuItem uses a readerSelector (which is OK, because that param is not exposed in the Page Editor)
  return reader.read(root ?? document);
}

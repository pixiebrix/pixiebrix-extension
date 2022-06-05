/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { Effect } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { $safeFind } from "@/helpers";
import sanitize from "@/utils/sanitize";
import { PIXIEBRIX_DATA_ATTR } from "@/common";
import { escape } from "lodash";
import { BusinessError } from "@/errors/businessErrors";

type Position = "before" | "prepend" | "append" | "after";

const POSITIONS: Position[] = ["before", "prepend", "append", "after"];

const POSITION_MAP = new Map<Position, InsertPosition>([
  ["before", "beforebegin"],
  ["prepend", "afterbegin"],
  ["append", "beforeend"],
  ["after", "afterend"],
]);

class InsertHtml extends Effect {
  constructor() {
    super(
      "@pixiebrix/html/insert",
      "Insert HTML Element",
      "Insert HTML Element relative to another element on the page"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      anchor: {
        type: "string",
        description: "An element to insert the HTML relative to",
        format: "selector",
      },
      html: {
        type: "string",
        description: "The HTML element to insert into the page",
        format: "html",
      },
      position: {
        type: "string",
        description:
          "https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML",
        enum: POSITIONS,
        default: "append",
      },
      replacementId: {
        type: "string",
        description:
          "Optional unique identifier (id) to replace element from previous run",
      },
    },
    ["anchor", "html"]
  );

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    {
      anchor,
      html,
      position = "append",
      replacementId,
    }: BlockArg<{
      anchor: string;
      html: string;
      replacementId?: string;
      position?: Position;
    }>,
    { root = document }: BlockOptions
  ): Promise<void> {
    const sanitizedHTML = sanitize(html);
    const sanitizedElement = $(sanitizedHTML).get(0);

    const escapedId = escape(replacementId);
    if (replacementId) {
      // Use PIXIEBRIX_DATA_ATTR instead of id to support semantics of multiple elements on the page
      $safeFind(`[${PIXIEBRIX_DATA_ATTR}="${escapedId}"]`, root).remove();
      sanitizedElement.setAttribute(PIXIEBRIX_DATA_ATTR, escapedId);
    }

    const anchorElements = $safeFind(anchor, root);

    for (const anchorElement of anchorElements.get()) {
      try {
        anchorElement.insertAdjacentHTML(
          POSITION_MAP.get(position),
          sanitizedElement.outerHTML
        );
      } catch (error) {
        if (error instanceof DOMException) {
          throw new BusinessError("Error inserting element", { cause: error });
        }
      }
    }
  }
}

export default InsertHtml;

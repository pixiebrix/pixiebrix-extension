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
import { BusinessError } from "@/errors";
import sanitize from "@/utils/sanitize";

export class InsertHtml extends Effect {
  constructor() {
    super(
      "@pixiebrix/html/insert",
      "Insert HTML",
      "Insert HTML relative to another element on the page"
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
        enum: ["beforebegin", "afterbegin", "beforeend", "afterend"],
        default: "beforeend",
      },
      id: {
        type: "string",
        description:
          "Pass a unique identifier (id) to replace element from previous run",
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
      position = "beforeend",
      id,
    }: BlockArg<{
      anchor: string;
      html: string;
      id: string;
      position: "beforebegin" | "afterbegin" | "beforeend" | "afterend";
    }>,
    { root = document }: BlockOptions
  ): Promise<void> {
    const sanitizedHTML = sanitize(html);

    const sanitizedElement = $(sanitizedHTML).get(0);

    if (id) {
      $safeFind(`#${id}`, root).remove();
      sanitizedElement.setAttribute("id", id);
    }

    const elements = $safeFind(anchor, root);

    for (const element of elements.get()) {
      try {
        element.insertAdjacentHTML(position, sanitizedElement.outerHTML);
      } catch (error) {
        if (error instanceof DOMException) {
          throw new BusinessError("Error inserting element", { cause: error });
        }
      }
    }
  }
}

export default InsertHtml;

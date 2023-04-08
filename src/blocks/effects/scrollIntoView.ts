/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { Effect } from "@/types/blocks/effectTypes";
import { type BlockArg, type BlockOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import { $safeFindElementsWithRootMode } from "@/blocks/rootModeHelpers";
import { assertSingleElement } from "@/utils/requireSingleElement";

export class ScrollIntoViewEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/dom/scroll",
      "Scroll Element Into View",
      "Scroll an element into view on the page"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      selector: {
        type: "string",
        format: "selector",
        description:
          "A jQuery selector, or leave blank to scroll to the target element",
      },
      behavior: {
        type: "string",
        enum: ["auto", "smooth"],
        default: "auto",
        description: "Defines the transition animation",
      },
      block: {
        type: "string",
        enum: ["start", "center", "end", "nearest"],
        default: "start",
        description: "Defines vertical alignment",
      },
      inline: {
        type: "string",
        enum: ["start", "center", "end", "nearest"],
        default: "nearest",
        description: "Defines horizontal alignment",
      },
    },
    []
  );

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    {
      selector,
      behavior = "auto",
      block = "start",
      inline = "nearest",
    }: BlockArg<{
      selector?: string;
      behavior?: "auto" | "smooth";
      block?: "start" | "center" | "end" | "nearest";
      inline?: "start" | "center" | "end" | "nearest";
    }>,
    { root }: BlockOptions
  ): Promise<void> {
    const $elements = $safeFindElementsWithRootMode({
      selector,
      root,
      isRootAware: true,
      blockId: this.id,
    });

    const element = assertSingleElement<HTMLElement>($elements, selector);

    element.scrollIntoView({
      behavior,
      block,
      inline,
    });
  }
}

export default ScrollIntoViewEffect;

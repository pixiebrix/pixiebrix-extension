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

import { type AutocompleteItem } from "autocompleter";
import {
  $safeFindElementsWithRootMode,
  IS_ROOT_AWARE_BRICK_PROPS,
} from "../rootModeHelpers";
import "autocompleter/autocomplete.css";
import { EffectABC } from "../../types/bricks/effectTypes";
import { type Schema } from "../../types/schemaTypes";
import {
  isDocument,
  type BrickArgs,
  type BrickOptions,
} from "../../types/runtimeTypes";
import { propertiesToSchema } from "../../utils/schemaUtils";

export class AttachAutocomplete extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/forms/autocomplete",
      "Attach Autocomplete",
      "Attach autocomplete to an input",
    );
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      selector: {
        type: "string",
        format: "selector",
      },
      options: {
        type: "array",
        items: {
          type: "string",
        },
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    ["options"],
  );

  async effect(
    {
      selector,
      options,
      isRootAware = false,
    }: BrickArgs<{
      selector: string;
      options: string[];
      isRootAware?: boolean;
    }>,
    { logger, root }: BrickOptions,
  ): Promise<void> {
    const $elements = $safeFindElementsWithRootMode({
      selector,
      isRootAware,
      root,
      blockId: this.id,
    });

    const inputs = $elements
      .toArray()
      .filter((x) => !isDocument(x) && x.tagName === "INPUT");

    if (inputs.length === 0) {
      logger.warn("No input elements found", {
        selector,
        isRootAware,
      });

      // Return early to avoid injecting the stylesheet and loading the module
      return;
    }

    const { default: autocompleter } = await import(
      /* webpackChunkName: "autocompleter" */ "autocompleter"
    );

    for (const input of inputs) {
      autocompleter({
        input: input as HTMLInputElement,
        onSelect(item) {
          $elements.val(item.label ?? "");
        },
        fetch(text: string, update: (items: AutocompleteItem[]) => void) {
          const normalized = text.toLowerCase();
          update(
            options
              .filter((x) => x.toLowerCase().includes(normalized))
              .map((label) => ({ label })),
          );
        },
      });
    }
  }
}

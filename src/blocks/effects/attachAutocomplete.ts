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

import { propertiesToSchema } from "@/validators/generic";
import { type AutocompleteItem } from "autocompleter";
import {
  $safeFindElementsWithRootMode,
  IS_ROOT_AWARE_BRICK_PROPS,
} from "@/blocks/rootModeHelpers";
import autocompleterStyleUrl from "autocompleter/autocomplete.css?loadAsUrl";
import injectStylesheet from "@/utils/injectStylesheet";
import { Effect } from "@/types/blocks/effectTypes";
import { type Schema } from "@/types/schemaTypes";
import { type BlockArg, type BlockOptions } from "@/types/runtimeTypes";

export class AttachAutocomplete extends Effect {
  constructor() {
    super(
      "@pixiebrix/forms/autocomplete",
      "Attach Autocomplete",
      "Attach autocomplete to an input"
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
    ["options"]
  );

  async effect(
    {
      selector,
      options,
      isRootAware = false,
    }: BlockArg<{
      selector: string;
      options: string[];
      isRootAware?: boolean;
    }>,
    { logger, root }: BlockOptions
  ): Promise<void> {
    const $elements = $safeFindElementsWithRootMode({
      selector,
      isRootAware,
      root,
      blockId: this.id,
    });

    const inputs = $elements
      .toArray()
      .filter((x) => !(x instanceof Document) && x.tagName === "INPUT");

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
    // TODO: adjust style to hard-code font color so it works on dark themes that have a light font color by default
    await injectStylesheet(autocompleterStyleUrl);

    for (const input of inputs) {
      autocompleter({
        input: input as HTMLInputElement,
        onSelect(item) {
          $elements.val(item.label);
        },
        fetch(text: string, update: (items: AutocompleteItem[]) => void) {
          const normalized = text.toLowerCase();
          update(
            options
              .filter((x) => x.toLowerCase().includes(normalized))
              .map((label) => ({ label }))
          );
        },
      });
    }
  }
}

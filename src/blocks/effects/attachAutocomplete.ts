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
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { type AutocompleteItem } from "autocompleter";

import autocompleterStyleUrl from "autocompleter/autocomplete.css?loadAsUrl";
import injectStylesheet from "@/utils/injectStylesheet";
import { $safeFind } from "@/helpers";

export class AttachAutocomplete extends Effect {
  constructor() {
    super(
      "@pixiebrix/forms/autocomplete",
      "Attach Autocomplete",
      "Attach autocomplete to an input"
    );
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
    },
    ["selector", "options"]
  );

  async effect(
    {
      selector,
      options,
    }: BlockArg<{
      selector: string;
      options: string[];
    }>,
    { logger }: BlockOptions
  ): Promise<void> {
    const $elements = $safeFind(selector);

    const inputs = $elements.toArray().filter((x) => x.tagName === "INPUT");

    const { default: autocompleter } = await import(
      /* webpackChunkName: "autocompleter" */ "autocompleter"
    );
    // TODO: adjust style to hard-code font color so it works on dark themes that have a light font color by default
    await injectStylesheet(autocompleterStyleUrl);

    if (inputs.length === 0) {
      logger.warn("No input elements found for selector");
    }

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

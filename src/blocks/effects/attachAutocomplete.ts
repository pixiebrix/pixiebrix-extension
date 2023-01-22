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

import { Effect } from "@/types";
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import {
  $safeFindElementsWithRootMode,
  IS_ROOT_AWARE_BRICK_PROPS,
} from "@/blocks/rootModeHelpers";
import { uuidv4 } from "@/types/helpers";

function getDataList(options: string[]): HTMLDataListElement {
  const datalist = document.createElement("datalist");
  datalist.id = "pb-list-" + uuidv4();
  for (const option of options) {
    const optionElement = document.createElement("option");
    optionElement.value = option;
    datalist.append(optionElement);
  }

  return datalist;
}

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

    const $inputs = $elements.filter("input");
    if ($inputs.length === 0) {
      logger.warn("No input elements found", {
        selector,
        isRootAware,
      });

      return;
    }

    if (options?.length > 0) {
      const datalist = getDataList(options);
      document.head.append(datalist);
      $inputs.attr("list", datalist.id);
    }
  }
}

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

import { Effect } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";

export class FormFill extends Effect {
  constructor() {
    super("@pixiebrix/form-fill", "Form Fill", "Fill out fields in a form");
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      formSelector: {
        type: "string",
      },
      fieldNames: {
        type: "object",
        additionalProperties: { type: "string" },
      },
      fieldSelectors: {
        type: "object",
        additionalProperties: { type: "string" },
      },
    },
  };

  async effect({
    formSelector,
    fieldNames = {},
    fieldSelectors = {},
  }: BlockArg): Promise<void> {
    const $form = $(formSelector);

    if ($form.length === 0) {
      throw new Error("Form not found");
    } else if ($form.length > 1) {
      throw new Error(`Selector ${formSelector} found ${$form.length} forms`);
    }

    for (const [name, value] of Object.entries(fieldNames)) {
      $form.find(`[name="${name}"]`).val(String(value));
    }

    for (const [selector, value] of Object.entries(fieldSelectors)) {
      $form.find(selector).val(String(value));
    }
  }
}

registerBlock(new FormFill());

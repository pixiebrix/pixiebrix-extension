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
import { BlockArg, BlockOptions, Schema } from "@/core";
import { boolean } from "@/utils";

function setValue($input: JQuery<HTMLElement>, value: unknown) {
  if ($input.is(":radio") || $input.is(":checkbox")) {
    $input.prop("checked", boolean(value));
  } else {
    $input.val(String(value));
  }
}

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
        additionalProperties: {
          oneOf: [{ type: "string" }, { type: "boolean" }, { type: "number" }],
        },
      },
      fieldSelectors: {
        type: "object",
        additionalProperties: {
          oneOf: [{ type: "string" }, { type: "boolean" }, { type: "number" }],
        },
      },
      submit: {
        description: "true to submit the form, or a JQuery selector to click",
        default: false,
        oneOf: [{ type: "string" }, { type: "boolean" }],
      },
    },
    required: ["formSelector"],
  };

  async effect(
    {
      formSelector,
      fieldNames = {},
      fieldSelectors = {},
      submit = false,
    }: BlockArg,
    { logger }: BlockOptions
  ): Promise<void> {
    const $form = $(document).find(formSelector);

    if ($form.length === 0) {
      throw new Error(`Form not found for selector: ${formSelector}`);
    } else if ($form.length > 1) {
      throw new Error(`Selector found ${$form.length} forms: ${formSelector}`);
    }

    for (const [name, value] of Object.entries(fieldNames)) {
      const $input = $form.find(`[name="${name}"]`);
      if ($input.length === 0) {
        logger.warn(`Could not find input ${name} on the form`);
      }
      setValue($input, value);
    }

    for (const [selector, value] of Object.entries(fieldSelectors)) {
      const $input = $form.find(selector);
      if ($input.length === 0) {
        logger.warn(
          `Could not find input with selector ${selector} on the form`
        );
      }
      setValue($input, value);
    }

    if (typeof submit === "boolean") {
      if (submit) {
        if (!$form.is("form")) {
          throw new Error(
            `Can only submit a form element, got tag ${$form.get(0).tagName}`
          );
        }
        $form.trigger("submit");
      }
    } else if (typeof submit === "string") {
      const $submit = $form.find(submit);
      if ($submit.length === 0) {
        throw new Error(`Did not find selector ${submit} in the form`);
      } else if ($submit.length > 1) {
        throw new Error(
          `Found multiple elements for the submit selector ${submit} in the form`
        );
      }
      $submit.trigger("click");
    } else {
      throw new Error("Unexpected argument for property submit");
    }
  }
}

registerBlock(new FormFill());

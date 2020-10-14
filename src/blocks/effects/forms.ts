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

    for (const [name, value] of Object.entries(fieldNames)) {
      $form.find(`[name="${name}"]`).val(String(value));
    }

    for (const [selector, value] of Object.entries(fieldSelectors)) {
      $form.find(selector).val(String(value));
    }
  }
}

registerBlock(new FormFill());

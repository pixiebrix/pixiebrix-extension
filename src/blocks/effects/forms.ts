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
import {
  type BlockArg,
  type BlockOptions,
  type Logger,
  type Schema,
} from "@/core";
import { boolean } from "@/utils";
import { requireSingleElement } from "@/utils/requireSingleElement";
import { type RequireExactlyOne } from "type-fest";
import {
  BusinessError,
  MultipleElementsFoundError,
  NoElementsFoundError,
} from "@/errors/businessErrors";
import {
  $safeFindElementsWithRootMode,
  IS_ROOT_AWARE_BRICK_PROPS,
} from "@/blocks/rootModeHelpers";
import { isEmpty } from "lodash";

type SetValueData = RequireExactlyOne<
  {
    form?: HTMLElement | Document;
    value: unknown;
    selector?: string;
    name?: string;
    dispatchEvent?: boolean;
    logger: Logger;
  },
  "selector" | "name"
>;

const optionFields = ["checkbox", "radio"];

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isFieldElement(element: HTMLElement): boolean {
  return (
    element.isContentEditable ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

function setFieldValue(
  field: FieldElement,
  value: unknown,
  { dispatchEvent, isOption }: { dispatchEvent: boolean; isOption: boolean }
): void {
  if (field.isContentEditable) {
    // Field needs to be focused first
    field.focus();

    // `insertText` acts as a "paste", so if no text is selected it's just appended
    document.execCommand("selectAll");

    // It automatically triggers an `input` event
    document.execCommand("insertText", false, String(value));

    return;
  }

  // `instanceof` is there as a type guard only
  if (
    !optionFields.includes(field.type) ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    // Plain text field
    field.value = String(value);
  } else if (isOption) {
    // Value-based radio/checkbox
    field.checked = field.value === value;
  } else {
    // Boolean checkbox
    field.checked = boolean(value);
  }

  if (dispatchEvent) {
    if (
      !(optionFields.includes(field.type) || field instanceof HTMLSelectElement)
    ) {
      // Browsers normally fire these text events while typing
      field.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
      field.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true }));
      field.dispatchEvent(new CompositionEvent("textInput", { bubbles: true }));
      field.dispatchEvent(new InputEvent("input", { bubbles: true }));
      field.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    }

    // Browsers normally fire this on `blur` if it's a text field, otherwise immediately
    field.dispatchEvent(new KeyboardEvent("change", { bubbles: true }));
  }
}

/**
 * Set the value of an input, doing the right thing for check boxes, etc.
 */
function setValue({
  form = document,
  value,
  logger,
  name,
  selector = `[name="${name}"]`,
  dispatchEvent = true,
}: SetValueData) {
  const isNameBased = Boolean(name);
  const fields = $(form)
    .find<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)
    .toArray()
    .filter((element) => {
      const isField = isFieldElement(element);
      if (!isField) {
        logger.warn(
          "The selected element is not an input field nor an editable element",
          { element }
        );
      }

      return isField;
    });

  if (fields.length === 0) {
    if (isNameBased) {
      logger.warn(`Could not find input fields with name: ${name}`);
    } else {
      logger.warn(`Could not find input fields for selector: ${selector}`);
    }

    return;
  }

  // Exact matches will be picked out of many, otherwise we'll treat them as booleans
  const isOption =
    isNameBased &&
    fields.some(
      (field) => field.value === value && optionFields.includes(field.type)
    );

  for (const field of fields) {
    setFieldValue(field, value, { dispatchEvent, isOption });
  }
}

export class SetInputValue extends Effect {
  constructor() {
    super(
      "@pixiebrix/forms/set",
      "Set Input Value",
      "Set the value of an input field"
    );
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      inputs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              format: "selector",
              description:
                "jQuery selector for the input(s), or exclude to use target element",
            },
            value: {
              oneOf: [
                { type: "string" },
                { type: "boolean" },
                { type: "number" },
              ],
            },
          },
        },
        minItems: 1,
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    required: ["inputs"],
  };

  async effect(
    {
      inputs,
      isRootAware,
    }: BlockArg<{
      inputs: Array<{ selector: string; value: unknown }>;
      isRootAware?: boolean;
    }>,
    { logger, root }: BlockOptions
  ): Promise<void> {
    const target = isRootAware ? root : document;
    for (const { selector, value } of inputs) {
      if (isEmpty(selector)) {
        if (target == null || target === document) {
          throw new BusinessError("Selector required when called on document");
        }

        if (!isFieldElement(target as HTMLElement)) {
          throw new BusinessError(
            "Field is not a input field or editable element"
          );
        }

        setFieldValue(target as FieldElement, value, {
          dispatchEvent: true,
          isOption: false,
        });
      } else {
        // `setValue` works on any element that contains fields, not just forms
        setValue({
          selector,
          value,
          logger,
          dispatchEvent: true,
          form: target,
        });
      }
    }
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
        format: "selector",
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
        description: "true to submit the form, or a jQuery selector to click",
        default: false,
        oneOf: [{ type: "string" }, { type: "boolean" }],
      },
    },
    required: [],
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    {
      formSelector,
      fieldNames = {},
      fieldSelectors = {},
      submit = false,
      isRootAware = false,
    }: BlockArg,
    { logger, root }: BlockOptions
  ): Promise<void> {
    const submitRoot = isRootAware ? root : document;

    const $form = $safeFindElementsWithRootMode({
      selector: formSelector,
      selectorProp: "formSelector",
      root,
      blockId: this.id,
      isRootAware,
    });

    if ($form.length === 0) {
      throw new NoElementsFoundError(formSelector);
    }

    if ($form.length > 1) {
      throw new MultipleElementsFoundError(formSelector);
    }

    for (const [name, value] of Object.entries(fieldNames)) {
      setValue({ name, value, logger, dispatchEvent: true });
    }

    for (const [selector, value] of Object.entries(fieldSelectors)) {
      setValue({ selector, value, logger, dispatchEvent: true });
    }

    if (typeof submit === "boolean") {
      if (submit) {
        if (!$form.is("form")) {
          const form = $form.get(0);

          if (form instanceof Document) {
            throw new BusinessError(
              "Can only submit a form element, got document"
            );
          }

          throw new BusinessError(
            `Can only submit a form element, got tag ${form.tagName}`
          );
        }

        $form.trigger("submit");
      }
    } else if (typeof submit === "string") {
      const $submit = $(requireSingleElement(submit, submitRoot));
      $submit.trigger("click");
    } else {
      throw new BusinessError("Unexpected argument for property submit");
    }
  }
}

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

import {
  BusinessError,
  MultipleElementsFoundError,
} from "@/errors/businessErrors";
import { asyncMapValues, pollUntilTruthy } from "../../utils/promiseUtils";
import { $safeFind } from "../../utils/domUtils";

type CastType = "string" | "boolean" | "number";

export interface SingleSelector {
  /**
   * True if the selector should return an array. Defaults to false.
   */
  multi?: boolean;
  /**
   * The attribute to read. Mutually exclusive with `data` and `contents`.
   */
  attr?: string;
  /**
   * The data attribute to read without with `data-` prefix. Mutually exclusive with `attr` and `contents`.
   */
  data?: string;
  /**
   * The textual content to read. Mutually exclusive with `attr` and `data`. Default is `text`.
   */
  contents?: "text" | "comment";
  /**
   * True to output text more closely to what the user sees, e.g., with line breaks.
   * See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText
   */
  renderedText?: boolean;
  /**
   * The type to cast the result to. By default, all values are returned as strings.
   */
  type?: CastType;
}

export interface ChildrenSelector {
  /**
   * True if the selector should return an array. Defaults to false.
   */
  multi?: boolean;
  /**
   * The sub-selectors to apply.
   */
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- this is a recursive type
  find: SelectorConfigMap;
}

export type CommonSelector = ChildrenSelector | SingleSelector;

export type SelectorConfig = CommonSelector & {
  selector?: string;

  // Block until the element is available
  maxWaitMillis?: number;
};

/**
 * Selector configuration by property name key. Assumes the values are already rendered via mapArgs.
 */
export type SelectorConfigMap = Record<string, string | SelectorConfig>;

type Result =
  // eslint-disable-next-line local-rules/preferNullishable -- Clearer this way
  | string
  | number
  | boolean
  | null
  | undefined
  | Result[]
  | { [key: string]: Result };

export interface JQueryConfig {
  type: "jquery";
  selectors: SelectorConfigMap;
}

function cleanValue(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ");
}

function castValue(value: string, type?: CastType): Result {
  switch (type) {
    case "boolean": {
      return Boolean(value);
    }

    case "number": {
      return Number(value);
    }

    case undefined:
    case null:
    case "string": {
      return value;
    }

    default: {
      throw new BusinessError(`Cast type ${type as string} not supported`);
    }
  }
}

async function processFind(
  element: HTMLElement | Document,
  selector: ChildrenSelector,
): Promise<Record<string, Result>> {
  return asyncMapValues(selector.find, async (selector) =>
    select(selector, element),
  );
}

const CONTENT_TYPES = {
  text: globalThis.Node?.TEXT_NODE,
  comment: globalThis.Node?.COMMENT_NODE,
} as const;

function processElement($elements: JQuery, selector: SingleSelector) {
  let value;
  if (selector.attr) {
    value = $elements.attr(selector.attr);
  } else if (selector.contents) {
    const nodeType = CONTENT_TYPES[selector.contents];
    if (!nodeType) {
      throw new BusinessError(
        "Invalid contents argument, must be either 'text' or 'comment'",
      );
    }

    // https://stackoverflow.com/questions/14248519/jquery-text-equivalent-that-converts-br-tags-to-whitespace
    value = cleanValue(
      $elements
        .contents()
        .filter(function () {
          return this.nodeType === nodeType;
        })
        .text(),
    );
  } else if (selector.data) {
    value = $elements.data(selector.data);
  } else if ($elements.is("input,select,textarea")) {
    value = $elements.val();
  } else if (selector.renderedText) {
    const $clone = $elements.clone();
    $clone.find("br").replaceWith("\n");
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- It's as requested by `selector.renderedText`
    value = $clone.get(0)?.innerText;
  } else {
    value = cleanValue($elements.text());
  }

  return castValue(String(value), selector.type);
}

async function select(
  selector: string | SelectorConfig,
  root?: HTMLElement | Document,
): Promise<Result> {
  const normalizedSelector =
    typeof selector === "string" ? { selector } : selector;
  const {
    selector: selectorString,
    multi = false,
    maxWaitMillis = 0,
  } = normalizedSelector;

  if (!selectorString?.trim()) {
    return multi ? [] : undefined;
  }

  if (!root && !selectorString) {
    throw new BusinessError(
      "'selector' required if not nested within a 'find' block",
    );
  }

  const findElements = () => {
    const $elements = selectorString
      ? $safeFind(selectorString, root)
      : $(root ?? document);
    if ($elements.length > 0 || multi) {
      return $elements.get();
    }
  };

  const elements = await pollUntilTruthy(findElements, {
    maxWaitMillis,
    intervalMillis: 50,
  });

  if (!elements?.length) {
    console.debug(
      `Did not find any elements for selector in ${maxWaitMillis}ms: ${selectorString}`,
      { root, selector },
    );

    if (maxWaitMillis) {
      throw new BusinessError(
        `Did not find any elements for selector in ${maxWaitMillis}ms: ${selectorString}`,
      );
    }

    return multi ? [] : undefined;
  }

  if (elements.length > 1 && !multi) {
    throw new MultipleElementsFoundError(
      selectorString,
      "Multiple elements found for selector. To return a list of values, toggle on Advanced Properties for the input and supply multi=true",
    );
  }

  if ("find" in normalizedSelector) {
    const values = elements.map(async (element) =>
      processFind(element, normalizedSelector),
    );
    return multi ? Promise.all(values) : values[0];
  }

  if (elements[0] === document) {
    throw new Error("Cannot process document as an element");
  }

  const values = elements.map((element) =>
    processElement($(element) as JQuery, normalizedSelector),
  );
  return multi ? values : values[0];
}

export async function readJQuery(
  reader: JQueryConfig,
  root: HTMLElement | Document = document,
): Promise<Record<string, Result>> {
  const { selectors } = reader;
  if (!root) {
    throw new Error("jQuery reader requires the document or element(s)");
  }

  return asyncMapValues(selectors, async (selector) => select(selector, root));
}

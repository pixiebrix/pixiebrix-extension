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

import { ReaderOutput } from "@/core";
import { asyncMapValues, waitFor } from "@/utils";
import { BusinessError, MultipleElementsFoundError } from "@/errors";
import { $safeFind } from "@/helpers";

type CastType = "string" | "boolean" | "number";

interface SingleSelector {
  multi?: boolean;
  attr?: string;
  data?: string;
  contents?: string;
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText
  renderedText?: boolean;
  type?: CastType;
}

interface ChildrenSelector {
  multi?: boolean;
  find?: SelectorMap;
}

type CommonSelector = ChildrenSelector | SingleSelector;

type Selector = CommonSelector & {
  selector?: string;

  // Block until the element is available
  maxWaitMillis?: number;
};

export type SelectorMap = Record<string, string | Selector>;

type Result =
  | string
  | number
  | boolean
  | null
  | undefined
  | Result[]
  | { [key: string]: Result };

export interface JQueryConfig {
  type: "jquery";
  selectors: SelectorMap;
}

function cleanValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function castValue(value: string, type?: CastType): Result {
  switch (type) {
    case "boolean":
      return Boolean(value);
    case "number":
      return Number(value);
    case undefined:
    case null:
    case "string":
      return value;
    default:
      throw new BusinessError(`Cast type ${type as string} not supported`);
  }
}

async function processFind(
  element: HTMLElement | Document,
  selector: ChildrenSelector
): Promise<Record<string, Result>> {
  return asyncMapValues(selector.find, async (selector) =>
    select(selector, element)
  );
}

function processElement($elt: JQuery, selector: SingleSelector) {
  const CONTENT_TYPES: Record<string, number | undefined> = {
    text: Node.TEXT_NODE,
    comment: Node.COMMENT_NODE,
  };

  let value;
  if (selector.attr) {
    value = $elt.attr(selector.attr);
  } else if (selector.contents) {
    const nodeType = CONTENT_TYPES[selector.contents];
    if (!nodeType) {
      throw new BusinessError(
        "Invalid contents argument, must be either 'text' or 'comment'"
      );
    }

    // https://stackoverflow.com/questions/14248519/jquery-text-equivalent-that-converts-br-tags-to-whitespace
    value = cleanValue(
      $elt
        .contents()
        .filter(function () {
          return this.nodeType === nodeType;
        })
        .text()
    );
  } else if (selector.data) {
    value = $elt.data(selector.data);
  } else if ($elt.is("input,select,textarea")) {
    value = $elt.val();
  } else if (selector.renderedText) {
    const $clone = $elt.clone();
    $clone.find("br").replaceWith("\n");
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- TODO: May be unnecessary
    value = $clone.get(0).innerText;
  } else {
    value = cleanValue($elt.text());
  }

  return castValue(value, selector.type);
}

async function select(
  selector: string | Selector,
  root?: HTMLElement | Document
): Promise<Result> {
  const normalizedSelector =
    typeof selector === "string" ? { selector } : selector;
  const {
    selector: selectorString,
    multi = false,
    maxWaitMillis = 0,
  } = normalizedSelector;

  if (!selectorString || !selectorString.trim()) {
    return multi ? [] : undefined;
  }

  if (!root && !selectorString) {
    throw new BusinessError(
      "'selector' required if not nested within a 'find' block"
    );
  }

  const findElements = () => {
    const $elt = selectorString ? $safeFind(selectorString, root) : $(root);
    if ($elt.length > 0 || multi) {
      return $elt.get();
    }
  };

  const elements =
    (await waitFor(findElements, {
      maxWaitMillis,
      intervalMillis: 50,
    })) ?? [];

  if (elements.length === 0) {
    console.debug(
      `Did not find any elements for selector in ${maxWaitMillis}ms: ${selectorString}`,
      { root, selector }
    );

    if (maxWaitMillis) {
      throw new BusinessError(
        `Did not find any elements for selector in ${maxWaitMillis}ms: ${selectorString}`
      );
    }

    return multi ? [] : undefined;
  }

  if (elements.length > 1 && !multi) {
    throw new MultipleElementsFoundError(
      selectorString,
      "Multiple elements found for selector. To return a list of values, supply multi=true"
    );
  }

  if ("find" in normalizedSelector) {
    const values = elements.map(async (element) =>
      processFind(element, normalizedSelector)
    );
    return multi ? Promise.all(values) : values[0];
  }

  if (elements[0] === document) {
    throw new Error("Cannot process document as an element");
  }

  const values = elements.map((element) =>
    processElement($(element) as JQuery, normalizedSelector)
  );
  return multi ? values : values[0];
}

export async function readJQuery(
  reader: JQueryConfig,
  root: HTMLElement | Document = document
): Promise<ReaderOutput> {
  const { selectors } = reader;
  if (!root) {
    throw new Error("jQuery reader requires the document or element(s)");
  }

  return asyncMapValues(selectors, async (selector) => select(selector, root));
}

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

import mapValues from "lodash/mapValues";
import { ReaderOutput } from "@/core";
import { registerFactory } from "@/blocks/readers/factory";

type CastType = "string" | "boolean" | "number";

interface SingleSelector {
  multi?: boolean;
  attr?: string;
  data?: string;
  contents?: string;
  type?: CastType;
}

interface ChildrenSelector {
  multi?: boolean;
  find?: SelectorMap;
}

type CommonSelector = ChildrenSelector | SingleSelector;

type Selector = CommonSelector & {
  selector?: string;
};

type SelectorMap = { [key: string]: string | Selector };

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
      throw new Error(`Cast type ${type} not supported`);
  }
}

function processFind(
  $elt: JQuery,
  selector: ChildrenSelector
): { [key: string]: Result } {
  return mapValues(selector.find, (selector) => select(selector, $elt));
}

function processElement($elt: JQuery, selector: SingleSelector) {
  const CONTENT_TYPES: { [key: string]: number | undefined } = {
    text: Node.TEXT_NODE,
    comment: Node.COMMENT_NODE,
  };

  let value;
  if (selector.attr) {
    value = $elt.attr(selector.attr);
  } else if (selector.contents) {
    const nodeType = CONTENT_TYPES[selector.contents];
    if (!nodeType) {
      throw new Error(
        "Invalid contents argument, must be either 'text' or 'comment'"
      );
    }
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
  } else {
    value = cleanValue($elt.text());
  }
  return castValue(value, selector.type);
}

function select(selector: string | Selector, $root?: JQuery): Result {
  const commonSelector: Selector =
    typeof selector === "string" ? { selector } : selector;

  let $elt;
  if ($root) {
    $elt = commonSelector.selector
      ? $($root).find(commonSelector.selector)
      : $($root);
  } else {
    if (!commonSelector.selector) {
      throw new Error(
        "'selector' required if not nested within a 'find' block"
      );
    }
    $elt = $(commonSelector.selector);
  }

  if ($elt.length === 0) {
    return commonSelector.multi ? [] : undefined;
  } else if ($elt.length > 1 && !commonSelector.multi) {
    throw new Error(
      `Multiple elements found for ${commonSelector.selector}. To return a list of values, supply multi=true`
    );
  } else {
    const processor = "find" in commonSelector ? processFind : processElement;
    const values = $elt
      .map(function () {
        return processor($(this), commonSelector);
      })
      .toArray();
    return commonSelector.multi ? values : values[0];
  }
}

async function read(reader: JQueryConfig): Promise<ReaderOutput> {
  const { selectors } = reader;
  return mapValues(selectors, (x) => select(x));
}

registerFactory("jquery", read);

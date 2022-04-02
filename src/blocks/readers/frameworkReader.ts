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

import { Read } from "@/blocks/readers/factory";
import { Framework } from "@/messaging/constants";
import { ReaderOutput, ReaderRoot } from "@/core";
import { castArray, compact } from "lodash";
import { getComponentData, ReadPayload } from "@/pageScript/protocol";

export type FrameworkConfig = ReadPayload & {
  /**
   * @deprecated Legacy emberjs reader config. Use pathSpec instead
   */
  attrs?: string | string[];
};

export function isHTMLElement(root: ReaderRoot): root is HTMLElement {
  return root && root !== document;
}

async function asyncFastCssSelector(element: HTMLElement): Promise<string> {
  const { getCssSelector } = await import(
    /* webpackChunkName: "css-selector-generator" */
    "css-selector-generator"
  );
  return getCssSelector(element, {
    // Prefer speed over robust/readable selectors
    combineWithinSelector: false,
    combineBetweenSelectors: false,
  });
}

function elementSelector(rootSelector: string | null, selector: string | null) {
  const rawParts = compact([rootSelector, selector]);
  const parts = rawParts.length > 0 ? rawParts : ["body"];
  return compact(parts).join(" ");
}

export function frameworkReadFactory(
  framework: Framework
): Read<FrameworkConfig> {
  async function read(
    reader: FrameworkConfig,
    root: ReaderRoot
  ): Promise<ReaderOutput> {
    const {
      selector,
      rootProp,
      waitMillis,
      traverseUp,
      optional,
      attrs: attributes,
      pathSpec,
    } = reader;

    // Selector to uniquely identify the root (because we can't pass the element itself between the content script
    // and the page script)
    const rootSelector = isHTMLElement(root)
      ? await asyncFastCssSelector(root)
      : null;

    return getComponentData({
      framework,
      selector: elementSelector(rootSelector, selector),
      rootProp,
      waitMillis,
      optional,
      traverseUp,
      pathSpec: attributes
        ? Object.fromEntries(
            castArray(attributes).map((attribute) => [
              attribute,
              `attrs.${attribute}`,
            ])
          )
        : pathSpec,
    });
  }

  return read;
}

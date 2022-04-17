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

import { Framework } from "@/messaging/constants";
import adapters from "@/frameworks/adapters";
import { isEmpty, uniq } from "lodash";
import {
  inferSelectors,
  inferSelectorsIncludingStableAncestors,
} from "@/contentScript/nativeEditor/infer";
import { ElementInfo } from "@/contentScript/nativeEditor/types";

export async function elementInfo(
  element: HTMLElement,
  componentFramework?: Framework,
  selectors: string[] = [],
  traverseUp = 0
): Promise<ElementInfo> {
  if (traverseUp < 0 || !element) {
    return undefined;
  }

  console.debug(`elementInfo: building element info for ${element.tagName}`, {
    element,
    selectors,
  });

  const inferredSelectors = uniq([
    ...(selectors ?? []),
    ...inferSelectorsIncludingStableAncestors(element),
  ]);

  console.debug(`elementInfo: inferred selectors for ${element.tagName}`, {
    inferredSelectors,
  });

  for (const [framework, adapter] of adapters.entries()) {
    if (componentFramework && framework !== componentFramework) {
      console.debug(
        `Skipping other framework ${framework} (expected ${componentFramework})`
      );
      continue;
    }

    let component;

    try {
      component = adapter.getComponent(element);
    } catch (error) {
      console.debug("Could not get component information", { error });
    }

    if (component) {
      return {
        selectors: inferredSelectors,
        framework,
        tagName: element.tagName,
        hasData: !isEmpty(adapter.getData(component)),
        // eslint-disable-next-line no-await-in-loop -- It's only awaited once per loop
        parent: await elementInfo(
          element.parentElement,
          framework,
          [],
          traverseUp - 1
        ),
      };
    }

    console.debug(`No component found for ${framework}`);
  }

  return {
    selectors: inferredSelectors,
    framework: null,
    hasData: false,
    tagName: element.tagName,
    parent: await elementInfo(element.parentElement, null, [], traverseUp - 1),
  };
}

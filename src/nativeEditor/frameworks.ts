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

import { Framework } from "@/messaging/constants";
import adapters from "@/frameworks/adapters";
import { uniq, isEmpty } from "lodash";
import { inferSelectors } from "@/nativeEditor/infer";

export interface ElementInfo {
  selectors: string[];
  framework: Framework;
  tagName: string;
  hasData: boolean;
  parent?: ElementInfo;
}

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
    ...inferSelectors(element),
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

    const component = adapter.getComponent(element);

    if (component) {
      return {
        selectors: inferredSelectors,
        framework: framework as Framework,
        tagName: element.tagName,
        hasData: !isEmpty(adapter.getData(component)),
        parent: await elementInfo(
          element.parentElement,
          framework as Framework,
          [],
          traverseUp - 1
        ),
      };
    } else {
      console.debug(`No component found for ${framework}`);
    }
  }

  return {
    selectors: inferredSelectors,
    framework: null,
    hasData: false,
    tagName: element.tagName,
    parent: await elementInfo(element.parentElement, null, [], traverseUp - 1),
  };
}

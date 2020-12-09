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
import { ignoreNotFound } from "@/frameworks/errors";

export interface ElementInfo {
  selectors: string[];
  framework: Framework;
  tagName: string;
  hasData: boolean;
  owner: ElementInfo | undefined;
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

  console.debug(`Creating element info for ${element.tagName} element`, {
    element,
  });

  for (const [framework, adapter] of Object.entries(adapters)) {
    if (componentFramework && framework !== componentFramework) {
      console.debug(
        `Skipping other framework ${framework} (expected ${componentFramework})`
      );
      continue;
    }

    const component = adapter.elementComponent(element);

    if (component) {
      return {
        selectors: uniq([...(selectors ?? []), ...inferSelectors(element)]),
        framework: framework as Framework,
        tagName: element.tagName,
        hasData: !isEmpty(adapter.getData(component)),
        owner: null,
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

    const ownerElement = ignoreNotFound(() => adapter.getOwner(element));

    if (ownerElement && ownerElement !== element) {
      const ownerComponent = adapter.elementComponent(ownerElement);

      return {
        selectors: uniq([...(selectors ?? []), ...inferSelectors(element)]),
        framework: framework as Framework,
        tagName: element.tagName,
        hasData: component ? !isEmpty(adapter.getData(component)) : false,
        parent: await elementInfo(
          element.parentElement,
          framework as Framework,
          [],
          traverseUp - 1
        ),
        owner: {
          selectors: inferSelectors(ownerElement),
          hasData: ownerComponent
            ? !isEmpty(adapter.getData(ownerComponent))
            : false,
          framework: framework as Framework,
          tagName: ownerElement.tagName,
          parent: await elementInfo(
            ownerElement.parentElement,
            framework as Framework,
            [],
            traverseUp - 1
          ),
          owner: null,
        },
      };
    }
  }

  return {
    selectors: uniq([...(selectors ?? []), ...inferSelectors(element)]),
    framework: null,
    hasData: false,
    tagName: element.tagName,
    owner: null,
    parent: await elementInfo(element.parentElement, null, [], traverseUp - 1),
  };
}

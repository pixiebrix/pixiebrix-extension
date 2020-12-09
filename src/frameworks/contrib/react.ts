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

import { pickBy } from "lodash";
import { ComponentNotFoundError, ignoreNotFound } from "@/frameworks/errors";
import { RootInstanceVisitor } from "@/frameworks/scanner";
import { ReadableComponentAdapter } from "@/frameworks/component";

interface RootInstance {
  _reactRootContainer: unknown;
}

interface DOMFiber {
  _instance: any;
  _currentElement: {
    _owner: DOMFiber;
  };
}

interface ComponentFiber {
  return: ComponentFiber;
  memoizedProps: { [key: string]: unknown };
  stateNode: HTMLElement;
}

export function isComponent(element: HTMLElement): boolean {
  return Object.keys(element).some((key) =>
    key.startsWith("__reactInternalInstance$")
  );
}

export function readReactProps(
  fiber: ComponentFiber,
  rootProp?: string
): Record<string, unknown> {
  // getComponentFiber is already returning the "return" for the component
  const memoizedProps = fiber.memoizedProps;
  console.debug("Memoized props", memoizedProps);
  const props = rootProp ? memoizedProps[rootProp] : memoizedProps;
  return pickBy(
    props as Record<string, unknown>,
    (value, key) => key !== "children"
  );
}

function getComponentFiber(fiber: any): ComponentFiber {
  // react 16+
  // return fiber._debugOwner; // this also works, but is __DEV__ only
  let parentFiber = fiber.return;
  while (typeof parentFiber.type == "string") {
    parentFiber = parentFiber.return;
  }
  return parentFiber;
}

export function findReactComponent(
  element: HTMLElement,
  traverseUp = 0
): ComponentFiber {
  // https://stackoverflow.com/questions/29321742/react-getting-a-component-from-a-dom-element-for-debugging
  // https://stackoverflow.com/a/39165137/402560

  const key = Object.keys(element).find((key) =>
    key.startsWith("__reactInternalInstance$")
  );

  // @ts-ignore: types match based on the check above
  const domFiber: DOMFiber | null = element[key];

  if (domFiber == null) {
    throw new ComponentNotFoundError("React fiber not found for element");
  }

  if (domFiber._currentElement) {
    // react <16
    let componentFiber = domFiber._currentElement._owner;
    for (let i = 0; i < traverseUp; i++) {
      componentFiber = componentFiber._currentElement._owner;
    }
    return componentFiber._instance;
  } else {
    let componentFiber = getComponentFiber(domFiber);
    for (let i = 0; i < traverseUp; i++) {
      componentFiber = getComponentFiber(componentFiber);
    }
    return componentFiber;
  }
}

export class ReactRootVisitor implements RootInstanceVisitor<RootInstance> {
  public rootInstances: RootInstance[] = [];
  visit(node: Element | Node): boolean {
    if ("_reactRootContainer" in node) {
      this.rootInstances.push(node);
      return false;
    }
    return true;
  }
}

export const adapter: ReadableComponentAdapter<ComponentFiber> = {
  isComponent,
  elementComponent: (element) =>
    ignoreNotFound(() => findReactComponent(element, 0)),
  getOwner: (element) => findReactComponent(element).stateNode,
  getData: (component) => readReactProps(component),
};

export default adapter;

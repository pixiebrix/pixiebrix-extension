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

import { pickBy } from "lodash";
import { ComponentNotFoundError, ignoreNotFound } from "@/frameworks/errors";
import { RootInstanceVisitor } from "@/frameworks/scanner";
import { ReadableComponentAdapter, traverse } from "@/frameworks/component";
import { isNode } from "@/frameworks/dom";

// React architecture references:
// https://github.com/acdlite/react-fiber-architecture
// https://indepth.dev/posts/1008/inside-fiber-in-depth-overview-of-the-new-reconciliation-algorithm-in-react#memoizedprops
// https://github.com/Venryx/mobx-devtools-advanced/blob/master/Docs/TreeTraversal.md
// https://stackoverflow.com/questions/29321742/react-getting-a-component-from-a-dom-element-for-debugging

interface RootInstance {
  _reactRootContainer: unknown;
}

/**
 * Structure from:
 * - https://github.com/facebook/react/blob/50d9451f320a9aaf94304209193562cc385567d8/packages/react-devtools-shared/src/backend/legacy/renderer.js#L739
 * - https://github.com/facebook/react/blob/v15.0.0/src/renderers/shared/reconciler/ReactReconciler.js
 */
interface LegacyInstance {
  /**
   * Public instance
   */
  _instance: unknown;

  _currentElement: {
    _owner: LegacyInstance;
  };
}

/**
 * Type definition from: https://github.com/facebook/react/blob/4c6470cb3b821f3664955290cd4c4c7ac0de733a/packages/react-reconciler/src/ReactInternalTypes.js#L62
 */
interface Fiber {
  /**
   * The Fiber to return to after finishing processing this one.
   * This is effectively the parent, but there can be multiple parents (two)
   * so this is only the parent of the thing we're currently processing.
   * It is conceptually the same as the return address of a stack frame.
   */
  return: Fiber | null;

  /**
   * The props used to create the output.
   */
  memoizedProps: Record<string, unknown>;

  /**
   * The resolved function/class associated with this fiber.
   */
  type: string | Record<string, unknown>;

  /**
   * The local state associated with this fiber.
   */
  stateNode: Node | Record<string, unknown>;
}

export function isManaged(node: Node): boolean {
  return Object.keys(node).some((key) =>
    key.startsWith("__reactInternalInstance$")
  );
}

export function hasReactProps(fiber: Fiber): boolean {
  return Object.keys(fiber.memoizedProps).some((x) => x !== "children");
}

export function readReactProps(fiber: Fiber): Record<string, unknown> {
  return pickBy(fiber.memoizedProps, (value, key) => key !== "children");
}

function getComponentFiber(fiber: Fiber): Fiber {
  // Return fiber._debugOwner; // this also works, but is __DEV__ only
  let parentFiber = fiber.return;
  while (typeof parentFiber.type === "string") {
    // String for HTML nodes, so traverse
    parentFiber = parentFiber.return;
  }

  return parentFiber;
}

export function findReactComponent(node: Node, traverseUp = 0): Fiber {
  // https://stackoverflow.com/a/39165137/402560
  const key = Object.keys(node).find((key) =>
    key.startsWith("__reactInternalInstance$")
  );

  const domFiber: Fiber | LegacyInstance | null = (node as any)[key];

  if (domFiber == null) {
    throw new ComponentNotFoundError("React fiber not found for element");
  }

  if ("_currentElement" in domFiber) {
    // FIXME: test this for React <16
    const owner = (x: LegacyInstance) => x._currentElement._owner;
    const fiber = traverse(owner, owner(domFiber), traverseUp);
    return fiber._instance as Fiber;
  }

  return traverse(getComponentFiber, getComponentFiber(domFiber), traverseUp);
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

export const adapter: ReadableComponentAdapter<Fiber> = {
  isManaged,
  getComponent: (node) => ignoreNotFound(() => findReactComponent(node, 0)),
  getParent: getComponentFiber,
  getNode: (instance) =>
    isNode(instance.stateNode) ? instance.stateNode : null,
  getData: readReactProps,
  hasData: hasReactProps,
};

export default adapter;

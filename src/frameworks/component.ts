/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { ReadProxy } from "@/runtime/pathHelpers";

type ComponentData = Record<string, unknown>;

export function traverse<T = unknown>(
  next: (current: T) => T | null,
  source: T,
  count: number
): T | null {
  let current = source;
  for (let i = 0; i < count && current; i++) {
    current = next(current);
  }

  return current;
}

// Object required for WeakSet
// eslint-disable-next-line @typescript-eslint/ban-types
export function traverseUntil<T extends object>(
  source: T,
  match: (element: T) => boolean,
  next: (current: T) => T | null,
  maxTraverse: number = Number.POSITIVE_INFINITY
): T | null {
  let current = source;
  // Detect cycles
  const visited = new WeakSet<T>();
  let cnt = 0;
  while (
    current != null &&
    !match(current) &&
    !visited.has(current) &&
    cnt <= maxTraverse
  ) {
    visited.add(current);
    current = next(current);
    cnt++;
  }

  return current;
}

export interface TreeAdapter<TComponent = unknown> {
  /**
   * Return the parent instance, or null for root components.
   */
  getParent: (instance: TComponent) => TComponent | null;
}

export interface ComponentAdapter<TComponent = unknown> {
  /**
   * Returns true if the DOM node is managed by the framework.
   */
  isManaged: (node: Node) => boolean;

  /**
   * Returns the component that manages the DOM node, or null if the node is unmanaged.
   */
  getComponent: (node: Node) => TComponent | null;

  /**
   * Returns the DOM node for the component, or null if it does not correspond to a node.
   */
  getNode: (instance: TComponent) => Node | null;
}

export interface ReadAdapter<
  TComponent = unknown,
  TData extends ComponentData = ComponentData
> {
  /**
   * Returns the data defined for the component.
   */
  getData: (component: TComponent) => TData;

  /**
   * Returns true if there is data defined for the component
   * @param component
   */
  hasData: (component: TComponent) => boolean;

  /**
   * Proxy for reading/traversing objects in the data
   */
  proxy?: ReadProxy;
}

export interface WriteAdapter<
  TComponent = unknown,
  TData extends ComponentData = ComponentData
> {
  /**
   * Set data on a component in framework
   */
  setData: (component: TComponent, values: Partial<TData>) => void;
}

export type ReadableComponentAdapter<
  TComponent = unknown,
  TData extends ComponentData = ComponentData
> = TreeAdapter<TComponent> &
  ComponentAdapter<TComponent> &
  ReadAdapter<TComponent, TData>;

export type WriteableComponentAdapter<
  TComponent = unknown,
  TData extends ComponentData = ComponentData
> = ReadableComponentAdapter<TComponent, TData> &
  WriteAdapter<TComponent, TData>;

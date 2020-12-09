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

export interface GetOwnerOptions {
  maxTraverseUp?: number;
}

export function traverse<T extends object>(
  src: T,
  match: (element: T) => boolean,
  next: (current: T) => T | null,
  maxTraverse?: number
): T | null {
  let current = src;
  // prevent infinite loops when maxTraverse isn't set
  const seen = new WeakSet<T>([current]);
  let cnt = 0;
  while (current != null && !match(current) && !seen.has(current)) {
    if (maxTraverse != null && cnt >= maxTraverse) {
      return undefined;
    }
    current = next(current);
    seen.add(current);
    cnt++;
  }
  return current;
}

type ComponentData = object;

export interface ComponentAdapter<TComponent = unknown> {
  /**
   * true if the the element is managed by the framework
   */
  isComponent: (element: HTMLElement) => boolean;

  /**
   * Return the component directly associated with the element
   */
  elementComponent: (element: HTMLElement) => TComponent | null;

  /**
   * Get the HTML element that manages the component
   */
  getOwner: (
    element: HTMLElement,
    options?: GetOwnerOptions
  ) => HTMLElement | null;
}

export interface ReadAdapter<
  TComponent = unknown,
  TData extends ComponentData = ComponentData
> {
  /**
   * Read data from a component in the framework
   */
  getData: (component: TComponent) => TData;
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
> = ComponentAdapter<TComponent> & ReadAdapter<TComponent, TData>;

export type WriteableComponentAdapter<
  TComponent = unknown,
  TData extends ComponentData = ComponentData
> = ReadableComponentAdapter<TComponent, TData> &
  WriteAdapter<TComponent, TData>;

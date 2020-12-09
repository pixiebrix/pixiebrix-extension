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
import { ReadableComponentAdapter, traverse } from "@/frameworks/component";
import { FrameworkNotFound, ignoreNotFound } from "@/frameworks/errors";

declare global {
  interface Window {
    angular?: {
      version: {
        full: string;
      };
      element: (
        element: HTMLElement
      ) => {
        scope: () => Scope;
      };
    };
  }
}

type Scope = Record<string, unknown>;

interface AngularElement {
  scope: () => Scope;
}

export function getVersion(): string | null {
  return window.angular?.version?.full;
}

export function getComponent(element: HTMLElement): AngularElement | null {
  if (!window.angular) {
    throw new FrameworkNotFound("Angular not found");
  }
  return (window.angular.element(element) as any) as AngularElement;
}

export function isComponent(element: HTMLElement): boolean {
  return !!ignoreNotFound(() => getComponent(element));
}

const adapter: ReadableComponentAdapter<AngularElement, Scope> = {
  isComponent,
  elementComponent: (element) => ignoreNotFound(() => getComponent(element)),
  getOwner: (element, options) =>
    traverse(
      element,
      isComponent,
      (x) => x.parentElement,
      options?.maxTraverseUp
    ),
  getData: (instance) => {
    return pickBy(
      instance.scope(),
      (value, key) =>
        typeof value !== "function" &&
        !key.startsWith("$$") &&
        !key.startsWith("$")
    );
  },
};

export default adapter;

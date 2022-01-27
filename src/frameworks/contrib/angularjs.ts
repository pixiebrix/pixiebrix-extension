/* eslint-disable filenames/match-exported */
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

// Resources:
// angularjs: https://docs.angularjs.org/api/ng/function/angular.element

import { pickBy, isEmpty } from "lodash";
import { ReadableComponentAdapter } from "@/frameworks/component";
import { FrameworkNotFound, ignoreNotFound } from "@/frameworks/errors";

declare global {
  interface Window {
    angular?: {
      version: {
        full: string;
      };
      element: (element: Node) => AngularElement | null;
    };
  }
}

type Scope = Record<string, unknown>;

/**
 * See: https://docs.angularjs.org/api/ng/function/angular.element
 */
interface AngularElement {
  /**
   * Retrieves the scope of the current element or its parent. Requires Debug Data to be enabled.
   * https://docs.angularjs.org/api/ng/type/$rootScope.Scope
   */
  scope: () => Scope;
  parent: () => AngularElement;

  // It's actually jqLite instance, so we can grab it
  0: Node;
}

export function getVersion(): string | null {
  return window.angular?.version?.full;
}

export function getComponent(node: Node): AngularElement | null {
  if (!window.angular) {
    throw new FrameworkNotFound("Angular not found");
  }

  return window.angular.element(node);
}

export function isManaged(element: HTMLElement): boolean {
  return Boolean(ignoreNotFound(() => getComponent(element)));
}

function getAngularData(instance: AngularElement): Scope {
  return pickBy(
    instance.scope(),
    (value, key) =>
      typeof value !== "function" &&
      !key.startsWith("$$") &&
      !key.startsWith("$")
  );
}

const adapter: ReadableComponentAdapter<AngularElement, Scope> = {
  isManaged,
  getComponent: (node) => ignoreNotFound(() => getComponent(node)),
  getParent: (instance) => instance.parent(),
  getNode: (instance) => instance[0],
  hasData: (instance) => !isEmpty(getAngularData(instance)),
  getData: getAngularData,
};

export default adapter;

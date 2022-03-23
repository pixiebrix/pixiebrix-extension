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

// Adapted from the vue-devtools
// https://github.com/vuejs/vue-devtools/blob/6d8fee4d058716fe72825c9ae22cf831ef8f5172/packages/app-backend/src/index.js#L185
// https://github.com/vuejs/vue-devtools/blob/dev/packages/app-backend/src/utils.js

import { pickBy, isEmpty, set } from "lodash";
import { RootInstanceVisitor } from "@/frameworks/scanner";
import { WriteableComponentAdapter } from "@/frameworks/component";

declare global {
  interface Window {
    Vue?: {
      version: string;
    };
  }
}

interface BaseVue {
  super?: BaseVue;
  config: unknown;
}

interface Instance {
  /**
   * The root component instance of the current component tree. If the current instance has no parents this
   * value will be itself.
   */
  $root: Instance;

  /**
   * The root DOM element that the component instance is managing.
   * https://v3.vuejs.org/api/instance-properties.html#el
   */
  $el: Element;

  /**
   * The data object that the component instance is observing. The component instance proxies access
   * to the properties on its data object.
   * https://v3.vuejs.org/api/instance-properties.html#data
   */
  $data: Record<string, unknown>;

  /**
   * The parent instance, if the current instance has one.
   * https://v3.vuejs.org/api/instance-properties.html#parent
   */
  $parent: Instance | null;

  _isFragment: boolean;
  constructor: BaseVue;
  _fragmentEnd?: unknown;
}

interface VueHTMLElement {
  __vue__: Instance;
}

// Interface VNode {
//   _isVue: boolean;
//   $el: HTMLElement;
// }

export class VueRootVisitor implements RootInstanceVisitor<Instance> {
  public rootInstances: Instance[] = [];

  private inFragment = false;

  private currentFragment: Instance = null;

  private processInstance(instance: Instance): boolean {
    if (instance) {
      if (!this.rootInstances.includes(instance.$root)) {
        instance = instance.$root;
      }

      if (instance._isFragment) {
        this.inFragment = true;
        this.currentFragment = instance;
      }

      let baseVue = instance.constructor;
      while (baseVue.super) {
        baseVue = baseVue.super;
      }

      if (baseVue.config) {
        this.rootInstances.push(instance);
      }

      return true;
    }

    return false;
  }

  visit(node: Node | Element): boolean {
    if (this.inFragment) {
      if (node === this.currentFragment._fragmentEnd) {
        this.inFragment = false;
        this.currentFragment = null;
      }

      return true;
    }

    const instance = (node as any).__vue__;
    return this.processInstance(instance);
  }
}

export function getVersion(): string | null {
  return window.Vue?.version;
}

export function isManaged(
  element: HTMLElement
): element is HTMLElement & VueHTMLElement {
  return "__vue__" in element;
}

// https://github.com/vuejs/vue-devtools/blob/ccf6808e78a25ecaef2577d25b1d3643f524b240/packages/app-backend/src/utils.js
export function findRelatedComponent(element: HTMLElement): Instance | null {
  while (!isManaged(element) && element.parentElement) {
    element = element.parentElement;
  }

  return isManaged(element) ? element.__vue__ : null;
}

function readVueData(instance: Instance): Record<string, unknown> {
  // TODO: might want to read from $data here also
  return pickBy(
    instance,
    (value, key) =>
      typeof value !== "function" &&
      !key.startsWith("$") &&
      !key.startsWith("_")
  );
}

const adapter: WriteableComponentAdapter<Instance> = {
  isManaged,
  getComponent: findRelatedComponent,
  getNode: (instance: Instance) => instance.$el,
  getParent: (instance: Instance) => instance.$parent,
  hasData: (instance: Instance) => !isEmpty(instance),
  getData: readVueData,
  setData(instance: Instance, data) {
    for (const [path, value] of Object.entries(data)) {
      set(instance, path, value);
    }
  },
};

export default adapter;

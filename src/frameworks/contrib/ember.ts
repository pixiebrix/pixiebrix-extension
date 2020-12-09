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

import { mapValues, partial, unary } from "lodash";
import { isPrimitive } from "@/utils";
import { ReadableComponentAdapter, traverse } from "@/frameworks/component";
import { FrameworkNotFound, ignoreNotFound } from "@/frameworks/errors";

interface EmberComponent {
  attrs: Record<string, unknown>;
}

interface EmberApplication {
  __container__: {
    lookup: (container: string) => { [componentId: string]: EmberComponent };
  };
}

declare global {
  interface Window {
    Ember?: {
      VERSION: string;
      Application: EmberApplication;
      Namespace: {
        NAMESPACES: any;
      };
      A: (namespaces: any) => unknown[];
    };
  }
}

export function getVersion(): string | null {
  return window.Ember?.VERSION;
}

export function getEmberApplication(): EmberApplication {
  // https://stackoverflow.com/questions/32971707/how-to-access-the-ember-data-store-from-the-console
  if (window.Ember) {
    const Ember = window.Ember;
    // https://github.com/emberjs/ember-inspector/blob/2237dc1b4818e31a856f3348f35305b10f42f60a/ember_debug/vendor/startup-wrapper.js#L201
    const namespaces = Ember.A(Ember.Namespace.NAMESPACES);
    // TODO: support multiple Ember applications on the page
    return namespaces.filter(
      (namespace) => namespace instanceof (Ember.Application as any)
    )[0] as EmberApplication;
  } else {
    return undefined;
  }
}

export function getEmberComponentById(componentId: string): EmberComponent {
  const app = getEmberApplication();
  if (!app) {
    throw new FrameworkNotFound("Ember application not found");
  }
  return app.__container__.lookup("-view-registry:main")[componentId];
}

export function readEmberValueFromCache(
  value: any,
  maxDepth = 5,
  depth = 0
): unknown {
  const recurse = partial(
    readEmberValueFromCache,
    partial.placeholder,
    maxDepth,
    depth + 1
  );

  if (depth >= maxDepth) {
    return undefined;
  } else if (isPrimitive(value)) {
    return value;
  } else if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "value")) {
      return recurse(value.value);
    } else if (Object.prototype.hasOwnProperty.call(value, "_cache")) {
      return recurse(value._cache);
    } else if (Array.isArray(value.content)) {
      return value.content.map(recurse);
    } else {
      return mapValues(value, recurse);
    }
  } else if (Array.isArray(value)) {
    return value.map(recurse);
  } else {
    // ignore functions and symbols
    return undefined;
  }
}

function isComponent(element: HTMLElement): boolean {
  return !!ignoreNotFound(() => getEmberComponentById(element.id));
}

const adapter: ReadableComponentAdapter<EmberComponent> = {
  isComponent,
  elementComponent: (element) =>
    ignoreNotFound(() => getEmberComponentById(element.id)),
  getOwner: (element, options?) =>
    traverse(
      element,
      isComponent,
      (x) => x.parentElement,
      options?.maxTraverseUp
    ),
  getData: (component) => {
    console.debug("component", { component, attrs: component.attrs });
    return mapValues(component.attrs, unary(readEmberValueFromCache));
  },
};

export default adapter;

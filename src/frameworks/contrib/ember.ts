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

import { mapValues, partial, unary, identity } from "lodash";
import { isGetter, isPrimitive } from "@/utils";
import { ReadableComponentAdapter } from "@/frameworks/component";
import { FrameworkNotFound, ignoreNotFound } from "@/frameworks/errors";
import { findElement } from "@/frameworks/dom";

interface EmberObject {
  // https://api.emberjs.com/ember/release/classes/EmberObject/methods?anchor=get
  attrs: Record<string, unknown>;
  parentView: EmberObject | null;
  element: Node;
}

interface EmberApplication {
  __container__: {
    lookup: (container: string) => { [componentId: string]: EmberObject };
  };
}

interface MutableCell {
  value: unknown;
  items: unknown[];
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

export function getEmberComponentById(componentId: string): EmberObject {
  const app = getEmberApplication();
  if (!app) {
    throw new FrameworkNotFound("Ember application not found");
  }
  return app.__container__.lookup("-view-registry:main")[componentId];
}

function isMutableCell(cell: unknown): cell is MutableCell {
  // https://github.com/emberjs/ember.js/blob/f73d8440d19cf86a10c61ddb89d45881acfcf974/packages/%40ember/-internals/views/lib/compat/attrs.js
  // FIXME: field is actually a symbol and isn't enumerable, so this is probably wrong
  return Object.keys(cell).some((key) => key.startsWith("__MUTABLE_CELL__"));
}

export function getProp(value: any, prop: string | number): unknown {
  if (isPrimitive(value)) {
    return undefined;
  } else if (typeof value === "object") {
    if (isMutableCell(value) && "value" in value) {
      return getProp(value.value, prop);
    } else if ("_cache" in value) {
      return getProp(value._cache, prop);
    } else if (Array.isArray(value.content)) {
      return getProp(value.content, prop);
    } else if (typeof prop === "string" && isGetter(value, prop)) {
      return value[prop]();
    } else {
      return value[prop];
    }
  } else if (Array.isArray(value)) {
    if (typeof prop !== "number") {
      throw new Error("Expected number for prop because value is an array");
    }
    return value[prop];
  } else {
    // ignore functions and symbols
    return undefined;
  }
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
    if (isMutableCell(value) && "value" in value) {
      return recurse(value.value);
    } else if ("_cache" in value) {
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

function isManaged(node: Node): boolean {
  return !!ignoreNotFound(() => getEmberComponentById(findElement(node).id));
}

const adapter: ReadableComponentAdapter<EmberObject> = {
  isManaged,
  getComponent: (node) =>
    ignoreNotFound(() => getEmberComponentById(findElement(node).id)),
  getParent: (instance) => instance.parentView,
  getNode: (instance) => instance.element,
  getData: identity,
  proxy: {
    toJS: unary(readEmberValueFromCache),
    get: getProp,
  },
};

export default adapter;

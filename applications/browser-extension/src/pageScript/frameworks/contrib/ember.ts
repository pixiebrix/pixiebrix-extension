/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
// https://github.com/emberjs/ember-inspector/blob/d4f1fbb1ee30d178f81ce03bf8f037722bd4b166/ember_debug/object-inspector.js

import { mapValues, partial, unary } from "lodash";
import { type ReadableComponentAdapter } from "../component";
import {
  FrameworkNotFound,
  ignoreNotFound,
} from "../errors";
import { findElement } from "../dom";
import { isNullOrBlank } from "../../../utils/stringUtils";
import { getAllPropertyNames, isObject } from "../../../utils/objectUtils";
import { isPrimitive } from "../../../utils/typeUtils";

const EMBER_MAX_DEPTH = 5;

interface EmberObject {
  // https://api.emberjs.com/ember/release/classes/EmberObject/methods?anchor=get
  attrs: UnknownObject;
  parentView: EmberObject | null;
  element: Node;
}

type EmberApplication = {
  prototype: CharacterData;
  new (): CharacterData;
  __container__: {
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record<> doesn't allow labelled keys
    lookup: (container: string) => { [componentId: string]: EmberObject };
  };
};

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
        NAMESPACES: unknown;
      };
      A: (namespaces: unknown) => unknown[];
    };
  }
}

function getEmberApplication(): EmberApplication | undefined {
  // https://stackoverflow.com/questions/32971707/how-to-access-the-ember-data-store-from-the-console
  if (window.Ember) {
    const { Ember } = window;
    // https://github.com/emberjs/ember-inspector/blob/2237dc1b4818e31a856f3348f35305b10f42f60a/ember_debug/vendor/startup-wrapper.js#L201
    // eslint-disable-next-line new-cap -- Not a constructor
    const namespaces = Ember.A(Ember.Namespace.NAMESPACES);
    // TODO: support multiple Ember applications on the page
    return namespaces.find(
      (namespace) => namespace instanceof Ember.Application,
    ) as unknown as EmberApplication;
  }

  return undefined;
}

function getEmberComponentById(componentId: string): EmberObject | undefined {
  if (isNullOrBlank(componentId)) {
    throw new Error("componentId is required for getEmberComponentById");
  }

  const app = getEmberApplication();
  if (!app) {
    throw new FrameworkNotFound("Ember application not found");
  }

  return app.__container__.lookup("-view-registry:main")[componentId];
}

function isMutableCell(cell: unknown): cell is MutableCell {
  if (!isObject(cell)) {
    return false;
  }

  // As of Ember 4.6.0 this is not a real Symbol, so Object.keys should detect it. If they change it, this will stop working:
  // https://github.com/emberjs/ember.js/blob/55ffe6326f11efcaeb278cdf7e0f86543daa9f04/packages/%40ember/-internals/utils/lib/symbol.ts#L14-L26
  // https://github.com/emberjs/ember.js/blob/55ffe6326f11efcaeb278cdf7e0f86543daa9f04/packages/%40ember/-internals/views/lib/compat/attrs.ts#L1
  return Object.keys(cell).some((key) => key.startsWith("__MUTABLE_CELL"));
}

//
// _cache:
//     Primitive
//     | e.default:
//         content: e.EmbeddedMegaMorphicModel[]
//

function getProp(value: unknown, prop: string | number): unknown {
  if (isPrimitive(value)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (typeof prop !== "number") {
      throw new TypeError("Expected number for prop for array value");
    }

    return value[prop];
  }

  if (isObject(value)) {
    if (isMutableCell(value) && "value" in value) {
      return getProp(value.value, prop);
    }

    if ("_cache" in value) {
      return getProp(value._cache, prop);
    }

    if (Array.isArray(value.content)) {
      return getProp(value.content, prop);
    }

    const subValue = value[prop];
    if (typeof subValue === "function") {
      return subValue();
    }

    return subValue;
  }

  // ignore functions and symbols
  return undefined;
}

const EMBER_INTERNAL_PROPS = new Set([
  "renderer",
  "parentView",
  "store",
  "localStorage",
  "childViews",
  "elementId",
  "args",
  "_router",
]);

function pickExternalProps(obj: UnknownObject): UnknownObject {
  // Lodash's pickby was having issues with some getters
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !EMBER_INTERNAL_PROPS.has(key)),
  );
}

function readEmberValueFromCache(
  value: unknown,
  maxDepth = EMBER_MAX_DEPTH,
  depth = 0,
): unknown {
  const recurse = unary(
    partial(readEmberValueFromCache, partial.placeholder, maxDepth, depth + 1),
  );

  const traverse = unary(
    partial(readEmberValueFromCache, partial.placeholder, maxDepth, depth),
  );

  if (depth >= maxDepth) {
    return undefined;
  }

  if (isPrimitive(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    // Must come before typeof value === "object" check because arrays are objects
    return value.map((x) => traverse(x));
  }

  if (isObject(value)) {
    if (isMutableCell(value) && "value" in value) {
      return traverse(value.value);
    }

    if ("_cache" in value) {
      return traverse(value._cache);
    }

    if (Array.isArray(value.content)) {
      // Consider arrays a traverse because knowing the property name by itself isn't useful for anything
      return value.content.map((x: unknown) => traverse(x));
    }

    return mapValues(pickExternalProps(value), recurse);
  }

  // ignore functions and symbols
  return undefined;
}

function isManaged(node: Node): boolean {
  const elt = findElement(node);
  if (!elt) {
    throw new Error("Could not get DOM HTMLElement for node");
  }

  return Boolean(ignoreNotFound(() => getEmberComponentById(elt.id)));
}

/**
 * Returns the "target" of a (classic) component.
 * See: https://github.com/emberjs/ember-inspector/blob/d4f1fbb1ee30d178f81ce03bf8f037722bd4b166/ember_debug/libs/capture-render-tree.js
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Internal Ember types
function targetForComponent(component: any): UnknownObject {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- Internal Ember types
  return component._target || component._targetObject;
}

function isEmberElement(node: Node): boolean {
  return (
    node instanceof Element &&
    (node.getAttribute("id")?.startsWith("ember") ?? false)
  );
}

function findEmberElement(node: Node): Element | null {
  let current: Node | null = node;

  while (current != null && !isEmberElement(current)) {
    current = current.parentNode;
  }

  if (current == null || !isEmberElement(current)) {
    return null;
  }

  return current as Element;
}

const adapter: ReadableComponentAdapter<EmberObject> = {
  isManaged,
  getComponent(node): EmberObject | null {
    const elt = findEmberElement(node);
    if (!elt) {
      throw new Error("No Ember component associated with the DOM node");
    }

    return ignoreNotFound(() => getEmberComponentById(elt.id) ?? null);
  },
  getParent: (instance) => instance.parentView,
  getNode: (instance) => instance.element,
  hasData(instance) {
    const target = targetForComponent(instance);
    return getAllPropertyNames(target).some(
      (prop) => !prop.startsWith("_") && !EMBER_INTERNAL_PROPS.has(prop),
    );
  },
  getData(instance) {
    const target = targetForComponent(instance);
    const props = getAllPropertyNames(target).filter(
      (prop) => !prop.startsWith("_") && !EMBER_INTERNAL_PROPS.has(prop),
    );
    // eslint-disable-next-line security/detect-object-injection -- Safe because the prop names are coming from getAllPropertyNames
    return Object.fromEntries(props.map((x) => [x, target[x]]));
  },
  proxy: {
    toJS: unary(readEmberValueFromCache),
    get: getProp,
  },
};

export default adapter;

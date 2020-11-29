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

/**
 * The script that get injected into the page
 */
import "regenerator-runtime/runtime";
import "core-js/stable";
import { clone, getPropByPath } from "./utils";
import isEmpty from "lodash/isEmpty";
import mapValues from "lodash/mapValues";
import {
  CONNECT_EXTENSION,
  DETECT_FRAMEWORK_VERSIONS,
  READ_ANGULAR_SCOPE,
  READ_EMBER_COMPONENT,
  READ_EMBER_VIEW_ATTRS,
  READ_REACT_COMPONENT,
  READ_WINDOW,
  SCRIPT_LOADED,
  SEARCH_WINDOW,
  READ_VUE_VALUES,
  SET_VUE_VALUES,
} from "./messaging/constants";
import {
  getEmberComponentById,
  getVersion as getEmberVersion,
  readEmberValueFromCache,
} from "./frameworks/ember";
import {
  ComponentNotFoundError,
  findReactComponent,
  readReactProps,
} from "@/frameworks/react";
import fromPairs from "lodash/fromPairs";
import { globalSearch } from "@/vendors/globalSearch";
import { pickBy, identity } from "lodash";
import { findRelatedComponent as findVueComponent } from "@/frameworks/vue";
import { cleanValue } from "./utils";

type Handler = (payload: unknown) => unknown;
const handlers: { [type: string]: Handler } = {};

declare global {
  interface Window {
    angular?: {
      version: {
        full: string;
      };
      element: (
        element: HTMLElement
      ) => {
        scope: () => Record<string, unknown>;
      };
    };
    jQuery?: {
      fn: {
        jquery: string;
      };
    };
    Backbone?: {
      VERSION: string;
    };
    Vue?: {
      version: string;
    };
  }
}

window.addEventListener("message", function (event) {
  const handler = handlers[event.data?.type];

  if (!handler) {
    return;
  }

  const { meta, type, payload } = event.data;

  console.debug(`RECEIVE ${type}`, event.data);

  const reject = (error: unknown) => {
    try {
      const detail = {
        id: meta.id,
        error,
      };
      console.warn(`pageScript responding ${type}_REJECTED`, detail);
      document.dispatchEvent(
        new CustomEvent(`${type}_REJECTED`, {
          detail,
        })
      );
    } catch (err) {
      console.error(
        `An error occurred while dispatching an error for ${type}`,
        { error: err, originalError: error }
      );
    }
  };

  const fulfill = (result: unknown) => {
    let cleanResult;
    try {
      // Chrome will drop the whole detail if it contains non-serializable values, e.g., methods
      cleanResult = cleanValue(result ?? null);
    } catch (err) {
      console.error("Cannot serialize result", { result, err });
      throw new Error(`Cannot serialize result for result ${type}`);
    }

    const detail = {
      id: meta.id,
      result: cleanResult,
    };
    console.debug(`pageScript responding ${type}_FULFILLED`, detail);
    document.dispatchEvent(
      new CustomEvent(`${type}_FULFILLED`, {
        detail,
      })
    );
  };

  let resultPromise;

  try {
    resultPromise = handler(payload);
  } catch (error) {
    // handler is a function that immediately generated an error -- bail early.
    reject(error);
    return;
  }

  Promise.resolve(resultPromise).then(fulfill).catch(reject);
});

const attachListener = (messageType: string, handler: Handler) => {
  handlers[messageType] = handler;
};

attachListener(SEARCH_WINDOW, ({ query }) => {
  console.debug(`Searching window for query: ${query}`);
  return {
    results: globalSearch(window, query),
  };
});

attachListener(DETECT_FRAMEWORK_VERSIONS, () => ({
  emberjs: getEmberVersion(),
  angular: window.angular?.version?.full,
  jQuery: window.jQuery?.fn?.jquery,
  // https://github.com/Maluen/Backbone-Debugger#backbone-detection
  backbone: window.Backbone?.VERSION,
  vuejs: window.Vue?.version,
  // https://stackoverflow.com/a/44318447/402560
  redux: undefined,
}));

type PathSpec = Record<string, string | { path: string; args: unknown }>;

// needs to be object because we want window to be a valid argument
// eslint-disable-next-line @typescript-eslint/ban-types
function readPathSpec(object: object, pathSpec?: PathSpec) {
  if (!pathSpec) {
    return object;
  }

  const values: Record<string, unknown> = {};
  for (const [key, pathOrObj] of Object.entries(pathSpec)) {
    if (typeof pathOrObj === "object") {
      const { path, args } = pathOrObj;
      values[key] = getPropByPath(object, path, args);
    } else {
      values[key] = getPropByPath(object, pathOrObj);
    }
  }
  return values;
}

const sleep = (milliseconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

async function awaitNonEmpty(
  valueFactory: () => unknown,
  { waitMillis, retryMillis = 50 }: { waitMillis: number; retryMillis?: number }
) {
  const start = new Date().getTime();
  let elapsed = 0;
  let value = {};

  do {
    value = valueFactory();
    if (!isEmpty(value)) {
      return value;
    }
    await sleep(retryMillis);
    elapsed = new Date().getTime() - start;
  } while (elapsed < waitMillis);

  throw new Error(`Value not found after ${waitMillis} milliseconds`);
}

attachListener(READ_WINDOW, async ({ pathSpec, waitMillis }) => {
  const factory = () => {
    const values = readPathSpec(window, pathSpec);
    return Object.values(values).every(isEmpty) ? undefined : values;
  };
  return awaitNonEmpty(factory, { waitMillis });
});

attachListener(
  READ_REACT_COMPONENT,
  async ({
    selector,
    traverseUp = 0,
    waitMillis = 1000,
    retryMillis = 10,
    rootProp,
  }) => {
    const start = new Date().getTime();
    let elapsed = 0;

    do {
      const element = document.querySelector(selector);

      if (!element) {
        throw new Error(`Could not find element for ${selector}`);
      }

      try {
        const component = findReactComponent(element, traverseUp);
        const props = readReactProps(component, rootProp);
        console.debug("Read React component props", props);
        return props;
      } catch (ex) {
        if (!(ex instanceof ComponentNotFoundError)) {
          throw ex;
        }
      }
      await sleep(retryMillis);
      elapsed = new Date().getTime() - start;
    } while (elapsed < waitMillis);

    throw new ComponentNotFoundError(
      `React fiber not found at selector after ${waitMillis}ms`
    );
  }
);

attachListener(
  READ_EMBER_VIEW_ATTRS,
  ({
    selector,
    attrs: rawAttrs = [],
  }: {
    selector: string;
    attrs: string[];
  }) => {
    const element = document.querySelector(selector);

    if (!element) {
      throw new Error(`Could not find element for ${selector}`);
    } else if (element.id == null) {
      throw new Error(`Element does not have an id`);
    }

    const view = getEmberComponentById(element.id);

    if (!view) {
      throw new ComponentNotFoundError(
        `Could not find ember component for id ${element.id}`
      );
    }

    console.debug(`Found ember view ${selector}`, view);

    const attrs = rawAttrs.filter(identity);

    if (!isEmpty(attrs)) {
      return fromPairs(
        attrs.map((attr: string) => [
          attr,
          readEmberValueFromCache(view.attrs[attr]),
        ])
      );
    } else {
      return pickBy(
        mapValues(view.attrs, (x) => readEmberValueFromCache(x)),
        (value) => value !== undefined
      );
    }
  }
);

attachListener(READ_EMBER_COMPONENT, ({ selector, pathSpec }) => {
  const element = document.querySelector(selector);
  const component = getEmberComponentById(element.id);

  if (!component) {
    throw new ComponentNotFoundError(
      `Could not find Ember component at selector ${selector}`
    );
  }

  console.debug(`Found ember component ${selector}`, component);
  return readPathSpec(component, pathSpec);
});

attachListener(READ_ANGULAR_SCOPE, ({ selector, pathSpec }) => {
  const element = document.querySelector(selector);

  if (!window.angular) {
    throw new Error("Angular not found");
  }

  const component = window.angular.element(element);

  if (!component) {
    throw new ComponentNotFoundError(
      `Could not find Angular component for selector ${selector}`
    );
  }

  const scope = clone(component.scope());

  return readPathSpec(scope, pathSpec);
});

attachListener(READ_VUE_VALUES, ({ selector, pathSpec }) => {
  const element = document.querySelector(selector);
  const component = findVueComponent(element);

  if (!component) {
    throw new ComponentNotFoundError(
      `Could not find Vue component for selector ${selector}`
    );
  }

  return readPathSpec(component, pathSpec);
});

attachListener(SET_VUE_VALUES, ({ selector, valueMap }) => {
  const element = document.querySelector(selector);
  const component = findVueComponent(element);
  for (const [key, value] of Object.entries(valueMap)) {
    (component as any)[key] = value;
  }
});

console.debug(`DISPATCH: ${SCRIPT_LOADED} (Injected Script Run)`);
document.dispatchEvent(new CustomEvent(SCRIPT_LOADED));

setTimeout(function () {
  document.dispatchEvent(new CustomEvent(CONNECT_EXTENSION, {}));
}, 0);

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
} from "./messaging/constants";
import {
  getEmberComponentById,
  getVersion as getEmberVersion,
  readEmberValueFromCache,
} from "./frameworks/ember";
import {
  findReactComponent,
  readReactProps,
  ComponentNotFoundError,
} from "@/frameworks/react";
import fromPairs from "lodash/fromPairs";
import { globalSearch } from "@/vendors/globalSearch";
import pickBy from "lodash/pickBy";
import identity from "lodash/identity";

const attachListener = (messageType, handler) => {
  document.addEventListener(messageType, function (e) {
    console.debug(`RECEIVE ${messageType}`, e.detail);

    const reject = (error) => {
      document.dispatchEvent(
        new CustomEvent(`${messageType}_REJECTED`, {
          detail: {
            id: e.detail.id,
            error,
          },
        })
      );
    };

    const fulfill = (result) => {
      document.dispatchEvent(
        new CustomEvent(`${messageType}_FULFILLED`, {
          detail: {
            id: e.detail.id,
            result,
          },
        })
      );
    };

    let resultPromise;

    try {
      resultPromise = handler(e.detail);
    } catch (error) {
      // handler is a function that immediately generated an error -- bail early.
      reject(error);
      return;
    }

    Promise.resolve(resultPromise).then(fulfill).catch(reject);
  });
};

attachListener(SEARCH_WINDOW, ({ query }) => ({
  results: globalSearch(window, query),
}));

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

function readPathSpec(object, pathSpec) {
  const values = {};
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

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

async function awaitNonEmpty(valueFactory, { waitMillis, retryMillis = 50 }) {
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
        if (!ex instanceof ComponentNotFoundError) {
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

attachListener(READ_EMBER_VIEW_ATTRS, ({ selector, attrs: rawAttrs }) => {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Could not find element for ${selector}`);
  }

  const view = getEmberComponentById(element.id);

  if (!view) {
    throw new Error(`Could not find ember component ${element.id}`);
  }

  console.debug(`Found ember view ${selector}`, view);

  const attrs = rawAttrs.filter(identity);

  if (!isEmpty(attrs)) {
    return fromPairs(
      attrs.map((attr) => [attr, readEmberValueFromCache(view.attrs[attr])])
    );
  } else {
    return pickBy(
      mapValues(view.attrs, readEmberValueFromCache),
      (value) => value !== undefined
    );
  }
});

attachListener(READ_EMBER_COMPONENT, ({ selector, pathSpec }) => {
  const element = document.querySelector(selector);
  const component = getEmberComponentById(element.id);
  console.debug(`Found ember component ${selector}`, component);
  return readPathSpec(component, pathSpec);
});

attachListener(READ_ANGULAR_SCOPE, ({ selector, pathSpec }) => {
  const element = document.querySelector(selector);
  const scope = clone(window.angular.element(element).scope());
  return readPathSpec(scope, pathSpec);
});

console.debug(`DISPATCH: ${SCRIPT_LOADED} (Injected Script Run)`);
document.dispatchEvent(new CustomEvent(SCRIPT_LOADED));

setTimeout(function () {
  document.dispatchEvent(new CustomEvent(CONNECT_EXTENSION, {}));
}, 0);

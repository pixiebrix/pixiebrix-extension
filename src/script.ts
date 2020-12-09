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
import jQuery from "jquery";
import { isEmpty, identity } from "lodash";
import {
  CONNECT_EXTENSION,
  DETECT_FRAMEWORK_VERSIONS,
  GET_COMPONENT_DATA,
  READ_WINDOW,
  SCRIPT_LOADED,
  SEARCH_WINDOW,
  SET_COMPONENT_DATA,
} from "./messaging/constants";
import detectLibraries from "@/vendors/libraryDetector/detect";
import adapters from "@/frameworks/adapters";
import { globalSearch } from "@/vendors/globalSearch";
import {
  ReadPayload,
  PathSpec,
  ReadOptions,
  WritePayload,
} from "@/pageScript/protocol";
import {
  cleanValue,
  awaitValue,
  clone,
  getPropByPath,
  TimeoutError,
} from "./utils";
import { ComponentNotFoundError } from "@/frameworks/errors";
import {
  ReadableComponentAdapter,
  WriteableComponentAdapter,
} from "@/frameworks/component";

type Handler = (payload: unknown) => unknown | Promise<unknown>;
const handlers: { [type: string]: Handler } = {};

function requireSingleElement(selector: string): HTMLElement {
  const $elt = jQuery(document).find(selector);
  if (!$elt.length) {
    throw new Error(`No elements found for selector: ${selector}`);
  } else if ($elt.length > 1) {
    throw new Error(`Multiple elements found for selector: ${selector}`);
  }
  return $elt.get(0);
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

attachListener(DETECT_FRAMEWORK_VERSIONS, async () => {
  return await detectLibraries();
});

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

attachListener(READ_WINDOW, async ({ pathSpec, waitMillis }) => {
  const factory = () => {
    const values = readPathSpec(window, pathSpec);
    return Object.values(values).every(isEmpty) ? undefined : values;
  };
  return awaitValue(factory, { waitMillis });
});

async function read<TComponent>(
  adapter: ReadableComponentAdapter<TComponent>,
  selector: string,
  options: ReadOptions
) {
  const { pathSpec, waitMillis = 0, retryMillis = 1000, rootProp } = options;

  const element = requireSingleElement(selector);
  let component;

  try {
    component = await awaitValue(() => adapter.elementComponent(element), {
      waitMillis,
      retryMillis,
      predicate: identity,
    });
  } catch (err) {
    if (err instanceof TimeoutError) {
      component = null;
    }
    throw err;
  }

  if (!component) {
    throw new ComponentNotFoundError(
      `Could not find framework component for selector ${selector} in ${waitMillis}ms`
    );
  }

  const props = clone(adapter.getData(component));

  return readPathSpec(rootProp ? (props as any)[rootProp] : props, pathSpec);
}

attachListener(
  GET_COMPONENT_DATA,
  async ({
    framework,
    selector,
    traverseUp = 0,
    waitMillis = 1000,
    retryMillis = 10,
    rootProp,
  }: ReadPayload) => {
    const adapter = adapters[framework] as ReadableComponentAdapter;
    if (!adapter) {
      throw new Error(`No read adapter available for ${framework}`);
    }
    return await read(adapter, selector, {
      waitMillis,
      retryMillis,
      rootProp,
      traverseUp,
    });
  }
);

attachListener(
  SET_COMPONENT_DATA,
  ({ framework, selector, valueMap }: WritePayload) => {
    const adapter = adapters[framework] as WriteableComponentAdapter;
    if (!adapter?.setData) {
      throw new Error(`No write adapter available for ${framework}`);
    }
    const element = requireSingleElement(selector);
    const component = (adapter.getOwner(element) as unknown) as {
      [key: string]: unknown;
    };
    adapter.setData(component, valueMap);
  }
);

console.debug(`DISPATCH: ${SCRIPT_LOADED} (Injected Script Run)`);
document.dispatchEvent(new CustomEvent(SCRIPT_LOADED));

setTimeout(function () {
  document.dispatchEvent(new CustomEvent(CONNECT_EXTENSION, {}));
}, 0);

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
import { isEmpty, identity, castArray, fromPairs } from "lodash";
import {
  CONNECT_EXTENSION,
  DETECT_FRAMEWORK_VERSIONS,
  Framework,
  GET_COMPONENT_DATA,
  GET_COMPONENT_INFO,
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
  initialize,
} from "@/pageScript/protocol";
import {
  awaitValue,
  getPropByPath,
  noopProxy,
  ReadProxy,
  TimeoutError,
} from "./utils";
import { ComponentNotFoundError } from "@/frameworks/errors";
import {
  ReadableComponentAdapter,
  traverse,
  WriteableComponentAdapter,
} from "@/frameworks/component";
import { elementInfo } from "@/nativeEditor/frameworks";

function requireSingleElement(selector: string): HTMLElement {
  const $elt = jQuery(document).find(selector);
  if (!$elt.length) {
    throw new Error(`No elements found for selector: '${selector}'`);
  } else if ($elt.length > 1) {
    throw new Error(`Multiple elements found for selector: '${selector}'`);
  }
  return $elt.get(0);
}

const attachListener = initialize();

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
function readPathSpec(
  obj: object,
  pathSpec?: PathSpec,
  proxy: ReadProxy = noopProxy
) {
  const { toJS = noopProxy.toJS, get = noopProxy.get } = proxy;

  if (!pathSpec) {
    return toJS(obj);
  }

  if (Array.isArray(pathSpec) || typeof pathSpec === "string") {
    return fromPairs(
      castArray(pathSpec).map((prop) => [prop, toJS(get(obj, prop))])
    );
  }

  const values: Record<string, unknown> = {};
  for (const [key, pathOrObj] of Object.entries(pathSpec)) {
    if (typeof pathOrObj === "object") {
      const { path, args } = pathOrObj;
      values[key] = getPropByPath(obj as { [prop: string]: unknown }, path, {
        args: args as object,
        proxy,
      });
    } else {
      values[key] = getPropByPath(
        obj as { [prop: string]: unknown },
        pathOrObj,
        { proxy }
      );
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
  const {
    pathSpec,
    waitMillis = 0,
    retryMillis = 1000,
    rootProp,
    traverseUp = 0,
  } = options;

  const element = requireSingleElement(selector);
  let component: TComponent;

  try {
    component = await awaitValue(() => adapter.getComponent(element), {
      waitMillis,
      retryMillis,
      predicate: identity,
    });
  } catch (err) {
    if (err instanceof TimeoutError) {
      throw new ComponentNotFoundError(
        `Could not find framework component for selector ${selector} in ${waitMillis}ms`
      );
    }
    throw err;
  }

  const target = traverse(adapter.getParent, component, traverseUp);
  const data = adapter.getData(target);
  return readPathSpec(
    rootProp ? (data as any)[rootProp] : data,
    pathSpec,
    adapter.proxy
  );
}

attachListener(
  GET_COMPONENT_DATA,
  async ({ framework, selector, ...options }: ReadPayload) => {
    const adapter = adapters[framework] as ReadableComponentAdapter;
    if (!adapter) {
      throw new Error(`No read adapter available for ${framework}`);
    }
    return await read(adapter, selector, options);
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
    const component = adapter.getComponent(element);
    adapter.setData(component, valueMap);
  }
);

attachListener(
  GET_COMPONENT_INFO,
  async ({
    selector,
    framework,
    traverseUp = 0,
  }: {
    selector: string;
    framework?: Framework;
    traverseUp: number;
  }) => {
    const element = requireSingleElement(selector);
    return await elementInfo(element, framework, [selector], traverseUp);
  }
);

console.debug(`DISPATCH: ${SCRIPT_LOADED} (Injected Script Run)`);
document.dispatchEvent(new CustomEvent(SCRIPT_LOADED));

setTimeout(function () {
  document.dispatchEvent(new CustomEvent(CONNECT_EXTENSION, {}));
}, 0);

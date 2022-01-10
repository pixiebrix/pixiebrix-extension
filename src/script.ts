/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

/**
 * The script that gets injected into the host page. Shares a JS context with the host page
 */

import { uuidv4 } from "@/types/helpers";

const JQUERY_WINDOW_PROP = "$$jquery";
const PAGESCRIPT_SYMBOL = Symbol.for("pixiebrix-page-script");

declare global {
  interface Window {
    [PAGESCRIPT_SYMBOL]?: string;
    [JQUERY_WINDOW_PROP]?: unknown;
  }
}

// eslint-disable-next-line security/detect-object-injection -- using constant symbol defined above
if (window[PAGESCRIPT_SYMBOL]) {
  throw new Error(
    // eslint-disable-next-line security/detect-object-injection -- using constant symbol defined above
    `PixieBrix pageScript already installed: ${window[PAGESCRIPT_SYMBOL]}`
  );
}

// eslint-disable-next-line security/detect-object-injection -- using constant symbol defined above
window[PAGESCRIPT_SYMBOL] = uuidv4();

import jQuery from "jquery";
import { isEmpty, identity, castArray, cloneDeep } from "lodash";
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
} from "@/messaging/constants";
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
import { awaitValue, TimeoutError } from "@/utils";
import {
  ReadableComponentAdapter,
  traverse,
  WriteableComponentAdapter,
} from "@/frameworks/component";
import { elementInfo } from "@/nativeEditor/frameworks";
import { requireSingleElement } from "@/nativeEditor/utils";
import { getPropByPath, noopProxy, ReadProxy } from "@/runtime/pathHelpers";
import { UnknownObject } from "@/types";

const MAX_READ_DEPTH = 5;

const attachListener = initialize();

attachListener(SEARCH_WINDOW, ({ query }) => {
  console.debug("Searching window for query: %s", query);
  return {
    results: globalSearch(window, query),
  };
});

attachListener(DETECT_FRAMEWORK_VERSIONS, async () => detectLibraries());

function readPathSpec(
  // eslint-disable-next-line @typescript-eslint/ban-types -- object because we need to pass in window
  obj: object,
  pathSpec?: PathSpec,
  proxy: ReadProxy = noopProxy
) {
  const { toJS = noopProxy.toJS, get = noopProxy.get } = proxy;

  if (!pathSpec) {
    return toJS(obj);
  }

  if (Array.isArray(pathSpec) || typeof pathSpec === "string") {
    return Object.fromEntries(
      castArray(pathSpec).map((prop) => [prop, toJS(get(obj, prop))])
    );
  }

  const values: Record<string, unknown> = {};
  for (const [key, pathOrObj] of Object.entries(pathSpec)) {
    if (typeof pathOrObj === "object") {
      const { path, args } = pathOrObj;
      // eslint-disable-next-line security/detect-object-injection -- key is coming from pathSpec
      values[key] = getPropByPath(obj as UnknownObject, path, {
        args: args as UnknownObject,
        proxy,
        maxDepth: MAX_READ_DEPTH,
      });
    } else {
      // eslint-disable-next-line security/detect-object-injection -- key is coming from pathSpec
      values[key] = getPropByPath(obj as Record<string, unknown>, pathOrObj, {
        proxy,
        maxDepth: MAX_READ_DEPTH,
      });
    }
  }

  return values;
}

attachListener(READ_WINDOW, async ({ pathSpec, waitMillis }) => {
  const factory = () => {
    const values = readPathSpec(window, pathSpec);
    return Object.values(values).every((value) => isEmpty(value))
      ? undefined
      : values;
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
    optional = false,
    traverseUp = 0,
  } = options;

  let element: HTMLElement;

  try {
    element = requireSingleElement(selector);
  } catch (error) {
    console.debug("read: error calling requireSingleElement", {
      error,
      options,
    });
    if (optional) {
      return {};
    }

    throw error;
  }

  let component: TComponent;

  try {
    component = await awaitValue(() => adapter.getComponent(element), {
      waitMillis,
      retryMillis,
      predicate: identity,
    });
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.warn(
        `Could not find framework component for selector ${selector} in ${waitMillis}ms`
      );
      return {};
    }

    throw error;
  }

  const target = traverse(adapter.getParent, component, traverseUp);
  const rawData = adapter.getData(target);
  const readData = readPathSpec(
    rootProp ? (rawData as any)[rootProp] : rawData,
    pathSpec,
    adapter.proxy
  );

  // If (process.env.DEBUG) {
  //   const clonedData = cloneDeep(readData);
  //   console.debug(`Read ${selector}`, {
  //     target,
  //     rawData,
  //     component,
  //     clonedData,
  //     readData,
  //     options,
  //     selector,
  //   });
  // }

  return cloneDeep(readData);
}

attachListener(
  GET_COMPONENT_DATA,
  async ({ framework, selector, ...options }: ReadPayload) => {
    if (isEmpty(selector)) {
      // Just warn here, as there's no harm in returning blank data value (e.g., when a load trigger is first
      // added via the page editor)
      console.warn("No selector provided");
      return {};
    }

    const adapter = adapters.get(framework) as ReadableComponentAdapter;
    if (!adapter) {
      throw new Error(`No read adapter available for framework: ${framework}`);
    }

    return read(adapter, selector, options);
  }
);

attachListener(
  SET_COMPONENT_DATA,
  ({ framework, selector, valueMap }: WritePayload) => {
    if (isEmpty(selector)) {
      // Throw error since this likely indicates a bug in a brick
      throw new Error("No selector provided");
    }

    const adapter = adapters.get(framework) as WriteableComponentAdapter;
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

    /**
     * TraverseUp controls how many ancestor elements to also return
     */
    traverseUp: number;
  }) => {
    console.debug("GET_COMPONENT_INFO", { selector, framework, traverseUp });
    const element = requireSingleElement(selector);
    const info = await elementInfo(element, framework, [selector], traverseUp);
    console.debug("Element info", { element, selector, info });
    return info;
  }
);

console.debug(`DISPATCH: ${SCRIPT_LOADED} (Injected Script Run)`);
document.dispatchEvent(new CustomEvent(SCRIPT_LOADED));

setTimeout(() => {
  document.dispatchEvent(new CustomEvent(CONNECT_EXTENSION, {}));
}, 0);

// Ensure jquery is available for testing selectors when debugging PixieBrix errors
// Cast as any because we don't want to pollute namespace with TypeScript declaration
// eslint-disable-next-line security/detect-object-injection
window[JQUERY_WINDOW_PROP] = jQuery;

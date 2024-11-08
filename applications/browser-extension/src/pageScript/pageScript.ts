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

/**
 * The script that gets injected into the host page. Shares a JS context with the host page
 *
 * IMPORTANT: do not import anything that has a transitive dependency of the messenger.
 * See for more information: https://github.com/pixiebrix/pixiebrix-extension/issues/4058
 */

import { isEmpty, identity, castArray, cloneDeep } from "lodash";
import {
  CONNECT_EXTENSION,
  GET_COMPONENT_DATA,
  GET_ELEMENT_INFO,
  READ_WINDOW,
  SCRIPT_LOADED,
  SET_COMPONENT_DATA,
  type FrameworkAdapter,
  CKEDITOR_SET_VALUE,
  CKEDITOR_INSERT_TEXT,
} from "./messenger/constants";
import adapters from "./frameworks/adapters";
import {
  type ReadPayload,
  type PathSpec,
  type ReadOptions,
  type WritePayload,
} from "./messenger/api";
import {
  type ReadableComponentAdapter,
  traverse,
} from "./frameworks/component";
import { elementInfo } from "./elementInfo";
import {
  getPropByPath,
  noopProxy,
  type ReadProxy,
} from "../runtime/pathHelpers";
import { initialize } from "./messenger/receiver";
import { TimeoutError } from "p-timeout";
import * as ckeditor from "../contrib/ckeditor/ckeditorProtocol";
import { awaitValue } from "../utils/promiseUtils";
import { findSingleElement } from "../utils/domUtils";
import { uuidv4 } from "@/types/helpers";
import { type SerializableResponse } from "@/types/messengerTypes";
import { type ElementInfo } from "../utils/inference/selectorTypes";

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
    `PixieBrix pageScript already installed: ${window[PAGESCRIPT_SYMBOL]}`,
  );
}

// Safe to use uuidv4 polyfill here because the value is opaque/doesn't matter. It's just to detect double-injection.
// eslint-disable-next-line security/detect-object-injection -- using constant symbol defined above
window[PAGESCRIPT_SYMBOL] = uuidv4();

const MAX_READ_DEPTH = 5;

const attachListener = initialize();

function readPathSpec(
  // eslint-disable-next-line @typescript-eslint/ban-types -- object because we need to pass in window
  obj: object,
  pathSpec?: PathSpec,
  proxy: ReadProxy = noopProxy,
) {
  const { toJS = noopProxy.toJS, get = noopProxy.get } = proxy;

  if (!pathSpec) {
    return toJS(obj);
  }

  if (Array.isArray(pathSpec) || typeof pathSpec === "string") {
    return Object.fromEntries(
      castArray(pathSpec).map((prop) => [prop, toJS(get(obj, prop))]),
    );
  }

  const values: UnknownObject = {};
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
      values[key] = getPropByPath(obj as UnknownObject, pathOrObj, {
        proxy,
        maxDepth: MAX_READ_DEPTH,
      });
    }
  }

  return values;
}

attachListener(
  READ_WINDOW,
  async ({
    pathSpec,
    waitMillis,
  }: {
    pathSpec: PathSpec;
    waitMillis: number;
  }) => {
    const factory = () => {
      const values = readPathSpec(window, pathSpec) as UnknownObject;
      return Object.values(values).every((value) => isEmpty(value))
        ? undefined
        : values;
    };

    return awaitValue(factory, { waitMillis }) as SerializableResponse;
  },
);

async function read<TComponent>(
  adapter: ReadableComponentAdapter<TComponent>,
  selector: string,
  options: ReadOptions,
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
    element = findSingleElement(selector);
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

  let component: TComponent | null = null;

  try {
    component = await awaitValue(() => adapter.getComponent(element), {
      waitMillis,
      retryMillis,
      predicate: identity,
    });
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.warn(
        `Could not find framework component for selector ${selector} in ${waitMillis}ms`,
      );
      return {};
    }

    throw error;
  }

  const target = traverse(adapter.getParent, component, traverseUp);
  const rawData = adapter.getData(target);
  const readData = readPathSpec(
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, security/detect-object-injection
    -- TODO: Find a better solution than casting to any */
    rootProp ? (rawData as any)[rootProp] : rawData,
    pathSpec,
    adapter.proxy,
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
    if (!selector) {
      // Just warn here, as there's no harm in returning blank data value (e.g., when a load trigger is first
      // added via the page editor)
      console.warn("No selector provided");
      return {};
    }

    const adapter = adapters.get(framework as FrameworkAdapter);
    if (!adapter) {
      throw new Error(`No read adapter available for framework: ${framework}`);
    }

    return read(adapter, selector, options) as SerializableResponse;
  },
);

attachListener(
  SET_COMPONENT_DATA,
  async ({ framework, selector, valueMap }: WritePayload): Promise<void> => {
    if (isEmpty(selector)) {
      // Throw error since this likely indicates a bug in a brick
      throw new Error("No selector provided");
    }

    const adapter = adapters.get(framework as FrameworkAdapter);
    if (!adapter || !("setData" in adapter)) {
      throw new Error(`No write adapter available for ${framework}`);
    }

    const element = findSingleElement(selector);
    const component = adapter.getComponent(element);
    adapter.setData(component, valueMap);
  },
);

attachListener(
  GET_ELEMENT_INFO,
  async ({
    selector,
  }: {
    selector: string;
  }): Promise<ElementInfo | undefined> => {
    const element = findSingleElement(selector);
    const info = await elementInfo(element, [selector], 0);
    console.debug("Element info", { element, selector, info });
    return info;
  },
);

attachListener(
  CKEDITOR_SET_VALUE,
  async ({ selector, value }: { selector: string; value: string }) => {
    const element = findSingleElement(selector);
    ckeditor.setData(element, value);
  },
);

attachListener(
  CKEDITOR_INSERT_TEXT,
  async ({ selector, value }: { selector: string; value: string }) => {
    const element = findSingleElement(selector);
    ckeditor.insertText(element, value);
  },
);

console.debug(`DISPATCH: ${SCRIPT_LOADED} (Injected Script Run)`);
document.dispatchEvent(new CustomEvent(SCRIPT_LOADED));

setTimeout(() => {
  document.dispatchEvent(new CustomEvent(CONNECT_EXTENSION, {}));
}, 0);

/* eslint-disable-next-line security/detect-object-injection
-- Ensure jquery is available for testing selectors when debugging PixieBrix errors
Cast as any because we don't want to pollute namespace with TypeScript declaration */
window[JQUERY_WINDOW_PROP] = $;

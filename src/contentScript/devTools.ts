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

import { liftContentScript } from "@/contentScript/backgroundProtocol";
import { deserializeError } from "serialize-error";
import { isContentScript } from "webext-detect-page";
import { withDetectFrameworkVersions, withSearchWindow } from "@/common";
import { makeRead, ReaderTypeConfig } from "@/blocks/readers/factory";
import FRAMEWORK_ADAPTERS from "@/frameworks/adapters";
import { getComponentData } from "@/pageScript/protocol";
import { Framework } from "@/messaging/constants";
import blockRegistry from "@/blocks/registry";
import getCssSelector from "css-selector-generator";
import { IReader } from "@/core";
import {
  addListenerForUpdateSelectedElement,
  selectedElement,
} from "@/devTools/getSelectedElement";

// install handlers
import "@/nativeEditor/insertButton";
import "@/nativeEditor/insertPanel";
import "@/nativeEditor/dynamic";

export type Target = {
  tabId: number;
  frameId: number;
};

if (isContentScript()) {
  addListenerForUpdateSelectedElement();
}

async function read(factory: () => Promise<unknown>): Promise<unknown> {
  try {
    return await factory();
  } catch (error) {
    if (deserializeError(error).name === "ComponentNotFoundError") {
      return "Component not detected";
    } else {
      return { error: error };
    }
  }
}

export const detectFrameworks = liftContentScript(
  "DETECT_FRAMEWORKS",
  async () => {
    return withDetectFrameworkVersions(null);
  }
);

export const searchWindow: (
  target: Target,
  query: string
) => Promise<{ results: unknown[] }> = liftContentScript(
  "SEARCH_WINDOW",
  async (query: string) => {
    return withSearchWindow({ query });
  }
);

export const runReaderBlock = liftContentScript(
  "RUN_READER_BLOCK",
  async ({ id, rootSelector }: { id: string; rootSelector?: string }) => {
    const root = rootSelector
      ? // eslint-disable-next-line unicorn/no-array-callback-reference -- false positive for jquery find method
        $(document).find(rootSelector).get(0)
      : document;

    if (id === "@pixiebrix/context-menu-data") {
      // HACK: special handling for context menu built-in
      if (root instanceof HTMLElement) {
        return {
          // TODO: extract the media type
          mediaType: null,
          // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- TODO: Review if necessary
          linkText: root.tagName === "A" ? root.innerText : null,
          linkUrl: root.tagName === "A" ? root.getAttribute("href") : null,
          srcUrl: root.getAttribute("src"),
          documentUrl: document.location.href,
        };
      } else {
        return {
          selectionText: window.getSelection().toString(),
          documentUrl: document.location.href,
        };
      }
    } else {
      const reader = (await blockRegistry.lookup(id)) as IReader;
      return reader.read(root);
    }
  }
);

export const runReader = liftContentScript(
  "RUN_READER",
  async ({
    config,
    rootSelector,
  }: {
    config: ReaderTypeConfig;
    rootSelector?: string;
  }) => {
    console.debug("runReader", { config, rootSelector });

    const root =
      (rootSelector?.trim() ?? "") !== ""
        ? // eslint-disable-next-line unicorn/no-array-callback-reference -- false positive for jquery find method
          $(document).find(rootSelector).get(0)
        : document;

    return makeRead(config)(root);
  }
);

export const readSelected = liftContentScript("READ_SELECTED", async () => {
  if (selectedElement) {
    const selector = getCssSelector(selectedElement);
    console.debug(`Generated selector: ${selector}`);

    const base: { [key: string]: unknown } = {
      selector,
      htmlData: $(selectedElement).data(),
    };
    for (const framework of FRAMEWORK_ADAPTERS.keys()) {
      // eslint-disable-next-line security/detect-object-injection -- safe because key coming from compile-time constant
      base[framework] = await read(async () =>
        getComponentData({ framework: framework as Framework, selector })
      );
    }
    return base;
  } else {
    return {
      error: "No element selected",
    };
  }
});

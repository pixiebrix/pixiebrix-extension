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
import blockRegistry from "@/blocks/registry";
import { getCssSelector } from "css-selector-generator";
import { runStage } from "@/blocks/combinators";
import { IReader, RegistryId } from "@/core";
import {
  addListenerForUpdateSelectedElement,
  selectedElement,
} from "@/devTools/getSelectedElement";

// Install handlers
import "@/nativeEditor/insertButton";
import "@/nativeEditor/insertPanel";
import "@/nativeEditor/dynamic";
import { isNullOrBlank, resolveObj } from "@/utils";
import { BlockConfig } from "@/blocks/types";
import { cloneDeep } from "lodash";
import ConsoleLogger from "@/tests/ConsoleLogger";
import { SerializableResponse } from "@/messaging/protocol";

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
  } catch (error: unknown) {
    if (deserializeError(error).name === "ComponentNotFoundError") {
      return "Component not detected";
    }

    return { error };
  }
}

export const detectFrameworks = liftContentScript(
  "DETECT_FRAMEWORKS",
  async () => withDetectFrameworkVersions(null)
);

export const searchWindow: (
  target: Target,
  query: string
) => Promise<{ results: unknown[] }> = liftContentScript(
  "SEARCH_WINDOW",
  async (query: string) => withSearchWindow({ query })
);

export type RunBlockArgs = {
  blockConfig: BlockConfig;
  args: Record<string, unknown>;
};

export const runBlock = liftContentScript(
  "RUN_SINGLE_BLOCK",
  async ({ blockConfig, args }: RunBlockArgs) => {
    const block = await blockRegistry.lookup(blockConfig.id);

    const result = await runStage(block, blockConfig, args, {
      context: args,
      logger: new ConsoleLogger(),
      headless: true,
      validate: true,
      logValues: false,
      // TODO: need to support other roots for triggers. Or we at least need to throw an error so we can show a message
      //  in the UX that non-root contexts aren't supported
      root: null,
    });

    return cloneDeep(result) as SerializableResponse;
  }
);

export const runReaderBlock = liftContentScript(
  "RUN_READER_BLOCK",
  async ({ id, rootSelector }: { id: RegistryId; rootSelector?: string }) => {
    const root = isNullOrBlank(rootSelector)
      ? document
      : // eslint-disable-next-line unicorn/no-array-callback-reference -- false positive for jquery find method
        $(document).find(rootSelector).get(0);

    if (id === "@pixiebrix/context-menu-data") {
      // HACK: special handling for context menu built-in
      if (root instanceof HTMLElement) {
        return {
          // TODO: extract the media type
          mediaType: null,
          // Use `innerText` because only want human readable elements
          // https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent#differences_from_innertext
          // eslint-disable-next-line unicorn/prefer-dom-node-text-content
          linkText: root.tagName === "A" ? root.innerText : null,
          linkUrl: root.tagName === "A" ? root.getAttribute("href") : null,
          srcUrl: root.getAttribute("src"),
          documentUrl: document.location.href,
        };
      }

      return {
        selectionText: window.getSelection().toString(),
        documentUrl: document.location.href,
      };
    }

    const reader = (await blockRegistry.lookup(id)) as IReader;
    return reader.read(root);
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

    const root = isNullOrBlank(rootSelector)
      ? document
      : // eslint-disable-next-line unicorn/no-array-callback-reference -- false positive for JQuery
        $(document).find(rootSelector).get(0);

    return makeRead(config)(root);
  }
);

export const readSelected = liftContentScript("READ_SELECTED", async () => {
  if (selectedElement) {
    const selector = getCssSelector(selectedElement);
    console.debug(`Generated selector: ${selector}`);

    const base: Record<string, unknown> = {
      selector,
      htmlData: $(selectedElement).data(),
    };

    const frameworkData = await resolveObj(
      Object.fromEntries(
        [...FRAMEWORK_ADAPTERS.keys()].map((framework) => [
          framework,
          read(async () => getComponentData({ framework, selector })),
        ])
      )
    );

    return { ...base, ...frameworkData };
  }

  return {
    error: "No element selected",
  };
});

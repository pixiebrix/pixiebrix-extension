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

import { liftContentScript } from "@/contentScript/backgroundProtocol";
import { deserializeError } from "serialize-error";
import { withDetectFrameworkVersions, withSearchWindow } from "@/common";
import { makeRead, ReaderTypeConfig } from "@/blocks/readers/factory";
import adapters from "@/frameworks/adapters";
import { getComponentData } from "@/pageScript/protocol";
import { Framework } from "@/messaging/constants";
import { ready as contentScriptReady } from "@/contentScript/context";
import blockRegistry from "@/blocks/registry";

// install handlers
import "@/nativeEditor/insertButton";
import "@/nativeEditor/insertPanel";
import "@/nativeEditor/dynamic";

import getCssSelector from "css-selector-generator";
import { IReader } from "@/core";

let selectedElement: HTMLElement = undefined;

(window as any).setSelectedElement = function (el: HTMLElement) {
  // do something with the selected element
  selectedElement = el;
};

async function read(factory: () => Promise<unknown>): Promise<unknown> {
  try {
    return await factory();
  } catch (err) {
    if (deserializeError(err).name === "ComponentNotFoundError") {
      return "Component not detected";
    } else {
      return { error: err };
    }
  }
}

interface PingResponse {
  installed: boolean;
  ready: boolean;
}

export const _ping = liftContentScript("PING", async () => {
  return {
    installed: true,
    ready: contentScriptReady,
  };
});

export async function isInstalled(tabId: number): Promise<PingResponse> {
  try {
    return await _ping(tabId);
  } catch (reason) {
    if (reason.message?.includes("Receiving end does not exist")) {
      return {
        installed: false,
        ready: false,
      };
    }
    throw reason;
  }
}

export const detectFrameworks = liftContentScript(
  "DETECT_FRAMEWORKS",
  async () => {
    return await withDetectFrameworkVersions(null);
  }
);

export const searchWindow: (
  tabId: number,
  query: string
) => Promise<{ results: unknown[] }> = liftContentScript(
  "SEARCH_WINDOW",
  async (query: string) => {
    return await withSearchWindow({ query });
  }
);

export const runReaderBlock = liftContentScript(
  "RUN_READER_BLOCK",
  async ({ id, rootSelector }: { id: string; rootSelector?: string }) => {
    const root = rootSelector
      ? $(document).find(rootSelector).get(0)
      : document;

    if (id === "@pixiebrix/context-menu-data") {
      // HACK: special handling for context menu built-in
      if (root instanceof HTMLElement) {
        return {
          // TODO: extract the media type
          mediaType: null,
          linkText: root.tagName === "A" ? root.innerText : null,
          linkUrl: root.tagName === "A" ? root.getAttribute("href") : null,
          srcUrl: root.getAttribute("src"),
        };
      } else {
        return {
          selectionText: window.getSelection().toString(),
        };
      }
    } else {
      const reader = (await blockRegistry.lookup(id)) as IReader;
      return await reader.read(root);
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
    const root = rootSelector
      ? $(document).find(rootSelector).get(0)
      : document;
    return await makeRead(config)(root);
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
    for (const framework of adapters.keys()) {
      base[framework] = await read(() =>
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

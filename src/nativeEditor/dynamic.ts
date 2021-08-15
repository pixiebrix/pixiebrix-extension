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

import { IExtension, IExtensionPoint, IReader } from "@/core";
import { liftContentScript } from "@/contentScript/backgroundProtocol";
import {
  clearDynamic,
  getInstalledIds,
  runDynamic,
} from "@/contentScript/lifecycle";
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";
import {
  ReaderConfig,
  ReaderDefinition,
  readerFactory,
  ReaderReference,
} from "@/blocks/readers/factory";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import Overlay from "@/nativeEditor/Overlay";
import { checkAvailable as _checkAvailable } from "@/blocks/available";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import { ContextMenuExtensionPoint } from "@/extensionPoints/contextMenu";
import blockRegistry from "@/blocks/registry";
import { Reader } from "@/types";
import { isCustomReader } from "@/devTools/editor/extensionPoints/elementConfig";

export type ElementType =
  | "menuItem"
  | "trigger"
  | "panel"
  | "contextMenu"
  | "actionPanel";

export interface DynamicDefinition<
  TExtensionPoint extends ExtensionPointDefinition = ExtensionPointDefinition,
  // eslint-disable-next-line @typescript-eslint/ban-types -- don't assume anything about keys
  TExtension extends object = object,
  TReader extends ReaderDefinition = ReaderDefinition
> {
  type: ElementType;
  extensionPoint: ExtensionPointConfig<TExtensionPoint>;
  extension: IExtension<TExtension>;
  readers: Array<ReaderConfig<TReader> | ReaderReference>;
}

let _overlay: Overlay | null = null;
const _temporaryExtensions: Map<string, IExtensionPoint> = new Map();

export const clear = liftContentScript(
  "CLEAR_DYNAMIC",
  async ({ uuid }: { uuid?: string }) => {
    clearDynamic(uuid);
    if (uuid) {
      _temporaryExtensions.delete(uuid);
    } else {
      _temporaryExtensions.clear();
    }
  }
);

export const getInstalledExtensionPointIds = liftContentScript(
  "INSTALLED_EXTENSIONS",
  async () => getInstalledIds()
);

type ReaderLike = ReaderConfig | ReaderReference | Reader;

async function buildSingleReader(config: ReaderLike): Promise<IReader> {
  if (config instanceof Reader) {
    return config;
  }

  if (isCustomReader(config)) {
    return readerFactory(config);
  }

  return blockRegistry.lookup(config.metadata.id) as Promise<IReader>;
}

async function buildReaders(configs: ReaderLike[]): Promise<IReader> {
  const array = await Promise.all(
    configs.map(async (config) => buildSingleReader(config))
  );
  return new ArrayCompositeReader(array);
}

export const updateDynamicElement = liftContentScript(
  "UPDATE_DYNAMIC_ELEMENT",
  async ({
    type,
    extensionPoint: extensionPointConfig,
    extension: extensionConfig,
    readers: readerConfig,
  }: DynamicDefinition) => {
    const extensionPoint = extensionPointFactory(extensionPointConfig);

    // The dynamic reader won't be in the registry, so override the defaultReader to be
    // our dynamic reader directly
    if (type === "contextMenu") {
      const reader = await buildReaders(readerConfig);
      (extensionPoint as ContextMenuExtensionPoint).getBaseReader = async () =>
        reader;
    } else {
      const reader = await buildReaders(readerConfig);
      extensionPoint.defaultReader = async () => reader;
    }

    _temporaryExtensions.set(extensionConfig.id, extensionPoint);

    clearDynamic(extensionConfig.id);

    extensionPoint.addExtension(extensionConfig);
    await runDynamic(extensionConfig.id, extensionPoint);
  }
);

export const enableOverlay = liftContentScript(
  "ENABLE_OVERLAY",
  async (selector: string) => {
    if (!selector) {
      throw new Error(`Selector not found: ${selector}`);
    }

    if (_overlay == null) {
      _overlay = new Overlay();
    }

    // eslint-disable-next-line unicorn/no-array-callback-reference -- false positive on JQuery method
    const $elt = $(document).find(selector);
    _overlay.inspect($elt.toArray(), null);
  }
);

export const disableOverlay = liftContentScript("DISABLE_OVERLAY", async () => {
  if (_overlay != null) {
    _overlay.remove();
    _overlay = null;
  }
});

export const checkAvailable = liftContentScript(
  "CHECK_AVAILABLE",
  _checkAvailable
);

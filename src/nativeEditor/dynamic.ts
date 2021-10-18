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

import {
  EmptyConfig,
  IExtension,
  IExtensionPoint,
  IReader,
  ReaderOutput,
  UUID,
} from "@/core";
import { clearDynamic, runDynamic } from "@/contentScript/lifecycle";
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";
import Overlay from "@/nativeEditor/Overlay";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { ElementType } from "@/devTools/editor/extensionPoints/elementConfig";
import { resolveDefinitions } from "@/registry/internal";
import { expectContext } from "@/utils/expectContext";
import {
  ContextMenuExtensionPoint,
  ContextMenuReader,
} from "@/extensionPoints/contextMenu";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";

export interface DynamicDefinition<
  TExtensionPoint extends ExtensionPointDefinition = ExtensionPointDefinition,
  TExtension extends EmptyConfig = EmptyConfig
> {
  type: ElementType;
  extensionPoint: ExtensionPointConfig<TExtensionPoint>;
  extension: IExtension<TExtension>;
}

let _overlay: Overlay | null = null;
const _temporaryExtensions: Map<string, IExtensionPoint> = new Map();

export async function clearDynamicElements({
  uuid,
}: {
  uuid?: UUID;
}): Promise<void> {
  expectContext("contentScript");

  clearDynamic(uuid);
  if (uuid) {
    _temporaryExtensions.delete(uuid);
  } else {
    _temporaryExtensions.clear();
  }
}

/**
 * An "implementation" of ContextMenuReader that produces the same values as the browser would for the chosen context.
 */
const contextMenuReaderShim = {
  isAvailable: async () => true,

  outputSchema: new ContextMenuReader().outputSchema,

  read: async () => {
    const activeElement = document.activeElement;

    const linkProps =
      activeElement?.tagName === "A"
        ? {
            linkText: activeElement.textContent,
            linkUrl: activeElement.getAttribute("href"),
          }
        : { linkText: null, linkUrl: null };

    // XXX: do we need to support SVG here too?
    const mediaType = {
      IMG: "image",
      VIDEO: "video",
      AUDIO: "audio",
    }[activeElement?.tagName];

    return {
      mediaType,
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection#return_value
      selectionText: document.getSelection()?.toString(),
      srcUrl: activeElement?.getAttribute("src"),
      documentUrl: document.location.href,
      ...linkProps,
    };
  },
};

export async function runExtensionPointReader({
  extensionPoint: extensionPointConfig,
}: Pick<DynamicDefinition, "extensionPoint">): Promise<ReaderOutput> {
  expectContext("contentScript");

  const extensionPoint = extensionPointFactory(extensionPointConfig);

  // HACK: same as ContextMenuExtensionPoint, but with the shim reader based on the focused element/selection
  if (extensionPoint instanceof ContextMenuExtensionPoint) {
    extensionPoint.defaultReader = async () =>
      new ArrayCompositeReader([
        await extensionPoint.getBaseReader(),
        (contextMenuReaderShim as unknown) as IReader,
      ]);
  }

  const reader = await extensionPoint.defaultReader();

  // FIXME: this will return an incorrect value in the following scenarios:
  //  - A menuItem uses a readerSelector (which is OK, because that param is not exposed in the Page Editor)
  //  - A trigger that uses the element as the root (e.g., click, blur, etc.)
  return await reader.read(document);
}

export async function updateDynamicElement({
  extensionPoint: extensionPointConfig,
  extension: extensionConfig,
}: DynamicDefinition): Promise<void> {
  expectContext("contentScript");

  const extensionPoint = extensionPointFactory(extensionPointConfig);

  _temporaryExtensions.set(extensionConfig.id, extensionPoint);

  clearDynamic(extensionConfig.id, { clearTrace: false });

  // In practice, should be a no-op because the page editor handles the extensionPoint
  const resolved = await resolveDefinitions(extensionConfig);

  extensionPoint.addExtension(resolved);
  await runDynamic(extensionConfig.id, extensionPoint);
}

export async function enableOverlay(selector: string): Promise<void> {
  expectContext("contentScript");

  if (_overlay == null) {
    _overlay = new Overlay();
  }

  const $elt = $(document).find(selector);
  _overlay.inspect($elt.toArray(), null);
}

export async function disableOverlay(): Promise<void> {
  expectContext("contentScript");

  if (_overlay != null) {
    _overlay.remove();
    _overlay = null;
  }
}

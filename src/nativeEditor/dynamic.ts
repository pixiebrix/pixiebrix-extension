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
  ReaderRoot,
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
import { $safeFind } from "@/helpers";
import { TriggerExtensionPoint } from "@/extensionPoints/triggerExtension";

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
 * An "polyfill" of ContextMenuReader that produces the same values as the browser would for the chosen context.
 */
const contextMenuReaderShim = {
  isAvailable: async () => true,

  outputSchema: new ContextMenuReader().outputSchema,

  read: async () => {
    const { activeElement } = document;

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

export async function runExtensionPointReader(
  {
    extensionPoint: extensionPointConfig,
  }: Pick<DynamicDefinition, "extensionPoint">,
  rootSelector: string | undefined
): Promise<ReaderOutput> {
  expectContext("contentScript");

  const { activeElement } = document;
  let root: ReaderRoot = null;

  // Handle element-based reader context for triggers
  if (rootSelector) {
    const $root = $safeFind(rootSelector);
    if ($root.length === 1) {
      // If there's a single root, use that even if it's not the active element (because that's likely the one the user
      // is intending to use).
      root = $root.get(0);
    } else if ($root.length > 1 && activeElement) {
      $root.each(function () {
        if (activeElement === this) {
          root = activeElement as HTMLElement;
        }
      });

      if (root == null) {
        throw new Error(
          `Focused element ${activeElement.tagName} does not match the root selector. There are ${$root.length} matching elements on the page`
        );
      }
    } else if ($root.length === 0) {
      throw new Error(
        `No elements matching selector are currently on the page: ${rootSelector}`
      );
    }
  }

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

  // FIXME: this will return an incorrect value in the following scenario(s):
  //  - A menuItem uses a readerSelector (which is OK, because that param is not exposed in the Page Editor)
  return reader.read(root ?? document);
}

export async function updateDynamicElement({
  extensionPoint: extensionPointConfig,
  extension: extensionConfig,
}: DynamicDefinition): Promise<void> {
  expectContext("contentScript");

  const extensionPoint = extensionPointFactory(extensionPointConfig);

  // HACK: hack so that when using the Page Editor the interval trigger only runs when you manually trigger it
  //  Otherwise it's hard to work with the interval trigger because you keep losing the trace from the previous run
  if (
    extensionPoint instanceof TriggerExtensionPoint &&
    extensionPoint.trigger === "interval"
  ) {
    Object.defineProperty(extensionPoint, "trigger", {
      get() {
        return "load";
      },
    });
  }

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

  const $elt = $safeFind(selector);
  _overlay.inspect($elt.toArray(), null);
}

export async function disableOverlay(): Promise<void> {
  expectContext("contentScript");

  if (_overlay != null) {
    _overlay.remove();
    _overlay = null;
  }
}

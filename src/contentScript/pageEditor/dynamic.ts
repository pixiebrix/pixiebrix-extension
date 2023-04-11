/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
  clearEditorExtension,
  runEditorExtension,
} from "@/contentScript/lifecycle";
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";
import Overlay from "@/vendors/Overlay";
import { resolveDefinitions } from "@/registry/internal";
import { expectContext } from "@/utils/expectContext";
import { $safeFind } from "@/helpers";
import { type TriggerDefinition } from "@/extensionPoints/triggerExtension";
import type { DynamicDefinition } from "@/contentScript/pageEditor/types";
import {
  activateExtensionPanel,
  ensureSidebar,
} from "@/contentScript/sidebarController";
import { type TourDefinition } from "@/extensionPoints/tourExtension";
import { type JsonObject } from "type-fest";
import { type SelectorRoot } from "@/types/runtimeTypes";
import { type UUID } from "@/types/stringTypes";
import { type IExtensionPoint } from "@/types/extensionPointTypes";

let _overlay: Overlay | null = null;
const _temporaryExtensions = new Map<string, IExtensionPoint>();

export async function clearDynamicElements({
  uuid,
}: {
  uuid?: UUID;
}): Promise<void> {
  expectContext("contentScript");

  clearEditorExtension(uuid);
  if (uuid) {
    _temporaryExtensions.delete(uuid);
  } else {
    _temporaryExtensions.clear();
  }
}

export async function runExtensionPointReader(
  { extensionPointConfig }: Pick<DynamicDefinition, "extensionPointConfig">,
  rootSelector: string | undefined
): Promise<JsonObject> {
  expectContext("contentScript");

  const { activeElement } = document;
  let root: SelectorRoot = null;

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

  const reader = await extensionPoint.previewReader();

  // FIXME: this will return an incorrect value in the following scenario(s):
  //  - A menuItem uses a readerSelector (which is OK, because that param is not exposed in the Page Editor)
  return reader.read(root ?? document);
}

export async function updateDynamicElement({
  extensionPointConfig,
  extension: extensionConfig,
}: DynamicDefinition): Promise<void> {
  expectContext("contentScript");

  // HACK: adjust behavior when using the Page Editor
  if (extensionPointConfig.definition.type === "trigger") {
    // Prevent auto-run of interval trigger when using the Page Editor because you lose track of trace across runs
    const triggerDefinition =
      extensionPointConfig.definition as TriggerDefinition;
    if (triggerDefinition.trigger === "interval") {
      // OK to assign directly since the object comes from the messenger (so we have a fresh object)
      triggerDefinition.trigger = "load";
    }
  } else if (extensionPointConfig.definition.type === "tour") {
    // Prevent auto-run of tour when using the Page Editor
    const tourDefinition = extensionPointConfig.definition as TourDefinition;
    tourDefinition.autoRunSchedule = "never";
  }

  const extensionPoint = extensionPointFactory(extensionPointConfig);

  _temporaryExtensions.set(extensionConfig.id, extensionPoint);

  // Don't clear actionPanel because it causes flicking between the tabs in the sidebar. The updated dynamic element
  // will automatically replace the old panel because the panels are keyed by extension id
  if (extensionPoint.kind !== "actionPanel") {
    clearEditorExtension(extensionConfig.id, { clearTrace: false });
  }

  // In practice, should be a no-op because the Page Editor handles the extensionPoint
  const resolved = await resolveDefinitions(extensionConfig);

  extensionPoint.addExtension(resolved);
  await runEditorExtension(extensionConfig.id, extensionPoint);

  if (extensionPoint.kind === "actionPanel") {
    await ensureSidebar();
    await activateExtensionPanel(extensionConfig.id);
  }
}

export async function enableOverlay(selector: string): Promise<void> {
  expectContext("contentScript");

  if (_overlay == null) {
    _overlay = new Overlay();
  }

  const elements = $safeFind(selector).toArray();
  if (elements.length > 0) {
    _overlay.inspect(elements, null);
  }
}

export async function disableOverlay(): Promise<void> {
  expectContext("contentScript");

  _overlay?.remove();
  _overlay = null;
}

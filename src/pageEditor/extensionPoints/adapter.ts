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

import { type IExtension } from "@/types/extensionTypes";
import { registry } from "@/background/messenger/api";
import {
  type ExtensionPointConfig,
  type ExtensionPointType,
} from "@/extensionPoints/types";
import menuItemExtension from "@/pageEditor/extensionPoints/menuItem";
import quickBarExtension from "@/pageEditor/extensionPoints/quickBar";
import triggerExtension from "@/pageEditor/extensionPoints/trigger";
import panelExtension from "@/pageEditor/extensionPoints/panel";
import contextMenuExtension from "@/pageEditor/extensionPoints/contextMenu";
import sidebarExtension from "@/pageEditor/extensionPoints/sidebar";
import quickBarProviderExtension from "@/pageEditor/extensionPoints/quickBarProvider";
import tourExtension from "@/pageEditor/extensionPoints/tour";
import { type ElementConfig } from "@/pageEditor/extensionPoints/elementConfig";
import { hasInnerExtensionPointRef } from "@/registry/internal";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { type DynamicDefinition } from "@/contentScript/pageEditor/types";

export const ADAPTERS = new Map<ExtensionPointType, ElementConfig>([
  ["trigger", triggerExtension],
  ["panel", panelExtension],
  ["contextMenu", contextMenuExtension],
  ["actionPanel", sidebarExtension],
  ["menuItem", menuItemExtension],
  ["quickBar", quickBarExtension],
  ["quickBarProvider", quickBarProviderExtension],
  ["tour", tourExtension],
]);

export async function selectType(
  extension: IExtension
): Promise<ExtensionPointType> {
  if (hasInnerExtensionPointRef(extension)) {
    return (
      extension.definitions[
        extension.extensionPointId
      ] as unknown as ExtensionPointConfig
    ).definition.type;
  }

  console.log("*** extgension point id", extension.extensionPointId);
  const brick = await registry.find(extension.extensionPointId);
  if (!brick) {
    console.error("Cannot find starter brick", {
      extensionPointId: extension.extensionPointId,
      extension,
    });
    throw new Error("Cannot find starter brick");
  }

  const extensionPoint = brick.config as unknown as ExtensionPointConfig;
  return extensionPoint.definition.type;
}

export async function extensionToFormState(
  extension: IExtension
): Promise<FormState> {
  const type = await selectType(extension);
  const { fromExtension } = ADAPTERS.get(type);
  if (!fromExtension) {
    throw new Error(
      `Editing existing extensions not implemented for type: '${type}'`
    );
  }

  // FormState is the sum type of all the extension form states, so OK to cast
  return fromExtension(extension) as Promise<FormState>;
}

export function formStateToDynamicElement(
  formState: FormState
): DynamicDefinition {
  const elementConfig = ADAPTERS.get(formState.type);
  return elementConfig.asDynamicElement(formState);
}

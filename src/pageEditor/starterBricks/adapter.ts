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

import { type ModComponentBase } from "@/types/modComponentTypes";
import { registry } from "@/background/messenger/api";
import { type StarterBrickConfig } from "@/starterBricks/types";
import { type StarterBrickType } from "@/starterBricks/StarterBrickType";
import menuItemExtension from "@/pageEditor/starterBricks/menuItem";
import quickBarExtension from "@/pageEditor/starterBricks/quickBar";
import triggerExtension from "@/pageEditor/starterBricks/trigger";
import panelExtension from "@/pageEditor/starterBricks/panel";
import contextMenuExtension from "@/pageEditor/starterBricks/contextMenu";
import sidebarExtension from "@/pageEditor/starterBricks/sidebar";
import quickBarProviderExtension from "@/pageEditor/starterBricks/quickBarProvider";
import tourExtension from "@/pageEditor/starterBricks/tour";
import { type ElementConfig } from "@/pageEditor/starterBricks/elementConfig";
import { hasInnerExtensionPointRef } from "@/registry/internal";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { type DynamicDefinition } from "@/contentScript/pageEditor/types";

export const ADAPTERS = new Map<StarterBrickType, ElementConfig>([
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
  extension: ModComponentBase
): Promise<StarterBrickType> {
  if (hasInnerExtensionPointRef(extension)) {
    return (
      extension.definitions[
        extension.extensionPointId
      ] as unknown as StarterBrickConfig
    ).definition.type;
  }

  const brick = await registry.find(extension.extensionPointId);
  if (!brick) {
    console.error("Cannot find starter brick", {
      extensionPointId: extension.extensionPointId,
      extension,
    });
    throw new Error("Cannot find starter brick");
  }

  const extensionPoint = brick.config as unknown as StarterBrickConfig;
  return extensionPoint.definition.type;
}

export async function extensionToFormState(
  extension: ModComponentBase
): Promise<ModComponentFormState> {
  const type = await selectType(extension);
  const { fromExtension } = ADAPTERS.get(type);
  if (!fromExtension) {
    throw new Error(
      `Editing existing extensions not implemented for type: '${type}'`
    );
  }

  // FormState is the sum type of all the extension form states, so OK to cast
  return fromExtension(extension) as Promise<ModComponentFormState>;
}

export function formStateToDynamicElement(
  formState: ModComponentFormState
): DynamicDefinition {
  const elementConfig = ADAPTERS.get(formState.type);
  return elementConfig.asDynamicElement(formState);
}

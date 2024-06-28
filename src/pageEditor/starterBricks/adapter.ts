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

import { type ModComponentBase } from "@/types/modComponentTypes";
import { registry } from "@/background/messenger/api";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import {
  type StarterBrickKind,
  StarterBrickKinds,
} from "@/types/starterBrickTypes";
import menuItemExtension from "@/pageEditor/starterBricks/menuItem";
import quickBarExtension from "@/pageEditor/starterBricks/quickBar";
import triggerExtension from "@/pageEditor/starterBricks/trigger";
import panelExtension from "@/pageEditor/starterBricks/panel";
import contextMenuExtension from "@/pageEditor/starterBricks/contextMenu";
import sidebarExtension from "@/pageEditor/starterBricks/sidebar";
import quickBarProviderExtension from "@/pageEditor/starterBricks/quickBarProvider";
import tourExtension from "@/pageEditor/starterBricks/tour";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import { hasInnerStarterBrickRef } from "@/registry/hydrateInnerDefinitions";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { type DraftModComponent } from "@/contentScript/pageEditor/types";
import { assertNotNullish } from "@/utils/nullishUtils";

export const ADAPTERS = new Map<StarterBrickKind, ModComponentFormStateAdapter>(
  [
    [StarterBrickKinds.TRIGGER, triggerExtension],
    [StarterBrickKinds.INLINE_PANEL, panelExtension],
    [StarterBrickKinds.CONTEXT_MENU, contextMenuExtension],
    [StarterBrickKinds.SIDEBAR_PANEL, sidebarExtension],
    [StarterBrickKinds.BUTTON, menuItemExtension],
    [StarterBrickKinds.QUICK_BAR_ACTION, quickBarExtension],
    [StarterBrickKinds.DYNAMIC_QUICK_BAR, quickBarProviderExtension],
    [StarterBrickKinds.TOUR, tourExtension],
  ],
);

export async function selectType(
  extension: ModComponentBase,
): Promise<StarterBrickKind> {
  if (hasInnerStarterBrickRef(extension)) {
    const { extensionPointId, definitions } = extension;
    return (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- checked by hasInnerExtensionPointRef
      (definitions![extensionPointId] as unknown as StarterBrickDefinitionLike)
        .definition.type
    );
  }

  const brick = await registry.find(extension.extensionPointId);
  if (!brick) {
    console.error("Cannot find starter brick", {
      extensionPointId: extension.extensionPointId,
      extension,
    });
    throw new Error("Cannot find starter brick");
  }

  const extensionPoint = brick.config as unknown as StarterBrickDefinitionLike;
  return extensionPoint.definition.type;
}

export async function modComponentToFormState(
  modComponent: ModComponentBase,
): Promise<ModComponentFormState> {
  const starterBrickType = await selectType(modComponent);
  const { fromExtension } = ADAPTERS.get(starterBrickType) ?? {};
  if (!fromExtension) {
    throw new Error(
      `Editing existing mod components not implemented for starter brick type: '${starterBrickType}'`,
    );
  }

  // FormState is the sum type of all the modComponent form states, so OK to cast
  return fromExtension(modComponent) as Promise<ModComponentFormState>;
}

export function formStateToDraftModComponent(
  formState: ModComponentFormState,
): DraftModComponent {
  const elementConfig = ADAPTERS.get(formState.type);
  assertNotNullish(
    elementConfig,
    `No adapter found for starter brick type: ${formState.type}`,
  );
  return elementConfig.asDraftModComponent(formState);
}

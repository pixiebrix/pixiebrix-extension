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
  type StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import buttonModComponent from "@/pageEditor/starterBricks/button";
import quickBarActionModComponent from "@/pageEditor/starterBricks/quickBar";
import triggerModComponent from "@/pageEditor/starterBricks/trigger";
import contextMenuModComponent from "@/pageEditor/starterBricks/contextMenu";
import sidebarPanelModComponent from "@/pageEditor/starterBricks/sidebar";
import quickBarProviderModComponent from "@/pageEditor/starterBricks/quickBarProvider";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import { hasInnerStarterBrickRef } from "@/registry/hydrateInnerDefinitions";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { type DraftModComponent } from "@/contentScript/pageEditor/types";
import { assertNotNullish } from "@/utils/nullishUtils";

const ADAPTERS = new Map<StarterBrickType, ModComponentFormStateAdapter>([
  [StarterBrickTypes.TRIGGER, triggerModComponent],
  [StarterBrickTypes.CONTEXT_MENU, contextMenuModComponent],
  [StarterBrickTypes.SIDEBAR_PANEL, sidebarPanelModComponent],
  [StarterBrickTypes.BUTTON, buttonModComponent],
  [StarterBrickTypes.QUICK_BAR_ACTION, quickBarActionModComponent],
  [StarterBrickTypes.DYNAMIC_QUICK_BAR, quickBarProviderModComponent],
]);

export const ALL_ADAPTERS = [...ADAPTERS.values()];

export function adapter(
  starterBrickType: StarterBrickType,
): ModComponentFormStateAdapter {
  const adapter = ADAPTERS.get(starterBrickType);
  assertNotNullish(
    adapter,
    `No adapter found for starter brick type: ${starterBrickType}`,
  );
  return adapter;
}

export function adapterForComponent(
  formState: ModComponentFormState,
): ModComponentFormStateAdapter {
  return adapter(formState.starterBrick.definition.type);
}

export async function selectType(
  modComponent: ModComponentBase,
): Promise<StarterBrickType> {
  if (hasInnerStarterBrickRef(modComponent)) {
    const { extensionPointId: starterBrickId, definitions } = modComponent;
    return (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- checked by hasInnerStarterBrickRef
      (definitions![starterBrickId] as unknown as StarterBrickDefinitionLike)
        .definition.type
    );
  }

  const brick = await registry.find(modComponent.extensionPointId);
  if (!brick) {
    console.error("Cannot find starter brick", {
      extensionPointId: modComponent.extensionPointId,
      extension: modComponent,
    });
    throw new Error("Cannot find starter brick");
  }

  const starterBrick = brick.config as unknown as StarterBrickDefinitionLike;
  return starterBrick.definition.type;
}

export async function modComponentToFormState(
  modComponent: ModComponentBase,
): Promise<ModComponentFormState> {
  const starterBrickType = await selectType(modComponent);
  const { fromModComponent } = ADAPTERS.get(starterBrickType) ?? {};
  if (!fromModComponent) {
    throw new Error(
      `Editing existing mod components not implemented for starter brick type: '${starterBrickType}'`,
    );
  }

  // FormState is the sum type of all the modComponent form states, so OK to cast
  return fromModComponent(modComponent) as Promise<ModComponentFormState>;
}

export function formStateToDraftModComponent(
  modComponentFormState: ModComponentFormState,
): DraftModComponent {
  const starterBrickType = modComponentFormState.starterBrick.definition.type;
  const adapter = ADAPTERS.get(starterBrickType);
  assertNotNullish(
    adapter,
    `No adapter found for starter brick type: ${starterBrickType}`,
  );
  return adapter.asDraftModComponent(modComponentFormState);
}

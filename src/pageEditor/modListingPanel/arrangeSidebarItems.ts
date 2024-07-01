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

import { sortBy } from "lodash";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { type UUID } from "@/types/stringTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import {
  isModSidebarItem,
  type ModComponentSidebarItem,
  type ModSidebarItem,
  type SidebarItem,
} from "@/pageEditor/modListingPanel/common";

type ArrangeSidebarItemsArgs = {
  modComponentFormStates: ModComponentFormState[];
  cleanModComponents: ModComponentBase[];
};

function arrangeSidebarItems({
  modComponentFormStates,
  cleanModComponents,
}: ArrangeSidebarItemsArgs): SidebarItem[] {
  const modSidebarItems: Record<RegistryId, ModSidebarItem> = {};
  const orphanSidebarItems: ModComponentSidebarItem[] = [];

  const formStateModComponentIds = new Set<UUID>();

  for (const formState of modComponentFormStates) {
    formStateModComponentIds.add(formState.uuid);

    if (formState.recipe == null) {
      orphanSidebarItems.push(formState);
    } else {
      const modSidebarItem = modSidebarItems[formState.recipe.id] ?? {
        modMetadata: formState.recipe,
        modComponents: [],
      };
      modSidebarItem.modComponents.push(formState);
      modSidebarItems[formState.recipe.id] = modSidebarItem;
    }
  }

  const cleanModComponentsWithoutFormStates = cleanModComponents.filter(
    (modComponent) => !formStateModComponentIds.has(modComponent.id),
  );

  for (const cleanModComponent of cleanModComponentsWithoutFormStates) {
    if (cleanModComponent._recipe == null) {
      orphanSidebarItems.push(cleanModComponent);
    } else {
      const modSidebarItem = modSidebarItems[cleanModComponent._recipe.id] ?? {
        modMetadata: cleanModComponent._recipe,
        modComponents: [],
      };
      modSidebarItem.modComponents.push(cleanModComponent);
      modSidebarItems[cleanModComponent._recipe.id] = modSidebarItem;
    }
  }

  for (const modSidebarItem of Object.values(modSidebarItems)) {
    modSidebarItem.modComponents.sort((a, b) =>
      a.label.toLowerCase().localeCompare(b.label.toLowerCase()),
    );
  }

  return sortBy(
    [...Object.values(modSidebarItems), ...orphanSidebarItems],
    (item) =>
      isModSidebarItem(item)
        ? item.modMetadata.name.toLowerCase()
        : item.label.toLowerCase(),
  );
}

export default arrangeSidebarItems;

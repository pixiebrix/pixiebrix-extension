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
import { type ModComponentFormState } from "../starterBricks/formStateTypes";
import { type UUID } from "../../types/stringTypes";
import { type ModComponentBase } from "../../types/modComponentTypes";
import { type RegistryId } from "../../types/registryTypes";
import { type SidebarItem } from "./common";

type ArrangeSidebarItemsArgs = {
  modComponentFormStates: ModComponentFormState[];
  cleanModComponents: ModComponentBase[];
};

function arrangeSidebarItems({
  modComponentFormStates,
  cleanModComponents,
}: ArrangeSidebarItemsArgs): SidebarItem[] {
  const modSidebarItems: Record<RegistryId, SidebarItem> = {};

  const formStateModComponentIds = new Set<UUID>();

  for (const formState of modComponentFormStates) {
    formStateModComponentIds.add(formState.uuid);

    const modSidebarItem = modSidebarItems[formState.modMetadata.id] ?? {
      modMetadata: formState.modMetadata,
      modComponents: [],
    };

    modSidebarItem.modComponents.push(formState);
    modSidebarItems[formState.modMetadata.id] = modSidebarItem;
  }

  const cleanModComponentsWithoutFormStates = cleanModComponents.filter(
    (modComponent) => !formStateModComponentIds.has(modComponent.id),
  );

  for (const cleanModComponent of cleanModComponentsWithoutFormStates) {
    const modSidebarItem = modSidebarItems[
      cleanModComponent.modMetadata.id
    ] ?? {
      modMetadata: cleanModComponent.modMetadata,
      modComponents: [],
    };
    modSidebarItem.modComponents.push(cleanModComponent);
    modSidebarItems[cleanModComponent.modMetadata.id] = modSidebarItem;
  }

  for (const modSidebarItem of Object.values(modSidebarItems)) {
    modSidebarItem.modComponents.sort((a, b) =>
      a.label.toLowerCase().localeCompare(b.label.toLowerCase()),
    );
  }

  return sortBy(Object.values(modSidebarItems), (item) =>
    item.modMetadata.name.toLowerCase(),
  );
}

export default arrangeSidebarItems;

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
  getModComponentItemId,
  isModSidebarItem,
  type SidebarItem,
} from "@/pageEditor/sidebar/common";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { lowerCase } from "lodash";

type FilterSidebarItemsArgs = {
  sidebarItems: SidebarItem[];
  filterText: string;
  activeModId: RegistryId | null;
  activeModComponentId: UUID | null;
};

export default function filterSidebarItems({
  sidebarItems,
  filterText,
  activeModId,
  activeModComponentId,
}: FilterSidebarItemsArgs): SidebarItem[] {
  if (filterText.length === 0) {
    return sidebarItems;
  }

  return sidebarItems.filter((sidebarItem) => {
    if (isModSidebarItem(sidebarItem)) {
      // Don't filter out mod item if the mod is active, or the name matches the query
      if (
        sidebarItem.modMetadata.id === activeModId ||
        lowerCase(sidebarItem.modMetadata.name).includes(filterText)
      ) {
        return true;
      }

      // Don't filter out mod item if any mod component is active, or any mod component label matches the query
      for (const modComponentItem of sidebarItem.modComponents) {
        if (
          getModComponentItemId(modComponentItem) === activeModComponentId ||
          lowerCase(modComponentItem.label).includes(filterText)
        ) {
          return true;
        }
      }

      return false;
    }

    // Don't filter out mod component item if the mod component is active, or the label matches the query
    return (
      getModComponentItemId(sidebarItem) === activeModComponentId ||
      lowerCase(sidebarItem.label).includes(filterText)
    );
  });
}

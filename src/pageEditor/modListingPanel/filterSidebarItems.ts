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

import {
  getModComponentItemId,
  type ModSidebarItem,
} from "@/pageEditor/modListingPanel/common";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";

type FilterSidebarItemsArgs = {
  sidebarItems: ModSidebarItem[];
  filterText: string;
  activeModId: RegistryId | null;
  activeModComponentId: UUID | null;
};

const caseInsensitiveIncludes = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.toLowerCase());

export default function filterSidebarItems({
  sidebarItems,
  filterText,
  activeModId,
  activeModComponentId,
}: FilterSidebarItemsArgs): ModSidebarItem[] {
  if (filterText.length === 0) {
    return sidebarItems;
  }

  return sidebarItems
    .map((sidebarItem) => {
      // Check if the mod itself matches the filter
      const modMatches =
        sidebarItem.modMetadata.id === activeModId ||
        caseInsensitiveIncludes(sidebarItem.modMetadata.name, filterText);

      // If the mod matches, return the item with all its components
      if (modMatches) {
        return sidebarItem;
      }

      // Filter modComponents only if the mod itself doesn't match
      const filteredComponents = sidebarItem.modComponents.filter(
        (modComponentItem) =>
          getModComponentItemId(modComponentItem) === activeModComponentId ||
          caseInsensitiveIncludes(modComponentItem.label, filterText),
      );

      // If there are matching components, return the modified item
      if (filteredComponents.length > 0) {
        return {
          ...sidebarItem,
          modComponents: filteredComponents,
        };
      }

      // If neither the mod nor any components match, return null
      return null;
    })
    .filter((item): item is ModSidebarItem => item != null);
}

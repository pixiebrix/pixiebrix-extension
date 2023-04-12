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

import { type MarketplaceListing, type MarketplaceTag } from "@/types/contract";
import { type RegistryId } from "@/types/registryTypes";
import { isEmpty } from "lodash";

const EMPTY_TAGGED_BRICK_IDS: Record<string, Set<RegistryId>> = {};

/**
 * Groups marketplace listings by their tags
 * @param marketplaceTags The tags to use as grouping keys
 * @param listings The listings to group
 * @returns Record<string, Set<RegistryId>> A record with the tag names as keys, and sets of listings as the values
 */
function groupListingsByTag(
  marketplaceTags: MarketplaceTag[],
  listings: Record<RegistryId, MarketplaceListing>
): Record<string, Set<RegistryId>> {
  if (isEmpty(marketplaceTags) || isEmpty(listings)) {
    return EMPTY_TAGGED_BRICK_IDS;
  }

  // Create the Record with tag name keys and empty Set values
  const taggedBrickIds = Object.fromEntries(
    marketplaceTags.map((tag) => [tag.name, new Set<RegistryId>()])
  );

  // Populate the Record value Sets with listings that apply to each tag
  for (const [id, listing] of Object.entries(listings)) {
    const registryId = id as RegistryId;

    for (const listingTag of listing.tags) {
      // The null-safe access (?.) here is just for safety in case the api
      // endpoints for listings and tags get out of sync somehow
      taggedBrickIds[listingTag.name]?.add(registryId);
    }
  }

  return taggedBrickIds;
}

export default groupListingsByTag;

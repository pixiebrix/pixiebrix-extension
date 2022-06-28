/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { MarketplaceListing, MarketplaceTag } from "@/types/contract";
import { RegistryId } from "@/core";
import { isEmpty } from "lodash";
import { POPULAR_BRICK_TAG_ID } from "@/components/addBlockModal/addBlockModalCore";

function groupListingsByTag(
  marketplaceTags: MarketplaceTag[],
  listings: Record<RegistryId, MarketplaceListing>
): {
  /**
   * A record with tag names as the keys, and a set of applicable brick registry ids as the values
   */
  taggedBrickIds: Record<string, Set<RegistryId>>;

  /**
   * A set of brick ids that have been tagged as "popular"
   */
  popularBrickIds: Set<RegistryId>;
} {
  if (isEmpty(marketplaceTags) || isEmpty(listings)) {
    return {
      taggedBrickIds: {},
      popularBrickIds: new Set<RegistryId>(),
    };
  }

  const categoryTags = marketplaceTags.filter((tag) => tag.subtype === "role");

  const taggedBrickIds = Object.fromEntries(
    categoryTags.map((tag) => [tag.name, new Set<RegistryId>()])
  );
  const popularBrickIds = new Set<RegistryId>();

  for (const [id, listing] of Object.entries(listings)) {
    const registryId = id as RegistryId;

    for (const listingTag of listing.tags) {
      if (listingTag.id === POPULAR_BRICK_TAG_ID) {
        popularBrickIds.add(registryId);
      }

      taggedBrickIds[listingTag.name]?.add(registryId);
    }
  }

  return { taggedBrickIds, popularBrickIds };
}

export default groupListingsByTag;

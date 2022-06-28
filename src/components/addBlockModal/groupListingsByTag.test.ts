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

import {
  marketplaceListingFactory,
  marketplaceTagFactory,
} from "@/testUtils/factories";
import { POPULAR_BRICK_TAG_ID } from "@/components/addBlockModal/addBlockModalCore";
import groupListingsByTag from "@/components/addBlockModal/groupListingsByTag";

describe("groupListingsByTag", () => {
  it("groups tags", () => {
    const popular = marketplaceTagFactory({
      subtype: "generic",
      id: POPULAR_BRICK_TAG_ID,
      name: "Popular",
    });
    const category = marketplaceTagFactory({ subtype: "role", name: "Other" });
    const other = marketplaceTagFactory({
      subtype: "service",
      name: "Cat Facts",
    });

    const popularListing = marketplaceListingFactory({
      tags: [popular, category, other],
    });

    const { taggedBrickIds, popularBrickIds } = groupListingsByTag(
      [popular, other, category],
      { [popularListing.package.name]: popularListing }
    );

    expect(taggedBrickIds).toStrictEqual({
      [category.name]: new Set([popularListing.package.name]),
    });

    expect(popularBrickIds).toStrictEqual(
      new Set([popularListing.package.name])
    );
  });
});

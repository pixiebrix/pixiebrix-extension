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
import groupListingsByTag from "@/components/addBlockModal/groupListingsByTag";

describe("groupListingsByTag", () => {
  it("groups tags", () => {
    const popular = marketplaceTagFactory({
      subtype: "generic",
      name: "Popular",
    });
    const category = marketplaceTagFactory({ subtype: "role", name: "Other" });
    const other = marketplaceTagFactory({
      subtype: "service",
      name: "Cat Facts",
    });

    const popularListing = marketplaceListingFactory({
      tags: [popular, category],
    });
    const regularListing = marketplaceListingFactory({
      tags: [category],
    });
    const otherListing = marketplaceListingFactory({
      tags: [other],
    });

    const taggedBrickIds = groupListingsByTag([popular, other, category], {
      [popularListing.package.name]: popularListing,
      [regularListing.package.name]: regularListing,
      [otherListing.package.name]: otherListing,
    });

    expect(taggedBrickIds).toStrictEqual({
      [popular.name]: new Set([popularListing.package.name]),
      [category.name]: new Set([
        popularListing.package.name,
        regularListing.package.name,
      ]),
      [other.name]: new Set([otherListing.package.name]),
    });
  });
});

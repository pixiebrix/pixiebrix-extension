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

import { define } from "cooky-cutter";
import { type MarketplaceListing, type MarketplaceTag } from "@/types/contract";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { DefinitionKinds } from "@/types/registryTypes";

export const marketplaceTagFactory = define<MarketplaceTag>({
  id: uuidSequence,
  name: (n: number) => `Tag ${n}`,
  slug: (n: number) => `tag-${n}`,
  subtype: "generic",
  fa_icon: "fab abacus",
});

/**
 * Create a MarketplaceListing.package for a ModDefinition.
 */
export function modDefinitionToMarketplacePackage(
  modDefinition: ModDefinition,
): MarketplaceListing["package"] {
  return {
    name: modDefinition.metadata.name,
    description: modDefinition.metadata.description ?? "",
    version: modDefinition.metadata.version,
    config: modDefinition as unknown as UnknownObject,
    kind: DefinitionKinds.MOD,
    author: {},
    organization: {},
  };
}

export const marketplaceListingFactory = define<MarketplaceListing>({
  id: uuidSequence,
  fa_icon: "fab abacus",
  image: (n: number) => ({
    url: `https://marketplace.dev/${n}`,
  }),
  assets: () => [] as MarketplaceListing["assets"],
  tags: () => [] as MarketplaceListing["tags"],
  package: (n: number) =>
    ({
      id: uuidSequence,
      name: `@test/test-${n}`,
    }) as unknown as MarketplaceListing["package"],
});

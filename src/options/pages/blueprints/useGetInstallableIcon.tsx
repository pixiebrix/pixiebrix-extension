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

import { useGetMarketplaceListingsQuery } from "@/services/api";
import { RegistryId } from "@/core";
import { MarketplaceListing } from "@/types/contract";
import React, { useCallback } from "react";
import InstallableIcon from "@/options/pages/blueprints/InstallableIcon";

function useGetInstallableIcon() {
  const { data: listings } = useGetMarketplaceListingsQuery();

  return useCallback(
    (packageId: RegistryId) => {
      if (!listings) {
        return null;
      }

      const listing: MarketplaceListing | null = listings[packageId];
      return <InstallableIcon listing={listing} />;
    },
    [listings]
  );
}

export default useGetInstallableIcon;

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

import { appApi, useGetEditablePackagesQuery } from "@/data/service/api";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { useCallback } from "react";

/**
 * Hook to get the package version for a given mod definition.
 * @returns A function that takes a ModDefinition and returns the corresponding package version ID.
 */
export function useGetModDefinitionPackageVersion() {
  const { data: editablePackages } = useGetEditablePackagesQuery();
  const [fetchPackageVersions] =
    appApi.endpoints.listPackageVersions.useLazyQuery();

  return useCallback(
    async (modDefinition: ModDefinition): Promise<string | null> => {
      const packageId = editablePackages?.find(
        (x) => x.name === modDefinition.metadata.id,
      )?.id;

      if (!packageId) {
        return null;
      }

      const packageVersions = await fetchPackageVersions({
        id: packageId,
      }).unwrap();

      const packageVersion = packageVersions.find(
        (modVersion) => modVersion.version === modDefinition.metadata.version,
      );

      return packageVersion?.id ?? null;
    },
    [editablePackages, fetchPackageVersions],
  );
}

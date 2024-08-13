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

import { type Mod, type ModStatus, type ModViewItem } from "@/types/modTypes";
import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import { type UUID } from "@/types/stringTypes";

import {
  getDescription,
  getInstalledVersionNumber,
  getLabel,
  getPackageId,
  getSharingSource,
  getUpdatedAt,
  isDeployment,
  isStandaloneModComponent,
  isUnavailableMod,
  updateAvailable,
} from "@/utils/modUtils";
import { useGetMarketplaceListingsQuery } from "@/data/service/api";
import { selectOrganizations, selectScope } from "@/auth/authSelectors";
import { isDeploymentActive } from "@/utils/deploymentUtils";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { compact } from "lodash";
import { type RegistryId } from "@/types/registryTypes";
import { type ActivatedModComponent } from "@/types/modComponentTypes";

function useModViewItems(mods: Mod[]): {
  modViewItems: readonly ModViewItem[];
  isLoading: boolean;
} {
  const scope = useSelector(selectScope);
  const activatedModComponents = useSelector(selectActivatedModComponents);
  const organizations = useSelector(selectOrganizations);

  // Don't merge async states. Allow hook to render without listings
  const { data: listings } = useGetMarketplaceListingsQuery();
  const { data: modDefinitions, isLoading: isRecipesLoading } =
    useAllModDefinitions();

  const { activatedModComponentIds, activatedModIds } = useMemo(
    () => ({
      activatedModComponentIds: new Set<UUID>(
        activatedModComponents.map((extension) => extension.id),
      ),
      activatedModIds: new Set(
        compact(
          activatedModComponents.map((extension) => extension._recipe?.id),
        ),
      ),
    }),
    [activatedModComponents],
  );

  const isActive = useCallback(
    (mod: Mod) => {
      if (isStandaloneModComponent(mod)) {
        return activatedModComponentIds.has(mod.id);
      }

      return activatedModIds.has(mod.metadata.id);
    },
    [activatedModComponentIds, activatedModIds],
  );

  const getStatus = useCallback(
    (mod: Mod): ModStatus => {
      if (isDeployment(mod, activatedModComponents)) {
        if (isStandaloneModComponent(mod)) {
          return isDeploymentActive(mod) ? "Active" : "Paused";
        }

        const componentFromDeployment = activatedModComponents.find(
          (activatedModComponent) =>
            activatedModComponent._recipe?.id === getPackageId(mod) &&
            activatedModComponent._deployment,
        );
        if (!componentFromDeployment) {
          return "Inactive";
        }

        return isDeploymentActive(componentFromDeployment)
          ? "Active"
          : "Paused";
      }

      return isActive(mod) ? "Active" : "Inactive";
    },
    [activatedModComponents, isActive],
  );

  const modViewItems = useMemo(() => {
    // Load to map for fast lookup if you have a lot of modDefinitions. Could put in its own memo
    const modDefinitionMap = new Map(
      (modDefinitions ?? []).map((modDefinition) => [
        modDefinition.metadata.id,
        modDefinition,
      ]),
    );

    const modComponentEntries: Array<[RegistryId, ActivatedModComponent]> =
      compact(
        activatedModComponents.map((modComponent) => {
          if (modComponent._recipe) {
            return [modComponent._recipe.id, modComponent];
          }

          return null;
        }),
      );

    // Map from mod registry id to any mod component for that mod. Used to check for updates.
    // Can pick any mod component, because all their versions will be the same
    const modIdComponentMap = new Map(modComponentEntries);

    return mods.map((mod) => {
      const packageId = getPackageId(mod);

      let listingId: UUID | null = null;
      if (packageId && listings) {
        // eslint-disable-next-line security/detect-object-injection -- packageId is a registry id
        listingId = listings[packageId]?.id ?? null;
      }

      return {
        name: getLabel(mod),
        description: getDescription(mod),
        sharing: {
          packageId,
          source: getSharingSource({
            mod,
            organizations,
            scope,
            installedExtensions: activatedModComponents,
          }),
          listingId,
        },
        updatedAt: getUpdatedAt(mod),
        status: getStatus(mod),
        hasUpdate: updateAvailable(modDefinitionMap, modIdComponentMap, mod),
        installedVersionNumber: getInstalledVersionNumber(
          activatedModComponents,
          mod,
        ),
        unavailable: isUnavailableMod(mod),
        mod,
      } satisfies ModViewItem;
    });
  }, [
    modDefinitions,
    activatedModComponents,
    mods,
    listings,
    organizations,
    scope,
    getStatus,
  ]);

  return {
    modViewItems,
    // Don't wait for the marketplace listings to load. They're only used to determine the icon and sharing options.
    // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/8458, when the marketplace data loads, it causes a
    //  re-render because the data is passed to React Table. So if the user had a 3-dot menu open for one of the mods,
    //  it will close. This is a bit jarring.
    isLoading: isRecipesLoading,
  };
}

export default useModViewItems;

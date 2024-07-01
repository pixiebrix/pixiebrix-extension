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

import { type UUID } from "@/types/stringTypes";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import { hydrateModComponentInnerDefinitions } from "@/registry/hydrateInnerDefinitions";
import { useGetAllStandaloneModDefinitionsQuery } from "@/data/service/api";
import { selectScope } from "@/auth/authSelectors";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { uniqBy } from "lodash";
import useAsyncState from "@/hooks/useAsyncState";
import { type ModComponentBase } from "@/types/modComponentTypes";
import type { Mod, UnavailableMod } from "@/types/modTypes";
import { DefinitionKinds } from "@/types/registryTypes";
import { allSettled } from "@/utils/promiseUtils";

type ModsState = {
  /**
   * The mods fetched/generated so far. There's no loading/fetching state. `useMods` just adds entries
   * as they become available.
   */
  mods: Mod[];
  /**
   * An error that occurred while fetching/generating mods, or undefined.
   */
  error: unknown;
};

export function mapModComponentToUnavailableMod(
  modComponent: ModComponentBase,
): UnavailableMod {
  return {
    metadata: modComponent._recipe,
    kind: DefinitionKinds.MOD,
    isStub: true,
    updated_at: modComponent._recipe.updated_at,
    sharing: modComponent._recipe.sharing,
  };
}

/**
 * React Hook for consolidating Mods.
 * @see Mod
 */
function useMods(): ModsState {
  const scope = useSelector(selectScope);
  const activatedModComponents = useSelector(selectActivatedModComponents);

  const { data: knownModDefinitions = [], ...modDefinitionsState } =
    useAllModDefinitions();
  const standaloneModDefinitions = useGetAllStandaloneModDefinitionsQuery();

  const { activatedStandaloneModComponentIds, activatedModDefinitionIds } =
    useMemo(
      () => ({
        activatedStandaloneModComponentIds: new Set<UUID>(
          activatedModComponents.map((x) => x.id),
        ),
        activatedModDefinitionIds: new Set(
          activatedModComponents.map((x) => x._recipe?.id),
        ),
      }),
      [activatedModComponents],
    );

  const knownPersonalOrTeamModDefinitions = useMemo(
    () =>
      (knownModDefinitions ?? []).filter(
        (modDefinition) =>
          // Is personal mod
          modDefinition.metadata.id.includes(scope) ||
          // Is mod shared with the current user
          modDefinition.sharing.organizations.length > 0 ||
          // Is mod active, e.g. activated via marketplace
          activatedModDefinitionIds.has(modDefinition.metadata.id),
      ),
    [activatedModDefinitionIds, knownModDefinitions, scope],
  );

  // All known mod components, including activated mods and standalone mod components retrieved from the server.
  const knownModComponents = useMemo(() => {
    const unactivatedStandaloneModComponents =
      standaloneModDefinitions.data
        ?.filter((x) => !activatedStandaloneModComponentIds.has(x.id))
        .map((x) => ({ ...x, active: false })) ?? [];

    return [...activatedModComponents, ...unactivatedStandaloneModComponents];
  }, [
    standaloneModDefinitions.data,
    activatedStandaloneModComponentIds,
    activatedModComponents,
  ]);

  const { data: hydratedModComponents = [], error: hydrationError } =
    useAsyncState(
      async () => {
        // Hydration can fail if we've dropped support for a starter brick type (e.g., tour, inline panel)
        const hydrationPromises = await allSettled(
          knownModComponents.map(async (x) => {
            try {
              return await hydrateModComponentInnerDefinitions(x);
            } catch (error) {
              // Enrich the error with the mod component id to support resolving the issue. E.g., in the case of
              // an unsupported starter brick, deleting the standalone mod component from the server
              throw new Error(`Error hydrating mod component: ${x.id}`, {
                cause: error,
              });
            }
          }),
          {
            catch(errors) {
              console.warn(
                `Failed to hydrate mod ${errors.length} component(s)`,
                errors,
              );
            },
          },
        );

        const { fulfilled: hydratedModComponents } = hydrationPromises;

        if (
          knownModComponents.length > 0 &&
          hydratedModComponents.length === 0
        ) {
          throw new Error("Failed to hydrate any mod components");
        }

        return hydratedModComponents;
      },
      [knownModComponents],
      { initialValue: [] },
    );

  const standaloneModComponents = useMemo(
    () =>
      hydratedModComponents.filter((x) =>
        x._recipe?.id ? !activatedModDefinitionIds.has(x._recipe?.id) : true,
      ),
    [activatedModDefinitionIds, hydratedModComponents],
  );

  // Find mod components that were activated by a mod definitions that's no longer available to the user, e.g.,
  // because it was deleted, or because the user no longer has access to it.
  const unavailableMods: UnavailableMod[] = useMemo(() => {
    const knownModDefinitionIds = new Set(
      knownModDefinitions.map((x) => x.metadata.id),
    );

    const unavailable = hydratedModComponents.filter(
      (modComponent) =>
        modComponent._recipe?.id &&
        !knownModDefinitionIds.has(modComponent._recipe?.id),
    );

    // Show one entry per missing mod id
    return uniqBy(
      unavailable.map((x) => mapModComponentToUnavailableMod(x)),
      (x) => x.metadata.id,
    );
  }, [knownModDefinitions, hydratedModComponents]);

  return {
    mods: [
      ...standaloneModComponents,
      ...knownPersonalOrTeamModDefinitions,
      ...unavailableMods,
    ],
    error:
      standaloneModDefinitions.error ??
      modDefinitionsState.error ??
      hydrationError,
  };
}

export default useMods;

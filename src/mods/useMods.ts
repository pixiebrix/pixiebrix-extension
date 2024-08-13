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

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import { selectScope } from "@/auth/authSelectors";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { uniqBy } from "lodash";
import { type ModComponentBase } from "@/types/modComponentTypes";
import type { Mod, UnavailableMod } from "@/types/modTypes";
import { DefinitionKinds } from "@/types/registryTypes";

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

  const activatedModDefinitionIds = useMemo(
    () => new Set(activatedModComponents.map((x) => x._recipe?.id)),
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

  // Find mod components that were activated by a mod definitions that's no longer available to the user, e.g.,
  // because it was deleted, or because the user no longer has access to it.
  const unavailableMods: UnavailableMod[] = useMemo(() => {
    const knownModDefinitionIds = new Set(
      knownModDefinitions.map((x) => x.metadata.id),
    );

    const unavailable = activatedModComponents.filter(
      (modComponent) =>
        modComponent._recipe?.id &&
        !knownModDefinitionIds.has(modComponent._recipe?.id),
    );

    // Show one entry per missing mod id
    return uniqBy(
      unavailable.map((x) => mapModComponentToUnavailableMod(x)),
      (x) => x.metadata.id,
    );
  }, [knownModDefinitions, activatedModComponents]);

  return {
    mods: [...knownPersonalOrTeamModDefinitions, ...unavailableMods],
    error: modDefinitionsState.error,
  };
}

export default useMods;

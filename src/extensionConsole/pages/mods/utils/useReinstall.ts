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

import { type ModDefinition } from "@/types/modDefinitionTypes";
import { useDispatch, useSelector } from "react-redux";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import { useCallback } from "react";
import { actions as extensionActions } from "@/store/extensionsSlice";
import { collectModOptions } from "@/store/extensionsUtils";
import { deactivateMod } from "@/store/deactivateUtils";
import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";

type Reinstall = (modDefinition: ModDefinition) => Promise<void>;

function useReinstall(): Reinstall {
  const dispatch = useDispatch();
  const allComponents = useSelector(selectActivatedModComponents);

  return useCallback(
    async (modDefinition: ModDefinition) => {
      const modId = modDefinition.metadata.id;
      const activatedModComponents = allComponents.filter(
        (x) => x._recipe?.id === modId,
      );

      if (activatedModComponents.length === 0) {
        throw new Error(`No bricks to re-activate for ${modId}`);
      }

      const currentOptions = collectModOptions(activatedModComponents);

      const configuredDependencies =
        collectExistingConfiguredDependenciesForMod(
          modDefinition,
          activatedModComponents,
        );

      await deactivateMod(modId, activatedModComponents, dispatch);

      dispatch(
        extensionActions.activateMod({
          modDefinition,
          configuredDependencies,
          optionsArgs: currentOptions,
          screen: "extensionConsole",
          isReactivate: true,
        }),
      );
    },
    [allComponents, dispatch],
  );
}

export default useReinstall;

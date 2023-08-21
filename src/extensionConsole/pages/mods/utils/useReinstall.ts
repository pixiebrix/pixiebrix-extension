/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { selectExtensions } from "@/store/extensionsSelectors";
import { useCallback } from "react";
import { actions as extensionActions } from "@/store/extensionsSlice";
import {
  inferModIntegrations,
  inferRecipeOptions,
} from "@/store/extensionsUtils";
import { uninstallRecipe } from "@/store/uninstallUtils";

type Reinstall = (modDefinition: ModDefinition) => Promise<void>;

function useReinstall(): Reinstall {
  const dispatch = useDispatch();
  const allComponents = useSelector(selectExtensions);

  return useCallback(
    async (modDefinition: ModDefinition) => {
      const modId = modDefinition.metadata.id;
      const modComponents = allComponents.filter(
        (x) => x._recipe?.id === modId
      );

      if (modComponents.length === 0) {
        throw new Error(`No bricks to re-activate for ${modId}`);
      }

      const currentOptions = inferRecipeOptions(modComponents);

      const configuredDependencies = inferModIntegrations(modComponents);

      await uninstallRecipe(modId, modComponents, dispatch);

      dispatch(
        extensionActions.installMod({
          modDefinition,
          configuredDependencies,
          optionsArgs: currentOptions,
          screen: "extensionConsole",
          isReinstall: true,
        })
      );
    },
    [allComponents, dispatch]
  );
}

export { inferModIntegrations, inferRecipeOptions };
export default useReinstall;

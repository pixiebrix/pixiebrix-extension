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
import { useCallback } from "react";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import { deactivateMod } from "@/store/deactivateModHelpers";
import { selectModInstanceMap } from "@/store/modComponents/modInstanceSelectors";
import { assertNotNullish } from "@/utils/nullishUtils";

type ReactivateMod = (modDefinition: ModDefinition) => Promise<void>;

function useReactivateMod(): ReactivateMod {
  const dispatch = useDispatch();
  const modInstanceMap = useSelector(selectModInstanceMap);

  return useCallback(
    async (modDefinition: ModDefinition) => {
      const modId = modDefinition.metadata.id;
      const modInstance = modInstanceMap.get(modId);

      assertNotNullish(modInstance, `Mod is not active: ${modId}`);

      await deactivateMod(modId, modInstance.modComponentIds, dispatch);

      dispatch(
        modComponentActions.activateMod({
          modDefinition,
          configuredDependencies: modInstance.integrationsArgs,
          optionsArgs: modInstance.optionsArgs,
          screen: "extensionConsole",
          isReactivate: true,
        }),
      );
    },
    [modInstanceMap, dispatch],
  );
}

export default useReactivateMod;

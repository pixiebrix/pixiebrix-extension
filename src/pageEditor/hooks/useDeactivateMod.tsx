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

import { useCallback } from "react";
import { type RegistryId } from "@/types/registryTypes";
import {
  DEACTIVATE_MOD_MODAL_PROPS,
  DELETE_UNSAVED_MOD_MODAL_PROPS,
  useRemoveModComponentFromStorage,
} from "@/pageEditor/hooks/useRemoveModComponentFromStorage";
import { useDispatch, useSelector } from "react-redux";
import { selectModComponentFormStates } from "@/pageEditor/store/editor/editorSelectors";
import { uniq } from "lodash";
import { useModals } from "@/components/ConfirmationModal";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { clearLog } from "@/background/messenger/api";
import { selectModInstanceMap } from "@/store/modComponents/modInstanceSelectors";
import { isInnerDefinitionRegistryId } from "@/types/helpers";

type Config = {
  modId: RegistryId;
  shouldShowConfirmation?: boolean;
};

/**
 * This hook provides a callback function to deactivate a mod and remove it from the Page Editor. Note that in the case
 * of unsaved mods, the mod will be deleted instead of deactivated.
 */
function useDeactivateMod(): (useDeactivateConfig: Config) => Promise<void> {
  const dispatch = useDispatch();
  const removeModComponentFromStorage = useRemoveModComponentFromStorage();
  const modInstanceMap = useSelector(selectModInstanceMap);
  const modComponentFormStates = useSelector(selectModComponentFormStates);
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ modId, shouldShowConfirmation = true }) => {
      if (shouldShowConfirmation) {
        const isUnsavedMod = isInnerDefinitionRegistryId(modId);
        const confirmed = await showConfirmation(
          isUnsavedMod
            ? DELETE_UNSAVED_MOD_MODAL_PROPS
            : DEACTIVATE_MOD_MODAL_PROPS,
        );

        if (!confirmed) {
          return;
        }
      }

      const modInstance = modInstanceMap.get(modId);

      const formComponentIds = modComponentFormStates
        .filter((x) => x.modMetadata.id === modId)
        .map((x) => x.uuid);

      const modComponentIds = uniq([
        ...(modInstance?.modComponentIds ?? []),
        ...formComponentIds,
      ]);

      await Promise.all(
        modComponentIds.map(async (modComponentId) =>
          removeModComponentFromStorage({
            modComponentId,
          }),
        ),
      );

      void clearLog({
        modId,
      });

      dispatch(actions.removeModData(modId));
    },
    [
      dispatch,
      modComponentFormStates,
      modInstanceMap,
      removeModComponentFromStorage,
      showConfirmation,
    ],
  );
}

export default useDeactivateMod;

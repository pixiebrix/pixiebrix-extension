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
import { type RegistryId } from "../../types/registryTypes";
import { actions as editorActions } from "../store/editor/editorSlice";
import { useModals } from "../../components/ConfirmationModal";
import { useDispatch, useSelector } from "react-redux";
import useClearModComponentChanges from "./useClearModComponentChanges";
import { selectGetModComponentFormStatesForMod } from "../store/editor/editorSelectors";

/**
 * Hook that returns a callback to clear unsaved mod changes for a given mod id.
 * @see useClearModComponentChanges
 */
function useClearModChanges(): (modId: RegistryId) => Promise<void> {
  const { showConfirmation } = useModals();
  const dispatch = useDispatch();
  const clearModComponentChanges = useClearModComponentChanges();
  const getModComponentFormStatesByModId = useSelector(
    selectGetModComponentFormStatesForMod,
  );

  return useCallback(
    async (modId: RegistryId) => {
      const confirmed = await showConfirmation({
        title: "Clear Mod Changes?",
        message:
          "Unsaved changes to this mod, or to mod options and metadata, will be lost.",
        submitCaption: "Clear Changes",
      });
      if (!confirmed) {
        return;
      }

      await Promise.all(
        getModComponentFormStatesByModId(modId).map(
          async (modComponentFormState) =>
            clearModComponentChanges({
              modComponentId: modComponentFormState.uuid,
              shouldShowConfirmation: false,
            }),
        ),
      );

      dispatch(editorActions.markModAsCleanById(modId));

      dispatch(editorActions.setActiveModId(modId));
    },
    [
      dispatch,
      getModComponentFormStatesByModId,
      clearModComponentChanges,
      showConfirmation,
    ],
  );
}

export default useClearModChanges;

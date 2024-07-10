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
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { useModals } from "@/components/ConfirmationModal";
import { useDispatch, useSelector } from "react-redux";
import useResetModComponent from "@/pageEditor/hooks/useResetModComponent";
import { selectModComponentFormStates } from "@/pageEditor/store/editor/editorSelectors";

function useResetMod(): (modId: RegistryId) => Promise<void> {
  const { showConfirmation } = useModals();
  const dispatch = useDispatch();
  const resetModComponent = useResetModComponent();
  const modComponentFormStates = useSelector(selectModComponentFormStates);

  return useCallback(
    async (modId: RegistryId) => {
      const confirmed = await showConfirmation({
        title: "Reset Mod?",
        message:
          "Unsaved changes to this mod, or to mod options and metadata, will be lost.",
        submitCaption: "Reset",
      });
      if (!confirmed) {
        return;
      }

      await Promise.all(
        modComponentFormStates
          .filter(
            (modComponentFormState) =>
              modComponentFormState.modMetadata?.id === modId,
          )
          .map(async (modComponentFormState) =>
            resetModComponent({
              modComponentId: modComponentFormState.uuid,
              shouldShowConfirmation: false,
            }),
          ),
      );

      dispatch(actions.resetMetadataAndOptionsForMod(modId));
      dispatch(actions.restoreDeletedModComponentFormStatesForMod(modId));
      dispatch(actions.setActiveModId(modId));
    },
    [dispatch, modComponentFormStates, resetModComponent, showConfirmation],
  );
}

export default useResetMod;

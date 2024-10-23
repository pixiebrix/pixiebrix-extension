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

import React, { useCallback } from "react";
import { type RegistryId } from "@/types/registryTypes";
import { useDispatch, useSelector } from "react-redux";
import {
  type ConfirmationModalProps,
  useModals,
} from "@/components/ConfirmationModal";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { removeModDataAndInterfaceFromAllTabs } from "@/store/deactivateModHelpers";
import { selectModInstanceMap } from "@/store/modComponents/modInstanceSelectors";
import { getDraftModComponentId } from "@/pageEditor/utils";

import { selectGetDraftModComponentsForMod } from "@/pageEditor/store/editor/editorSelectors";

type Config = {
  modId: RegistryId;
  shouldShowConfirmation?: boolean;
};

const DEACTIVATE_MOD_MODAL_PROPS: ConfirmationModalProps = {
  title: "Deactivate Mod?",
  message: (
    <>
      Any unsaved changes will be lost. You can reactivate or delete mods from
      the{" "}
      <a href="/options.html" target="_blank">
        PixieBrix Extension Console
      </a>
      .
    </>
  ),
  submitCaption: "Deactivate",
};

const DELETE_UNSAVED_MOD_MODAL_PROPS: ConfirmationModalProps = {
  title: "Delete Mod?",
  message: (
    <>
      This action cannot be undone. If you&apos;d like to deactivate this mod
      instead, save the mod first.
    </>
  ),
  submitCaption: "Delete",
};

/**
 * Hook providing a callback function to deactivate a mod and remove it from the Page Editor. NOTE: if the mod is
 * an unsaved draft, the mod will be deleted completely instead of deactivated.
 *
 * @see useDeleteDraftModComponent
 */
function useDeactivateMod(): (useDeactivateConfig: Config) => Promise<void> {
  const dispatch = useDispatch();
  const { showConfirmation } = useModals();
  const modInstanceMap = useSelector(selectModInstanceMap);
  const getDraftModComponentsForMod = useSelector(
    selectGetDraftModComponentsForMod,
  );

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

      // Remove from Page Editor
      dispatch(editorActions.removeModById(modId));
      await removeModDataAndInterfaceFromAllTabs(
        modId,
        getDraftModComponentsForMod(modId).map((x) =>
          getDraftModComponentId(x),
        ),
      );

      // Remove the activated mod instance from all tabs, if one exists
      const modInstance = modInstanceMap.get(modId);
      if (modInstance) {
        dispatch(modComponentActions.removeModById(modId));
        await removeModDataAndInterfaceFromAllTabs(
          modId,
          modInstance.modComponentIds,
        );
      }
    },
    [dispatch, showConfirmation, modInstanceMap, getDraftModComponentsForMod],
  );
}

export default useDeactivateMod;

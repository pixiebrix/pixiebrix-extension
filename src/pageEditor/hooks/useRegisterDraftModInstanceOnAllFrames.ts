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

import { useCallback, useEffect } from "react";
import {
  formStateToDraftModComponent,
  modComponentToFormState,
  selectType,
} from "@/pageEditor/starterBricks/adapter";
import {
  removeActivatedModComponent,
  updateDraftModComponent,
} from "@/contentScript/messenger/api";
import { allFramesInInspectedTab } from "@/pageEditor/context/connection";
import { navigationEvent } from "@/pageEditor/events";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveModComponentFormState,
  selectExpandedModId,
} from "@/pageEditor/store/editor/editorSelectors";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/selectGetCleanComponentsAndDirtyFormStatesForMod";
import { selectModInstanceMap } from "@/store/modComponents/modInstanceSelectors";
import type { ModInstance } from "@/types/modInstanceTypes";
import { mapModInstanceToActivatedModComponents } from "@/store/modComponents/modInstanceUtils";
import useAsyncEffect from "use-async-effect";
import { assertNotNullish } from "@/utils/nullishUtils";
import { RunReason } from "@/types/runtimeTypes";
import type { UUID } from "@/types/stringTypes";
import hash from "object-hash";

/**
 * Map from draft mod component UUID to object-hash of updated draft. Used to avoid unnecessary re-injection.
 */
const draftModComponentStateHash = new Map<UUID, string>();

/**
 * Helper to remove persisted mod instance from all frames on the tab. Prevents duplicate starter bricks when draft
 * mod components are added to the page.
 */
async function removeActivatedModInstanceFromTab(
  modInstance: ModInstance,
): Promise<void> {
  await Promise.all(
    mapModInstanceToActivatedModComponents(modInstance).map(
      async (modComponent) => {
        const starterBrickType = await selectType(modComponent);

        if (
          // The starter brick duplication issue doesn't apply to certain starter bricks:
          // See https://github.com/pixiebrix/pixiebrix-extension/pull/5047
          // The sidebar handles replacing the panel: https://github.com/pixiebrix/pixiebrix-extension/pull/6372
          starterBrickType === StarterBrickTypes.SIDEBAR_PANEL
        ) {
          return;
        }

        removeActivatedModComponent(allFramesInInspectedTab, modComponent.id);
      },
    ),
  );
}

/**
 * Hook to register/inject selected mod draft to the current page, and re-register on top-level frame navigation.
 * @see ReloadToolbar
 * @see RunReason.PAGE_EDITOR_REGISTER
 * @since 2.1.6
 */
function useRegisterDraftModInstanceOnAllFrames(): void {
  const dispatch = useDispatch();
  const modId = useSelector(selectExpandedModId);
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );
  const modInstanceMap = useSelector(selectModInstanceMap);

  assertNotNullish(modId, "modId is required");

  const modInstance = modId ? modInstanceMap.get(modId) : undefined;
  const editorState = getCleanComponentsAndDirtyFormStatesForMod(modId);

  useAsyncEffect(async () => {
    if (modInstance) {
      // Remove non-draft mod instance from the page. removeActivatedModInstanceFromTab is safe to call multiple times
      // per mod instance (it's a NOP if the mod instance is registered in a frame).
      await removeActivatedModInstanceFromTab(modInstance);
    }
  }, [modInstance]);

  // Replace with the draft mod instance. Updated when the selected mod component changes, because auto-run behavior
  // differs based on whether a mod component is selected or not.
  const updateDraftModInstance = useCallback(async () => {
    // NOTE: logic accounts for activated mod components that have been deleted. But it does not account for
    // unsaved draft mod component that have been deleted since the last injection. The draft mod component
    // deletion code is currently responsible for removing those from the tab

    const { cleanModComponents, dirtyModComponentFormStates } = editorState;

    const draftFormStates = [
      ...(await Promise.all(
        cleanModComponents.map(async (x) => modComponentToFormState(x)),
      )),
      ...dirtyModComponentFormStates,
    ];

    for (const draftFormState of draftFormStates) {
      const isSelectedInEditor =
        activeModComponentFormState?.uuid === draftFormState.uuid;

      const draftModComponent = formStateToDraftModComponent(draftFormState);

      // PERFORMANCE: only re-register if the component's state has changed. It would be safe to updateDraftModComponent
      // on every change to the mod (even for different mod components), but computing the hash is cheaper.
      // An additional benefit of skipping re-register is that interval triggers won't have their interval reset.
      const stateHash = hash({
        draftModComponent,
        isSelectedInEditor,
      });

      if (draftModComponentStateHash.get(draftFormState.uuid) !== stateHash) {
        updateDraftModComponent(allFramesInInspectedTab, draftModComponent, {
          isSelectedInEditor,
          runReason: RunReason.PAGE_EDITOR_REGISTER,
        });
      }

      draftModComponentStateHash.set(draftFormState.uuid, stateHash);
    }
  }, [activeModComponentFormState, editorState]);

  useAsyncEffect(async () => {
    await updateDraftModInstance();
  }, [updateDraftModInstance]);

  useEffect(() => {
    const callback = async () => {
      if (modInstance) {
        // Remove activated mod instance from the page
        await removeActivatedModInstanceFromTab(modInstance);
      }

      // FIXME: should the navigation handler force runReason to be PAGE_EDITOR_RUN? For SPA navigation, the normal
      //  page lifecycle will handle. For full navigation, there's a race between the lifecycle running the activated
      //  mod components and the Page Editor removing the activated mod components. Ideally, the draft mod instance
      //  would take precedence.
      draftModComponentStateHash.clear();
      await updateDraftModInstance();
    };

    navigationEvent.add(callback);
    return () => {
      navigationEvent.remove(callback);
    };
  }, [dispatch, updateDraftModInstance, modInstance]);
}

export default useRegisterDraftModInstanceOnAllFrames;

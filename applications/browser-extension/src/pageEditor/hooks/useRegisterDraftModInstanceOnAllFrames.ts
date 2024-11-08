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

import { useEffect } from "react";
import {
  formStateToDraftModComponent,
  selectGetDraftFormStatesPromiseForModId,
  selectType,
} from "../starterBricks/adapter";
import {
  removeActivatedModComponent,
  updateDraftModComponent,
} from "../../contentScript/messenger/api";
import { allFramesInInspectedTab } from "../context/connection";
import { navigationEvent } from "../events";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveModComponentFormState,
  selectActiveModComponentId,
  selectCurrentModId,
  selectEditorUpdateKey,
  selectGetModDraftStateForModId,
} from "../store/editor/editorSelectors";
import { StarterBrickTypes } from "../../types/starterBrickTypes";
import { selectModInstanceMap } from "../../store/modComponents/modInstanceSelectors";
import type { ModInstance } from "../../types/modInstanceTypes";
import { mapModInstanceToActivatedModComponents } from "../../store/modComponents/modInstanceUtils";
import useAsyncEffect from "use-async-effect";
import { assertNotNullish } from "../../utils/nullishUtils";
import { RunReason } from "../../types/runtimeTypes";
import type { UUID } from "../../types/stringTypes";
import hash from "object-hash";
import { usePreviousValue } from "../../hooks/usePreviousValue";
import type { ModComponentFormState } from "../starterBricks/formStateTypes";
import type { RootState } from "../store/editor/pageEditorTypes";
import type { AppDispatch } from "../store/store";

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

function useOnSelectModComponent(
  callback: (formState: ModComponentFormState) => void,
): void {
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  // Watching for value seems a bit hacky (e.g. as opposed to watching for editorSlice actions that could impact the
  // activeModComponentFormState). But it's a simple method that does not require maintaining the list of actions that
  // *might* impact the selected mod component form state.
  const previousActiveModComponentFormState = usePreviousValue(
    activeModComponentFormState,
  );

  if (
    activeModComponentFormState?.uuid &&
    activeModComponentFormState.uuid !==
      previousActiveModComponentFormState?.uuid
  ) {
    callback(activeModComponentFormState);
  }
}

/**
 * Register the non-selected (active) mod components on the page. The active mod component is managed by ReloadToolbar.
 * @see ReloadToolbar
 */
function updateDraftModInstance() {
  return async (_dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();

    const activeModComponentId = selectActiveModComponentId(state);
    const modId = selectCurrentModId(state);

    if (!modId) {
      // Skip if the modId has somehow become null before the microtask for this async method got scheduled
      return;
    }

    // NOTE: logic accounts for activated mod components that have been deleted. But it does not account for
    // unsaved draft mod component that have been deleted since the last injection. The draft mod component
    // deletion code is currently responsible for removing those from the tab
    const getModDraftStateForModId = selectGetModDraftStateForModId(state);
    const draftFormStates =
      await selectGetDraftFormStatesPromiseForModId(state)(modId);

    for (const draftFormState of draftFormStates) {
      const isSelectedInEditor = activeModComponentId === draftFormState.uuid;

      // Skip is component is active -- ReloadToolbar handles running the selected draft mod component
      if (!isSelectedInEditor) {
        const draftModComponent = formStateToDraftModComponent(
          draftFormState,
          getModDraftStateForModId(modId),
        );

        // PERFORMANCE: only re-register if the component's state has changed. It would technically be safe to
        // updateDraftModComponent on every change to the mod (even for different mod components), but computing the
        // hash is cheaper than messaging. An additional benefit of skipping re-register is that interval triggers won't
        // have their interval reset.
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
    }
  };
}

/**
 * Hook to register/inject selected mod draft to the current page, and re-register on top-level frame navigation.
 *
 * Mod components within the selected mod draft are registered:
 * 1. On initial mount, to ensure the draft mod instance is always present
 * 2. On select, to prevent interval triggers from running when selected
 * 3. On page navigation, to ensure the draft mod instance is always present
 * 4. When a non-selected mod component is updated. E.g., mod option values are updated. (Updating the selected mod
 * component is updated by ReloadToolbar.)
 *
 * @see ReloadToolbar
 * @see RunReason.PAGE_EDITOR_REGISTER
 * @since 2.1.6
 */
function useRegisterDraftModInstanceOnAllFrames(): void {
  const dispatch = useDispatch<AppDispatch>();
  const modId = useSelector(selectCurrentModId);
  const editorUpdateKey = useSelector(selectEditorUpdateKey);

  assertNotNullish(modId, "modId is required");

  const modInstanceMap = useSelector(selectModInstanceMap);
  const activatedModInstance = modInstanceMap.get(modId);

  const getModDraftStateForModId = useSelector(selectGetModDraftStateForModId);

  // Remove non-draft mod instance from the page. removeActivatedModInstanceFromTab is safe to call multiple times
  // per mod instance (it's a NOP if the mod instance is registered in a frame).
  useAsyncEffect(async () => {
    if (activatedModInstance) {
      await removeActivatedModInstanceFromTab(activatedModInstance);
    }
  }, [activatedModInstance]);

  // Run updateDraftModInstance whenever the mod instance configuration changes
  // The ReloadToolbar manages reloading for Formik changes for the active mod component (if any). The other
  // mod components can only change when the editor sequence number changes. (The sequence number changes whenever
  // a update occurs via Redux instead of Formik)
  useAsyncEffect(async () => {
    await dispatch(updateDraftModInstance());
  }, [dispatch, editorUpdateKey]);

  // Register draft mod component on select. From there, ReloadToolbar will control re-running the mod component.
  // Currently, registering on select is to stop interval triggers from running when selected.
  useOnSelectModComponent(async (draftFormState) => {
    const draftModComponent = formStateToDraftModComponent(
      draftFormState,
      getModDraftStateForModId(draftFormState.modMetadata.id),
    );

    updateDraftModComponent(allFramesInInspectedTab, draftModComponent, {
      isSelectedInEditor: true,
      runReason: RunReason.PAGE_EDITOR_REGISTER,
    });
  });

  useEffect(() => {
    const callback = async () => {
      if (activatedModInstance) {
        // Remove activated mod instance from the page
        await removeActivatedModInstanceFromTab(activatedModInstance);
      }

      // XXX: should the navigation handler force runReason to be PAGE_EDITOR_RUN? For SPA navigation, the normal
      //  page lifecycle will handle. For full navigation, there's a race between the lifecycle running the activated
      //  mod components and the Page Editor removing the activated mod components. Ideally, the draft mod instance
      //  would take precedence.
      draftModComponentStateHash.clear();
      await dispatch(updateDraftModInstance());
    };

    navigationEvent.add(callback);
    return () => {
      navigationEvent.remove(callback);
    };
  }, [dispatch, activatedModInstance]);
}

export default useRegisterDraftModInstanceOnAllFrames;

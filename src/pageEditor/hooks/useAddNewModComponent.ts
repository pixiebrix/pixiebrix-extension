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

import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import notify from "@/utils/notify";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { internalStarterBrickMetaFactory } from "@/pageEditor/starterBricks/base";
import { isSpecificError } from "@/errors/errorHelpers";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import { updateDraftModComponent } from "@/contentScript/messenger/api";
import { type SettingsState } from "@/store/settings/settingsTypes";
import useFlags from "@/hooks/useFlags";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { CancelError } from "@/errors/businessErrors";
import {
  allFramesInInspectedTab,
  getCurrentInspectedURL,
  inspectedTab,
} from "@/pageEditor/context/connection";

type AddNewModComponent = (config: ModComponentFormStateAdapter) => void;

function useAddNewModComponent(): AddNewModComponent {
  const dispatch = useDispatch();
  const { flagOff } = useFlags();
  const suggestElements = useSelector<{ settings: SettingsState }, boolean>(
    (x) => x.settings.suggestElements ?? false,
  );

  return useCallback(
    async (modComponentFormStateAdapter: ModComponentFormStateAdapter) => {
      if (
        modComponentFormStateAdapter.flag &&
        flagOff(modComponentFormStateAdapter.flag)
      ) {
        dispatch(actions.betaError());
        return;
      }

      dispatch(
        actions.setInsertingStarterBrickType(
          modComponentFormStateAdapter.starterBrickType,
        ),
      );

      if (!modComponentFormStateAdapter.selectNativeElement) {
        // If the foundation is not for a native element, stop after toggling insertion mode
        return;
      }

      try {
        const element = await modComponentFormStateAdapter.selectNativeElement(
          inspectedTab,
          suggestElements,
        );
        const url = await getCurrentInspectedURL();

        const metadata = internalStarterBrickMetaFactory();

        const initialFormState = modComponentFormStateAdapter.fromNativeElement(
          url,
          metadata,
          element,
        ) as ModComponentFormState;

        // ********************
        dispatch(actions.addModComponentFormState(initialFormState));
        dispatch(actions.checkActiveModComponentAvailability());

        updateDraftModComponent(
          allFramesInInspectedTab,
          modComponentFormStateAdapter.asDraftModComponent(initialFormState),
        );
        // ********************

        reportEvent(Events.MOD_COMPONENT_ADD_NEW, {
          type: modComponentFormStateAdapter.starterBrickType,
        });
      } catch (error) {
        if (isSpecificError(error, CancelError)) {
          return;
        }

        notify.error({
          message: `Error adding ${modComponentFormStateAdapter.label.toLowerCase()}`,
          error,
        });
      } finally {
        dispatch(actions.clearInsertingStarterBrickType());
      }
    },
    [dispatch, flagOff, suggestElements],
  );
}

export default useAddNewModComponent;

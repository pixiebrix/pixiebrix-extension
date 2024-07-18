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
import { getExampleBrickPipeline } from "@/pageEditor/panes/insert/exampleStarterBrickConfigs";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { openSidePanel } from "@/utils/sidePanelUtils";

type AddNewModComponent = (config: ModComponentFormStateAdapter) => void;

function useAddNewModComponent(): AddNewModComponent {
  const dispatch = useDispatch();
  const { flagOff } = useFlags();
  const suggestElements = useSelector<{ settings: SettingsState }, boolean>(
    (x) => x.settings.suggestElements ?? false,
  );

  return useCallback(
    async (adapter: ModComponentFormStateAdapter) => {
      if (adapter.flag && flagOff(adapter.flag)) {
        dispatch(actions.betaError());
        return;
      }

      dispatch(actions.setInsertingStarterBrickType(adapter.starterBrickType));

      try {
        const element = adapter.selectNativeElement
          ? await adapter.selectNativeElement(inspectedTab, suggestElements)
          : null;

        const url = await getCurrentInspectedURL();
        const metadata = internalStarterBrickMetaFactory();
        const initialFormState = adapter.fromNativeElement(
          url,
          metadata,
          element,
        ) as ModComponentFormState;

        initialFormState.modComponent.brickPipeline = getExampleBrickPipeline(
          adapter.starterBrickType,
        );

        dispatch(actions.addModComponentFormState(initialFormState));
        dispatch(actions.checkActiveModComponentAvailability());

        updateDraftModComponent(
          allFramesInInspectedTab,
          adapter.asDraftModComponent(initialFormState),
        );

        // TODO: deprecate this event? it's basically the same as Events.MOD_COMPONENT_ADD_NEW
        reportEvent(Events.PAGE_EDITOR_START, {
          type: adapter.starterBrickType,
        });

        if (adapter.starterBrickType === StarterBrickTypes.SIDEBAR_PANEL) {
          // For convenience, open the side panel if it's not already open so that the user doesn't
          // have to manually toggle it
          void openSidePanel(inspectedTab.tabId);
        }

        reportEvent(Events.MOD_COMPONENT_ADD_NEW, {
          type: adapter.starterBrickType,
        });
      } catch (error) {
        if (isSpecificError(error, CancelError)) {
          return;
        }

        notify.error({
          message: `Error adding ${adapter.label.toLowerCase()}`,
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

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

import React, { useEffect, useMemo } from "react";
import {
  addListener,
  removeListener,
  type SidebarListener,
} from "@/sidebar/protocol";
import { useDispatch, useSelector } from "react-redux";
import {
  type ActivatePanelOptions,
  type ActivateRecipeEntry,
  type FormEntry,
  type PanelEntry,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import Tabs from "@/sidebar/Tabs";
import sidebarSlice from "./sidebarSlice";
import RequireAuth from "@/auth/RequireAuth";
import LoginPanel from "@/sidebar/LoginPanel";
import ErrorBoundary from "./ErrorBoundary";
import { type RegistryId } from "@/types/registryTypes";
import { selectIsSidebarEmpty } from "@/sidebar/sidebarSelectors";
import useFlags from "@/hooks/useFlags";
import DelayedRender from "@/components/DelayedRender";
import DefaultPanel from "@/sidebar/DefaultPanel";

/**
 * Listeners to update the Sidebar's Redux state upon receiving messages from the contentScript.
 */
function useConnectedListener(): SidebarListener {
  const dispatch = useDispatch();
  return useMemo(
    () => ({
      onRenderPanels(panels: PanelEntry[]) {
        dispatch(sidebarSlice.actions.setPanels({ panels }));
      },
      onShowForm(form: FormEntry) {
        dispatch(sidebarSlice.actions.addForm({ form }));
      },
      onHideForm({ nonce }: Partial<FormEntry>) {
        dispatch(sidebarSlice.actions.removeForm(nonce));
      },
      onActivatePanel(options: ActivatePanelOptions) {
        dispatch(sidebarSlice.actions.activatePanel(options));
      },
      onUpdateTemporaryPanel(panel: TemporaryPanelEntry) {
        dispatch(sidebarSlice.actions.updateTemporaryPanel({ panel }));
      },
      onShowTemporaryPanel(panel: TemporaryPanelEntry) {
        dispatch(sidebarSlice.actions.addTemporaryPanel({ panel }));
      },
      onHideTemporaryPanel({ nonce }) {
        dispatch(sidebarSlice.actions.removeTemporaryPanel(nonce));
      },
      onShowActivateRecipe(activateRecipeEntry: ActivateRecipeEntry) {
        dispatch(sidebarSlice.actions.showActivateRecipe(activateRecipeEntry));
      },
      onHideActivateRecipe(recipeId: RegistryId) {
        dispatch(sidebarSlice.actions.hideActivateRecipe());
      },
    }),
    [dispatch]
  );
}

const ConnectedSidebar: React.VFC = () => {
  const { flagOn } = useFlags();
  const listener = useConnectedListener();
  const sidebarIsEmpty = useSelector(selectIsSidebarEmpty);

  // `effect` will run once on component mount since listener and formsRef don't change on renders
  useEffect(() => {
    addListener(listener);
    return () => {
      // NOTE: we don't need to cancel any outstanding forms on unmount because the FormTransformer is set up to watch
      // for PANEL_HIDING_EVENT. (and the only time this SidebarApp would unmount is if the sidebar was closing)
      removeListener(listener);
    };
  }, [listener]);

  // If the Home tab feature is enabled, Tabs should always be shown because there will always be
  // at least the Home tab. Otherwise, Tabs should only be shown if there are panels to show.
  const showTabs = flagOn("sidebar-home-tab") || !sidebarIsEmpty;

  return (
    <div className="full-height">
      <ErrorBoundary>
        <RequireAuth
          LoginPage={LoginPanel}
          // Use ignoreApiError to avoid showing error on intermittent network issues or PixieBrix API degradation
          ignoreApiError
        >
          {showTabs ? (
            <Tabs />
          ) : (
            <DelayedRender millis={300}>
              <DefaultPanel />
            </DelayedRender>
          )}
        </RequireAuth>
      </ErrorBoundary>
    </div>
  );
};

export default ConnectedSidebar;

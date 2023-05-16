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

import React, { type Dispatch, useEffect, useMemo } from "react";
import {
  addListener,
  removeListener,
  type SidebarListener,
} from "@/sidebar/protocol";
import DefaultPanel from "@/sidebar/DefaultPanel";
import { useDispatch, useSelector } from "react-redux";
import {
  type ActivatePanelOptions,
  type ActivateRecipeEntry,
  type FormEntry,
  type PanelEntry,
  type TemporaryPanelEntry,
} from "@/sidebar/types";
import Tabs from "@/sidebar/Tabs";
import sidebarSlice, { type SidebarState } from "./sidebarSlice";
import { type AnyAction } from "redux";
import RequireAuth from "@/auth/RequireAuth";
import LoginPanel from "@/sidebar/LoginPanel";
import ErrorBoundary from "./ErrorBoundary";
import DelayedRender from "@/components/DelayedRender";
import { isEmpty } from "lodash";
import { type RegistryId } from "@/types/registryTypes";

/**
 * Listeners to update the Sidebar's Redux state upon receiving messages from the contentScript.
 */
function getConnectedListener(dispatch: Dispatch<AnyAction>): SidebarListener {
  return {
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
  };
}

const selectState = ({ sidebar }: { sidebar: SidebarState }) => sidebar;

const ConnectedSidebar: React.VFC = () => {
  const dispatch = useDispatch();
  const sidebarState = useSelector(selectState);

  const listener: SidebarListener = useMemo(
    () => getConnectedListener(dispatch),
    [dispatch]
  );

  // `effect` will run once on component mount since listener and formsRef don't change on renders
  useEffect(() => {
    addListener(listener);
    return () => {
      // NOTE: we don't need to cancel any outstanding forms on unmount because the FormTransformer is set up to watch
      // for PANEL_HIDING_EVENT. (and the only time this SidebarApp would unmount is if the sidebar was closing)
      removeListener(listener);
    };
  }, [listener]);

  // const showTabs =
  //   !isEmpty(sidebarState.panels) ||
  //   !isEmpty(sidebarState.forms) ||
  //   !isEmpty(sidebarState.temporaryPanels) ||
  //   sidebarState.recipeToActivate != null;

  const showTabs = true;

  return (
    <div className="full-height">
      <ErrorBoundary>
        <RequireAuth
          LoginPage={LoginPanel}
          // Use ignoreApiError to avoid showing error on intermittent network issues or PixieBrix API degradation
          ignoreApiError
        >
          {showTabs ? (
            <Tabs
              {...sidebarState}
              onSelectTab={(eventKey: string) => {
                dispatch(sidebarSlice.actions.selectTab(eventKey));
              }}
              onCloseTemporaryTab={(nonce) => {
                dispatch(sidebarSlice.actions.removeTemporaryPanel(nonce));
              }}
              onResolveTemporaryPanel={(nonce, action) => {
                dispatch(
                  sidebarSlice.actions.resolveTemporaryPanel({ nonce, action })
                );
              }}
            />
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

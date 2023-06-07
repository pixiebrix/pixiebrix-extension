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

import React, { useCallback, useEffect, useMemo } from "react";
import {
  addListener,
  removeListener,
  type SidebarListener,
} from "@/sidebar/protocol";
import { useDispatch, useSelector } from "react-redux";
import {
  type ActivatePanelOptions,
  type ActivateRecipePanelEntry,
  type FormPanelEntry,
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
import { HOME_PANEL } from "@/sidebar/homePanel/HomePanel";
import {
  ensureExtensionPointsInstalled,
  getReservedSidebarEntries,
} from "@/contentScript/messenger/api";
import { getTopLevelFrame } from "webext-messenger";
import useAsyncEffect from "use-async-effect";
import activateLinkClickHandler from "@/activation/activateLinkClickHandler";

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
      onShowForm(form: FormPanelEntry) {
        dispatch(sidebarSlice.actions.addForm({ form }));
      },
      onHideForm({ nonce }: Partial<FormPanelEntry>) {
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
      onShowActivateRecipe(activateRecipeEntry: ActivateRecipePanelEntry) {
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
  const { flagOn, permit } = useFlags();
  const dispatch = useDispatch();
  const listener = useConnectedListener();
  const sidebarIsEmpty = useSelector(selectIsSidebarEmpty);
  const showHomePanel = flagOn("sidebar-home-tab") && permit("marketplace");

  // `useAsyncEffect` will run once on component mount since listener and formsRef don't change on renders.
  // We could instead consider moving the initial panel logic to SidebarApp.tsx and pass the entries as the
  // initial state to the sidebarSlice reducer.
  useAsyncEffect(async () => {
    const topFrame = await getTopLevelFrame();

    // Ensure persistent sidebar extension points have been installed to have reserve their panels for the sidebar
    await ensureExtensionPointsInstalled(topFrame);

    const { panels, temporaryPanels, forms, recipeToActivate } =
      await getReservedSidebarEntries(topFrame);

    const staticPanels = showHomePanel ? [HOME_PANEL] : [];

    // Log to help debug race conditions with lifecycle
    console.debug("ConnectedSidebar:sidebarSlice.actions.setInitialPanels", {
      panels,
      temporaryPanels,
      forms,
      staticPanels,
      recipeToActivate,
    });

    dispatch(
      sidebarSlice.actions.setInitialPanels({
        panels,
        temporaryPanels,
        forms,
        staticPanels,
        recipeToActivate,
      })
    );

    // To avoid races with panel registration, listen after reserving the initial panels.
    addListener(listener);

    return () => {
      // NOTE: we don't need to cancel any outstanding forms on unmount because the FormTransformer is set up to watch
      // for PANEL_HIDING_EVENT. (and the only time this SidebarApp would unmount is if the sidebar was closing)
      removeListener(listener);
    };
    // Excluding showHomePanel from deps. The flags detect shouldn't change after initial mount. And if they somehow do,
    // we don't want to attempt to change home panel visibility after initial mount.
  }, [listener]);

  const handleLinkClicks = useCallback(
    (event: MouseEvent) => {
      activateLinkClickHandler(event, (entry) => {
        dispatch(sidebarSlice.actions.showActivateRecipe(entry));
      });
    },
    [dispatch]
  );

  // Wire up a click handler on the document to handle activate link clicks
  useEffect(() => {
    document.addEventListener("click", handleLinkClicks);
    return () => {
      document.removeEventListener("click", handleLinkClicks);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return (
    <div className="full-height">
      <ErrorBoundary>
        <RequireAuth
          LoginPage={LoginPanel}
          // Use ignoreApiError to avoid showing error on intermittent network issues or PixieBrix API degradation
          ignoreApiError
        >
          {sidebarIsEmpty ? (
            <DelayedRender millis={300}>
              <DefaultPanel />
            </DelayedRender>
          ) : (
            <Tabs />
          )}
        </RequireAuth>
      </ErrorBoundary>
    </div>
  );
};

export default ConnectedSidebar;

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

import React, { useEffect, useMemo } from "react";
import { addListener, removeListener, type SidebarListener } from "./protocol";
import { useDispatch, useSelector } from "react-redux";
import {
  type ActivatePanelOptions,
  type ModActivationPanelEntry,
  type FormPanelEntry,
  type PanelEntry,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import Tabs from "./Tabs";
import sidebarSlice from "../store/sidebar/sidebarSlice";
import RequireAuth from "../auth/RequireAuth";
import LoginPanel from "./LoginPanel";
import ErrorBoundary from "./SidebarErrorBoundary";
import { selectIsSidebarEmpty } from "./sidebarSelectors";
import DelayedRender from "../components/DelayedRender";
import DefaultPanel from "./DefaultPanel";
import { MOD_LAUNCHER } from "../store/sidebar/constants";
import {
  ensureStarterBricksInstalled,
  getReservedSidebarEntries,
} from "../contentScript/messenger/api";
import {
  getConnectedTabIdForSidebarTopFrame,
  getConnectedTarget,
} from "./connectedTarget";
import useAsyncEffect from "use-async-effect";
import activateLinkClickHandler from "../activation/activateLinkClickHandler";
import addFormPanel from "../store/sidebar/thunks/addFormPanel";
import addTemporaryPanel from "../store/sidebar/thunks/addTemporaryPanel";
import removeTemporaryPanel from "../store/sidebar/thunks/removeTemporaryPanel";
import { type AppDispatch } from "./store";
import useEventListener from "../hooks/useEventListener";
import {
  type ModComponentRef,
  validateModComponentRef,
} from "@/types/modComponentTypes";
import { assertNotNullish } from "../utils/nullishUtils";
import { CONNECTED_TAB_URL_PERFORMANCE_KEY } from "./telemetryConstants";
import { datadogRum } from "@datadog/browser-rum";

/**
 * Listeners to update the Sidebar's Redux state upon receiving messages from the contentScript.
 */
function useConnectedListener(): SidebarListener {
  const dispatch = useDispatch<AppDispatch>();

  return useMemo(
    () => ({
      onRenderPanels(panels: PanelEntry[]) {
        dispatch(sidebarSlice.actions.setPanels({ panels }));
      },
      async onShowForm(form: FormPanelEntry) {
        await dispatch(addFormPanel({ form }));
      },
      onHideForm({ nonce }: Partial<FormPanelEntry>) {
        assertNotNullish(nonce, "Expected nonce to hide form");
        dispatch(sidebarSlice.actions.removeForm(nonce));
      },
      onActivatePanel(options: ActivatePanelOptions) {
        dispatch(sidebarSlice.actions.activatePanel(options));
      },
      onUpdateTemporaryPanel(panel: TemporaryPanelEntry) {
        dispatch(sidebarSlice.actions.updateTemporaryPanel({ panel }));
      },
      async onShowTemporaryPanel(panel: TemporaryPanelEntry) {
        await dispatch(addTemporaryPanel({ panel }));
      },
      async onHideTemporaryPanel({ nonce }) {
        await dispatch(removeTemporaryPanel(nonce));
      },
      onShowActivateRecipe(modActivationPanel: ModActivationPanelEntry) {
        dispatch(
          sidebarSlice.actions.showModActivationPanel(modActivationPanel),
        );
      },
      onHideActivateRecipe() {
        dispatch(sidebarSlice.actions.hideModActivationPanel());
      },
      onNavigationComplete() {
        dispatch(sidebarSlice.actions.invalidateConnectingPanels());
      },
    }),
    [dispatch],
  );
}

function getInitialModComponentRef(url?: string): ModComponentRef | undefined {
  const param = new URL(url ?? location.href).searchParams.get(
    "initialModComponentRef",
  );
  return param ? validateModComponentRef(JSON.parse(param)) : undefined;
}

const staticPanels = [MOD_LAUNCHER];

const ConnectedSidebar: React.VFC = () => {
  const dispatch = useDispatch();
  const listener = useConnectedListener();
  const sidebarIsEmpty = useSelector(selectIsSidebarEmpty);

  // Listen for navigation events to mark temporary panels as unavailable.
  useEffect(() => {
    const navigationListener = (
      details: chrome.webNavigation.WebNavigationFramedCallbackDetails,
    ) => {
      const { frameId, tabId, documentLifecycle, url } = details;
      const connectedTabId = getConnectedTabIdForSidebarTopFrame();
      if (
        documentLifecycle === "active" &&
        tabId === connectedTabId &&
        frameId === 0
      ) {
        console.log("navigationListener:connectedTabId", connectedTabId);
        dispatch(sidebarSlice.actions.invalidatePanels());
        datadogRum.addAction("connectedTabNavigation", { url });
        datadogRum.setGlobalContextProperty(
          CONNECTED_TAB_URL_PERFORMANCE_KEY,
          url,
        );
      }
    };

    chrome.webNavigation.onBeforeNavigate.addListener(navigationListener);

    return () => {
      chrome.webNavigation.onBeforeNavigate.removeListener(navigationListener);
    };
  }, [dispatch]);

  // `useAsyncEffect` will run once on component mount since listeners and formsRef don't change on renders.
  // We could instead consider moving the initial panel logic to SidebarApp.tsx and pass the entries as the
  // initial state to the sidebarSlice reducer.
  useAsyncEffect(async () => {
    const topFrame = await getConnectedTarget();

    // Ensure persistent sidebar starter bricks have been installed to reserve their panels for the sidebar
    await ensureStarterBricksInstalled(topFrame);

    const { panels, temporaryPanels, forms, modActivationPanel } =
      await getReservedSidebarEntries(topFrame);

    // Log to help debug race conditions with lifecycle
    console.debug("ConnectedSidebar:sidebarSlice.actions.setInitialPanels", {
      panels,
      temporaryPanels,
      forms,
      staticPanels,
      modActivationPanel,
    });

    dispatch(
      sidebarSlice.actions.setInitialPanels({
        initialModComponentRef: getInitialModComponentRef(),
        panels,
        temporaryPanels,
        forms,
        staticPanels,
        modActivationPanel,
      }),
    );

    // To avoid races with panel registration, listen after reserving the initial panels.
    addListener(listener);

    return () => {
      // NOTE: we don't need to cancel any outstanding forms on unmount because the FormTransformer is set up to watch
      // for PANEL_HIDING_EVENT. (and the only time this SidebarApp would unmount is if the sidebar was closing)
      removeListener(listener);
    };
    // Excluding showModLauncher from deps. The flags detect shouldn't change after initial mount. And if they somehow do,
    // we don't want to attempt to change mod launcher panel visibility after initial mount.
  }, [listener]);

  // Wire up a click handler on the document to handle activate link clicks
  useEventListener(document, "click", (event: MouseEvent) => {
    activateLinkClickHandler(event, (entry) => {
      dispatch(sidebarSlice.actions.showModActivationPanel(entry));
    });
  });

  return (
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
  );
};

export default ConnectedSidebar;

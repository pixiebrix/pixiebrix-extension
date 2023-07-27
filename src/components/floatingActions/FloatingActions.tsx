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

import EmotionShadowRoot from "react-shadow/emotion";
import { Stylesheets } from "@/components/Stylesheets";
import bootstrap from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import React from "react";
import styles from "./FloatingActions.scss?loadAsUrl";
import ReactDOM from "react-dom";
import { QuickbarButton } from "@/components/floatingActions/QuickbarButton";
import store from "@/components/floatingActions/store";
import { getSettingsState } from "@/store/settingsStorage";
import { syncFlagOn } from "@/store/syncFlags";
import { isLoadedInIframe } from "@/iframeUtils";
import Draggable from "react-draggable";
import dragIcon from "@/icons/drag-handle.svg";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { Provider, useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import { FLOATING_ACTION_BUTTON_CONTAINER_ID } from "@/components/floatingActions/floatingActionsConstants";
import { getUserData } from "@/background/messenger/api";
import { DEFAULT_THEME } from "@/themes/themeTypes";

// Putting this outside the component since it doesn't need to trigger a re-render
let dragReported = false;
function reportReposition() {
  // Check here to prevent reporting the event twice on the same page. We just want to know
  // whether users are repositioning on the page at all.
  if (!dragReported) {
    reportEvent(Events.FLOATING_QUICK_BAR_BUTTON_REPOSITIONED);
    dragReported = true;
  }
}

export function FloatingActions() {
  const { isFloatingActionButtonEnabled } = useSelector(selectSettings);

  return (
    isFloatingActionButtonEnabled && (
      <Draggable handle=".drag-handle" onStart={reportReposition} bounds="body">
        <div className="root">
          <div className="drag-container">
            <img
              src={dragIcon}
              className="drag-handle"
              alt="drag to move quick bar button"
              // Setting draggable=false prevents browser default drag events on images
              draggable={false}
            />
            <div className="content-container">
              <QuickbarButton />
            </div>
          </div>
        </div>
      </Draggable>
    )
  );
}

function FloatingActionsContainer() {
  return (
    <Provider store={store}>
      <EmotionShadowRoot.div>
        <Stylesheets href={[bootstrap, styles]}>
          <FloatingActions />
        </Stylesheets>
      </EmotionShadowRoot.div>
    </Provider>
  );
}

/**
 * Add the floating action button to the page if the user is not an enterprise/partner user.
 */
export async function initFloatingActions(): Promise<void> {
  if (isLoadedInIframe()) {
    // Skip expensive checks
    return;
  }

  const [settings, { telemetryOrganizationId }] = await Promise.all([
    getSettingsState(),
    getUserData(),
  ]);

  // `telemetryOrganizationId` indicates user is part of an enterprise organization
  // See https://github.com/pixiebrix/pixiebrix-app/blob/39fac4874402a541f62e80ab74aaefd446cc3743/api/models/user.py#L68-L68
  // Just get the theme from the store instead of using getActive theme to avoid extra Chrome storage reads
  // In practice, the Chrome policy should not change between useGetTheme and a call to initFloatingActions on a page
  const isEnterpriseOrPartnerUser =
    Boolean(telemetryOrganizationId) || settings.theme !== DEFAULT_THEME;

  // Add floating action button if the feature flag and settings are enabled
  // XXX: consider moving checks into React component, so we can use the Redux context
  if (
    settings.isFloatingActionButtonEnabled &&
    // XXX: there's likely a race here with when syncFlagOn gets the flag from localStorage. But in practice, this
    // seems to work fine. (Likely because the flags will be loaded by the time the Promise.all above resolves)
    syncFlagOn("floating-quickbar-button-freemium") &&
    !isEnterpriseOrPartnerUser
  ) {
    const container = document.createElement("div");
    container.id = FLOATING_ACTION_BUTTON_CONTAINER_ID;
    document.body.prepend(container);
    ReactDOM.render(<FloatingActionsContainer />, container);
  }
}

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
import React, { useState } from "react";
import styles from "./FloatingActions.scss?loadAsUrl";
import ReactDOM from "react-dom";
import { QuickbarButton } from "@/components/floatingActions/QuickbarButton";
import { getSettingsState } from "@/store/settingsStorage";
import { syncFlagOn } from "@/store/syncFlags";
import { isLoadedInIframe } from "@/iframeUtils";
import Draggable from "react-draggable";
import dragIcon from "@/icons/drag-handle.svg";
import { reportEvent } from "@/telemetry/events";

// Boolean to prevent repositioning from triggering multiple times
let dragReported = false;

function reportReposition() {
  if (!dragReported) {
    reportEvent("FloatingQuickBarButtonRepositioned");
    dragReported = true;
  }
}

export function FloatingActions() {
  // Using this boolean to hide the FAB since the setting state doesn't refresh immediately
  const [hidden, setHidden] = useState<boolean>(false);
  return hidden ? null : (
    <EmotionShadowRoot.div>
      <Stylesheets href={[bootstrap, styles]}>
        <Draggable
          handle=".drag-handle"
          onDrag={reportReposition}
          bounds="body"
        >
          <div className="root">
            <div className="drag-container">
              <img
                src={dragIcon}
                className="drag-handle"
                alt="drag to move quick bar button"
                draggable={false}
              />
              <div className="content-container">
                <QuickbarButton setHidden={setHidden} />
              </div>
            </div>
          </div>
        </Draggable>
      </Stylesheets>
    </EmotionShadowRoot.div>
  );
}

export async function initFloatingActions() {
  const settings = await getSettingsState();
  // Add floating actions if the feature flag and settings are enabled
  if (
    !isLoadedInIframe() &&
    settings.isFloatingActionButtonEnabled &&
    syncFlagOn("floating-quickbar-button")
  ) {
    const container = document.createElement("div");
    container.id = "pixiebrix-floating-actions-container";
    document.body.prepend(container);
    ReactDOM.render(<FloatingActions />, container);
  }
}

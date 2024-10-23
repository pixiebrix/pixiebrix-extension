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

import EmotionShadowRoot from "@/components/EmotionShadowRoot";
import { Stylesheets } from "@/components/Stylesheets";
import bootstrap from "@/vendors/bootstrapWithoutRem.css?loadAsUrl";
import React from "react";
import styles from "./FloatingActions.scss?loadAsUrl";
import ReactDOM from "react-dom";
import { ActionButton } from "@/components/floatingActions/ActionButton";
import store, { persistor } from "@/components/floatingActions/store";
import Draggable from "react-draggable";
import dragIcon from "@/icons/drag-handle.svg";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { Provider, useSelector } from "react-redux";
import { selectSettings } from "@/store/settings/settingsSelectors";
import { FLOATING_ACTION_BUTTON_CONTAINER_ID } from "@/components/floatingActions/floatingActionsConstants";
import { PersistGate } from "redux-persist/integration/react";
import Loader from "@/components/Loader";

// Putting this outside the component since it doesn't need to trigger a re-render
let dragReported = false;
function reportReposition() {
  // Check here to prevent reporting the event twice on the same page. We just want to know
  // whether users are repositioning on the page at all.
  if (!dragReported) {
    reportEvent(Events.FLOATING_ACTION_BUTTON_REPOSITION);
    dragReported = true;
  }
}

function FloatingActions() {
  const { isFloatingActionButtonEnabled } = useSelector(selectSettings);

  return isFloatingActionButtonEnabled ? (
    <Draggable handle=".drag-handle" onStart={reportReposition} bounds="body">
      <div className="root">
        <div className="drag-container">
          <img
            src={dragIcon}
            className="drag-handle"
            alt="drag to move action button"
            // Setting draggable=false prevents browser default drag events on images
            draggable={false}
          />
          <div className="content-container">
            <ActionButton />
          </div>
        </div>
      </div>
    </Draggable>
  ) : null;
}

function FloatingActionsContainer() {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loader />} persistor={persistor}>
        <EmotionShadowRoot>
          <Stylesheets href={[bootstrap, styles]}>
            <FloatingActions />
          </Stylesheets>
        </EmotionShadowRoot>
      </PersistGate>
    </Provider>
  );
}

/**
 * Add the floating action button to the page.
 *
 * @see initFloatingActions
 */
export async function renderFloatingActions(): Promise<void> {
  const container = document.createElement("div");
  container.id = FLOATING_ACTION_BUTTON_CONTAINER_ID;
  document.body.prepend(container);
  ReactDOM.render(<FloatingActionsContainer />, container);
}

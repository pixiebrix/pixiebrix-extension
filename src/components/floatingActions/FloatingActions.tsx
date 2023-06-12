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
import { getSettingsState } from "@/store/settingsStorage";
import { syncFlagOn } from "@/store/syncFlags";

export function FloatingActions() {
  return (
    <EmotionShadowRoot.div>
      <Stylesheets href={[bootstrap, styles]}>
        <div className="root">
          <QuickbarButton />
        </div>
      </Stylesheets>
    </EmotionShadowRoot.div>
  );
}

export async function initFloatingActions() {
  const settings = await getSettingsState();
  // Add floating actions if the feature flag and settings are enabled
  if (
    settings.isFloatingActionButtonEnabled &&
    syncFlagOn("floating-quickbar-button")
  ) {
    const container = document.createElement("div");
    container.id = "pixiebrix-floating-actions-container";
    document.body.prepend(container);
    ReactDOM.render(<FloatingActions />, container);
  }
}

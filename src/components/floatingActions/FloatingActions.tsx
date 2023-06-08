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
import styles from "./FloatingActions.module.scss?loadAsUrl";
import ReactDOM from "react-dom";
import { QuickbarButton } from "@/components/floatingActions/QuickbarButton";
import useAsyncState from "@/hooks/useAsyncState";
import { getSettingsState } from "@/store/settingsStorage";
import { initialSettingsState } from "@/store/settingsSlice";

export function FloatingActions() {
  const { data } = useAsyncState(getSettingsState, [], {
    initialValue: initialSettingsState,
  });
  const { isFloatingActionButtonEnabled } = data;

  return (
    isFloatingActionButtonEnabled && (
      <EmotionShadowRoot.div>
        <Stylesheets href={[bootstrap, styles]}>
          <div className="root">
            <QuickbarButton />
          </div>
        </Stylesheets>
      </EmotionShadowRoot.div>
    )
  );
}

export function initFloatingActions() {
  const container = document.createElement("div");
  container.id = "pixiebrix-floating-actions-container";
  document.body.prepend(container);
  ReactDOM.render(<FloatingActions />, container);
}

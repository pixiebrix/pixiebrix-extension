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

import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarSearch,
  useKBar,
  VisualState,
} from "kbar";
import ReactShadowRoot from "react-shadow-root";
import faStyleSheet from "@fortawesome/fontawesome-svg-core/styles.css?loadAsUrl";
import { expectContext } from "@/utils/expectContext";
import { once } from "lodash";
import { MAX_Z_INDEX } from "@/common";
import { useEventListener } from "@/hooks/useEventListener";
import { Stylesheets } from "@/components/Stylesheets";
import selection from "@/utils/selectionController";
import { animatorStyle, searchStyle } from "./quickBarTheme";
import QuickBarResults from "./QuickBarResults";
import useActionGenerators from "@/components/quickBar/useActionGenerators";
import useActions from "@/components/quickBar/useActions";

import FocusLock from "react-focus-lock";

/**
 * Set to true if the KBar should be displayed on initial mount (i.e., because it was triggered by the
 * shortcut giving the page activeTab).
 */
let autoShow = false;

/**
 * Window event name to programmatically trigger quick bar
 */
const QUICKBAR_EVENT_NAME = "pixiebrix-quickbar";

function useAutoShow(): void {
  const { query } = useKBar();

  useEventListener(QUICKBAR_EVENT_NAME, () => {
    query.toggle();
  });

  useEffect(() => {
    if (autoShow) {
      query.toggle();
      autoShow = false;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount; query will be defined on initial mount
  }, []);
}

const AutoShow: React.FC = () => {
  useAutoShow();
  return null;
};

const KBarComponent: React.FC = () => {
  useActions();
  useActionGenerators();

  const { showing } = useKBar((state) => ({
    showing: state.visualState !== VisualState.hidden,
  }));

  // Implement saving and restoring last selection in KBarComponent and remove KBarToggle Component.
  if (showing) {
    selection.save();
    console.debug("Saving last selection:", selection.get());
  } else {
    console.debug("Restoring last selection:", selection.get());
    selection.restore();
  }

  // We're using the Shadow DOM to isolate the style. However, that also means keydown events look like they're
  // coming from the div instead of the search input.
  //
  // - Include div.contentEditable to indicate to hotkey libraries that the user is interacting with the quick bar
  // - Salesforce looks for the `cke_editable` instead of contentEditable, so provide that class
  //
  // Library references:
  // - hotkey: https://github.com/github/hotkey/blob/main/src/utils.ts#L1
  // - Salesforce: https://salesforce.stackexchange.com/questions/183771/disable-keyboard-shortcuts-in-lightning-experience

  return (
    <KBarPortal>
      <KBarPositioner style={{ zIndex: MAX_Z_INDEX }}>
        <KBarAnimator style={animatorStyle}>
          <div
            className="cke_editable"
            contentEditable
            suppressContentEditableWarning
          >
            <ReactShadowRoot mode="closed">
              <Stylesheets href={faStyleSheet} mountOnLoad>
                <FocusLock>
                  <KBarSearch style={searchStyle} />
                  <QuickBarResults />
                </FocusLock>
              </Stylesheets>
            </ReactShadowRoot>
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
};

const QuickBarApp: React.FC = () => (
  /* Disable exit animation due to #3724. `enterMs` is required too */
  <KBarProvider
    options={{
      animations: { enterMs: 300, exitMs: 0 },
    }}
  >
    <AutoShow />
    <KBarComponent />
  </KBarProvider>
);

export const toggleQuickBar = () => {
  // There's a race between when this method will run and when initQuickBarApp will be run from the quickbar
  // extension point. So, use autoShow to handle case where we call initQuickBarApp first, and dispatchEvent
  // for the case where QuickBarApp is already on the page
  autoShow = true;
  initQuickBarApp();

  window.dispatchEvent(new Event(QUICKBAR_EVENT_NAME));
};

export const initQuickBarApp = once(() => {
  expectContext("contentScript");

  const container = document.createElement("div");
  container.id = "pixiebrix-quickbar-container";
  document.body.prepend(container);
  ReactDOM.render(<QuickBarApp />, container);

  console.debug("Initialized quick bar");
});

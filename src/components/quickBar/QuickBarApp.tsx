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
 * Window event name to programmatically trigger quick bar.
 *
 * Exposed for testing. Use `toggleQuickBar` to trigger the QuickBar.
 *
 * @see toggleQuickBar
 */
export const QUICKBAR_EVENT_NAME = "pixiebrix-quickbar";

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

  // Save the selection at the time the quick bar is shown so it can be used in quick bar actions even after the user
  // types in the quick bar search box. Restore the selection when the quick bar is hidden.
  // Must be in a useEffect, otherwise when the user types in the quick bar search box, the selection is lost because
  // there's no selection on the render.
  useEffect(() => {
    if (showing) {
      selection.save();
      console.debug("Saving last selection:", selection.get());
    } else {
      console.debug("Restoring last selection:", selection.get());
      selection.restore();
    }
  }, [showing]);

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
            data-testid="quickBar"
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

export const QuickBarApp: React.FC = () => (
  /* Disable exit animation due to #3724. `enterMs` is required too */
  <KBarProvider
    options={{
      animations: { enterMs: 300, exitMs: 0 },
      // Setting `toggleShortcut` to same as the Chrome-level PixieBrix `toggle-quick-bar` command shortcut defined
      // in manifest.json. However, it generally won't take effect. (And KBar does not support disabling it's shortcut)
      //
      // There are 4 cases for the relationship between this KBar page shortcut and the PixieBrix
      // `toggle-quick-bar` command shortcut:
      //
      // 1. User has PixieBrix `toggle-quick-bar` command shortcut: that shortcut will take precedence over this
      //  KBar shortcut
      // 2. User has another extension command bound to $mod+m: that extension's shortcut will take precedence.
      // 3. User doesn't have a Chrome extension shortcut bound to $mod+m: the Chrome minimize shortcut
      //  will take precedence; see https://support.google.com/chrome/answer/157179?hl=en&co=GENIE.Platform%3DDesktop
      // 4. Finally, if user disabled all extension and Chrome shortcuts for $mod+m, then this KBar shortcut will
      //  take effect.
      //
      // Reference:
      // https://kbar.vercel.app/docs/concepts/shortcuts
      // https://github.com/jamiebuilds/tinykeys#keybinding-syntax
      // https://github.com/timc1/kbar/blob/main/src/InternalEvents.tsx#L28
      toggleShortcut: "$mod+m",
    }}
  >
    <AutoShow />
    <KBarComponent />
  </KBarProvider>
);

/**
 * Show the quick bar.
 */
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

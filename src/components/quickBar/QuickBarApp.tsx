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

import React, { type KeyboardEventHandler, useEffect } from "react";
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
import EmotionShadowRoot from "@/components/EmotionShadowRoot";
import faStyleSheet from "@fortawesome/fontawesome-svg-core/styles.css?loadAsUrl";
import { expectContext } from "@/utils/expectContext";
import { once } from "lodash";
import {
  MAX_Z_INDEX,
  PIXIEBRIX_QUICK_BAR_CONTAINER_CLASS,
  QUICK_BAR_READY_ATTRIBUTE,
} from "@/domConstants";
import useEventListener from "@/hooks/useEventListener";
import { Stylesheets } from "@/components/Stylesheets";
import selection from "@/utils/selectionController";
import focus from "@/utils/focusController";
import { animatorStyle, searchStyle } from "./quickBarTheme";
import QuickBarResults from "./QuickBarResults";
import useActionGenerators from "@/components/quickBar/useActionGenerators";
import useActions from "@/components/quickBar/useActions";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import defaultActions, {
  pageEditorAction,
} from "@/components/quickBar/defaultActions";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import { onContextInvalidated } from "webext-events";
import StopPropagation from "@/components/StopPropagation";
import useScrollLock from "@/hooks/useScrollLock";
// eslint-disable-next-line no-restricted-imports -- being used in initQuickBarApp
import { restrict } from "@/auth/featureFlagStorage";
import useOnMountOnly from "@/hooks/useOnMountOnly";
import { RestrictedFeatures } from "@/auth/featureFlags";

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

const MODE = process.env.SHADOW_DOM as "open" | "closed";

function useAutoShow(): void {
  const { query } = useKBar();

  useEventListener(window, QUICKBAR_EVENT_NAME, () => {
    query.toggle();
  });

  useOnMountOnly(() => {
    if (autoShow) {
      query.toggle();
      autoShow = false;
    }
  });
}

const AutoShow: React.FC = () => {
  useAutoShow();
  return null;
};

const KBarComponent: React.FC = () => {
  useActions();
  useActionGenerators();

  const { query, showing } = useKBar((state) => ({
    showing: state.visualState !== VisualState.hidden,
  }));

  const closeQuickBarOnEscape: KeyboardEventHandler<HTMLInputElement> = (
    event,
  ) => {
    if (event.key === "Escape") {
      query.toggle();
    }
  };

  useScrollLock(showing);

  // Save the selection at the time the quick bar is shown so it can be used in quick bar actions even after the user
  // types in the quick bar search box. Restore the selection when the quick bar is hidden.
  // Must be in a useEffect, otherwise when the user types in the quick bar search box, the selection is lost because
  // there's no selection on the render.
  useEffect(() => {
    if (showing) {
      selection.save();
      focus.save();
      console.debug("Saving last selection:", selection.get());
      console.debug("Saving last focus:", focus.get());
    } else {
      console.debug("Restoring last selection:", selection.get());
      console.debug("Restoring last focus:", focus.get());
      selection.restore();
      focus.restore();
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
      <KBarPositioner
        style={{
          zIndex: MAX_Z_INDEX,
          backgroundColor: "transparent",
        }}
      >
        <KBarAnimator style={animatorStyle}>
          <EmotionShadowRoot
            data-testid="quickBar"
            className="cke_editable"
            mode={MODE}
            contentEditable
            suppressContentEditableWarning
          >
            <Stylesheets href={faStyleSheet} mountOnLoad>
              <StopPropagation onKeyPress onKeyDown onKeyUp onInput>
                {/* eslint-disable-next-line react/jsx-max-depth -- Not worth simplifying */}
                <KBarSearch
                  onKeyDown={closeQuickBarOnEscape}
                  style={searchStyle}
                />
              </StopPropagation>
              <QuickBarResults />
            </Stylesheets>
          </EmotionShadowRoot>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
};

export const QuickBarApp: React.FC = () => (
  <KBarProvider
    options={{
      disableDocumentLock: true,

      /* Disable exit animation due to #3724. `enterMs` is required too */
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

function markQuickBarReady() {
  const html = globalThis.document?.documentElement;
  html.setAttribute(QUICK_BAR_READY_ATTRIBUTE, "true");
}

export const initQuickBarApp = once(async () => {
  expectContext("contentScript");

  // The QuickBarApp only lives in the top-level frame
  if (isLoadedInIframe()) {
    console.warn("initQuickBarApp called in iframe");
    return;
  }

  for (const action of defaultActions) {
    quickBarRegistry.addAction(action);
  }

  if (!(await restrict(RestrictedFeatures.PAGE_EDITOR))) {
    quickBarRegistry.addAction(pageEditorAction);
  }

  const container = document.createElement("div");
  container.className = PIXIEBRIX_QUICK_BAR_CONTAINER_CLASS;
  document.body.prepend(container);
  ReactDOM.render(<QuickBarApp />, container);
  console.debug("Initialized quick bar");

  markQuickBarReady();

  onContextInvalidated.addListener(() => {
    console.debug("Removed quick bar due to context invalidation");
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  });
});

/**
 * Show the quick bar.
 */
export const toggleQuickBar = async () => {
  // There's a race between when this method will run and when initQuickBarApp will be run from the quickbar
  // extension point. So, use autoShow to handle case where we call initQuickBarApp first, and dispatchEvent
  // for the case where QuickBarApp is already on the page
  autoShow = true;
  await initQuickBarApp();

  window.dispatchEvent(new Event(QUICKBAR_EVENT_NAME));
};

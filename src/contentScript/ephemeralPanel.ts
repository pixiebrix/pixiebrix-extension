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

import type { Except, JsonObject } from "type-fest";
import { uuidv4 } from "@/types/helpers";
import {
  cancelTemporaryPanels,
  cancelTemporaryPanelsForExtension,
  registerEmptyTemporaryPanel,
  stopWaitingForTemporaryPanels,
  updatePanelDefinition,
  waitForTemporaryPanel,
} from "@/platform/panels/panelController";
import type { TemporaryPanelEntry } from "@/types/sidebarTypes";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { once } from "lodash";
import { isSpecificError } from "@/errors/errorHelpers";
import { AbortPanelAction, ClosePanelAction } from "@/bricks/errors";
import {
  hideTemporarySidebarPanel,
  showSidebar,
  showTemporarySidebarPanel,
  sidePanelOnClose,
  updateTemporarySidebarPanel,
} from "@/contentScript/sidebarController";
import { updateTemporaryOverlayPanel } from "@/contentScript/ephemeralPanelController";
import type { TemporaryPanelDefinition } from "@/platform/panels/panelTypes";
import type { Location } from "@/types/starterBrickTypes";
import { getThisFrame } from "webext-messenger";
import { expectContext } from "@/utils/expectContext";
import { showModal } from "@/contentScript/modalDom";
import { isLoadedInIframe } from "@/utils/iframeUtils";

export async function createFrameSource(
  nonce: string,
  mode: Location,
): Promise<URL> {
  const target = await getThisFrame();

  const frameSource = new URL(browser.runtime.getURL("ephemeralPanel.html"));
  frameSource.searchParams.set("nonce", nonce);
  frameSource.searchParams.set("opener", JSON.stringify(target));
  frameSource.searchParams.set("mode", mode);
  return frameSource;
}

/**
 * Display a brick in a temporary panel: sidebar, modal, or popover.
 * @param panelEntryMetadata the panel entry without a payload
 * @param getPayload factory to generate the panel entry payload
 * @param location the location to show the panel
 * @param signal abort signal
 * @param target target element, if location is popover
 * @param refreshTrigger optional trigger to refresh the panel
 * @param popoverOptions optional popover options
 * @param onOutsideClick optional callback to invoke when the user clicks outside the popover/modal
 * @param onCloseClick optional callback to invoke when the user clicks the close button on the popover/modal
 */
export async function ephemeralPanel({
  panelEntryMetadata,
  getPayload,
  location,
  signal,
  target,
  refreshTrigger,
  popoverOptions = {},
  onOutsideClick,
  onCloseClick,
}: TemporaryPanelDefinition): Promise<JsonObject> {
  expectContext("contentScript");

  if (location === "panel" && isLoadedInIframe()) {
    // Validate before registerEmptyTemporaryPanel to avoid an uncaught promise rejection
    throw new BusinessError(
      "Cannot show sidebar in a frame. To use the sidebar, set the target to Top-level Frame",
    );
  }

  const nonce = uuidv4();
  let onReady: (() => void) | undefined;

  const controller = new AbortController();

  signal?.addEventListener("abort", () => {
    void cancelTemporaryPanels([nonce]);
  });

  function updateEntry(newEntry: Except<TemporaryPanelEntry, "type">) {
    updatePanelDefinition(newEntry);

    if (location === "panel") {
      void updateTemporarySidebarPanel(newEntry);
    } else {
      updateTemporaryOverlayPanel(newEntry);
    }
  }

  if (location === "panel") {
    // Register before showTemporarySidebarPanel in order to avoid sidebar initialization race conditions
    registerEmptyTemporaryPanel({
      nonce,
      location,
      extensionId: panelEntryMetadata.modComponentRef.extensionId,
    });

    await showSidebar();

    // Show loading
    await showTemporarySidebarPanel({
      ...panelEntryMetadata,
      nonce,
      payload: {
        key: uuidv4(),
        extensionId: panelEntryMetadata.modComponentRef.extensionId,
        loadingMessage: "Loading",
      },
    });

    // Abort on sidebar close
    sidePanelOnClose(controller.abort.bind(controller));

    controller.signal.addEventListener("abort", () => {
      void hideTemporarySidebarPanel(nonce);
      void stopWaitingForTemporaryPanels([nonce]);
    });
  } else {
    // Popover/modal location
    // Clear existing to remove stale modals/popovers
    await cancelTemporaryPanelsForExtension(
      panelEntryMetadata.modComponentRef.extensionId,
    );

    // Register empty panel for "loading" state
    registerEmptyTemporaryPanel({
      nonce,
      location,
      extensionId: panelEntryMetadata.modComponentRef.extensionId,
    });

    // Create a source URL for content that will be loaded in the panel iframe
    const frameSource = await createFrameSource(nonce, location);

    if (location === "popover") {
      if (target === document) {
        throw new BusinessError("Target must be an element for popover");
      }

      const { showPopover } = await import(
        /* webpackChunkName: "popoverDom" */
        "@/contentScript/popoverDom"
      );

      const popover = showPopover({
        url: frameSource,
        element: target as HTMLElement,
        signal: controller.signal,
        options: popoverOptions,
        onOutsideClick() {
          if (onOutsideClick) {
            onOutsideClick(nonce);
          } else {
            // Default behavior is to resolve the panel without an action
            void cancelTemporaryPanels([nonce]);
          }
        },
      });

      // Wrap in once so it's safe for refresh callback
      onReady = once(() => {
        popover.onReady();
      });
    } else {
      showModal({
        url: frameSource,
        controller,
        onOutsideClick() {
          // Unlike popover, the default behavior for modal is to force interaction
          if (onOutsideClick) {
            onOutsideClick(nonce);
          }
        },
      });
    }
  }

  // Load the real payload
  const payload = await getPayload();

  const entry: Except<TemporaryPanelEntry, "type"> = {
    ...panelEntryMetadata,
    nonce,
    payload,
  };

  // Show the real payload
  updateEntry(entry);

  const rerender = async () => {
    try {
      const newEntry = {
        ...panelEntryMetadata,
        nonce,
        payload: await getPayload(),
      };
      // Force a re-render by changing the key
      newEntry.payload.key = uuidv4();

      updateEntry(newEntry);
    } catch (error) {
      // XXX: in the future, we may want to updatePanelDefinition with the error
      console.warn("Ignoring error re-rendering temporary panel", error);
    }
  };

  if (refreshTrigger === "statechange") {
    $(document).on("statechange", rerender);
  }

  try {
    const panelAction = await waitForTemporaryPanel({
      nonce,
      location,
      entry,
      extensionId: entry.modComponentRef.extensionId,
      onRegister: onReady,
    });
    return panelAction ?? {};
  } catch (error) {
    if (isSpecificError(error, ClosePanelAction)) {
      onCloseClick?.(nonce);
    } else if (isSpecificError(error, AbortPanelAction)) {
      // Must be before isSpecificError(error, CancelError) because CancelError is a subclass of AbortPanelAction
      throw error;
    } else if (isSpecificError(error, CancelError)) {
      // See discussion at: https://github.com/pixiebrix/pixiebrix-extension/pull/4915
      // For temporary forms, we throw the CancelError because typically the form is input to additional bricks.
      // For temporary information, typically the information is displayed as the last brick in the action.
      // Given that this brick doesn't return any values currently, we'll just swallow the error and return normally
      // NOP
    } else {
      throw error;
    }
  } finally {
    controller.abort();
    $(document).off("statechange", rerender);
  }

  return {};
}

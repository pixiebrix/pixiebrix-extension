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

import { uuidv4, validateRegistryId } from "@/types/helpers";
import {
  type BrickArgs,
  type BrickOptions,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { expectContext } from "@/utils/expectContext";
import {
  ensureSidebar,
  HIDE_SIDEBAR_EVENT_NAME,
  hideTemporarySidebarPanel,
  showTemporarySidebarPanel,
  updateTemporarySidebarPanel,
} from "@/contentScript/sidebarController";
import {
  type PanelPayload,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import {
  cancelTemporaryPanels,
  cancelTemporaryPanelsForExtension,
  registerEmptyTemporaryPanel,
  stopWaitingForTemporaryPanels,
  updatePanelDefinition,
  waitForTemporaryPanel,
} from "@/bricks/transformers/temporaryInfo/temporaryPanelProtocol";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { getThisFrame } from "webext-messenger";
import { showModal } from "@/bricks/transformers/ephemeralForm/modalUtils";
import { IS_ROOT_AWARE_BRICK_PROPS } from "@/bricks/rootModeHelpers";
import type { Placement } from "@/bricks/transformers/temporaryInfo/popoverUtils";
import { updateTemporaryOverlayPanel } from "@/contentScript/ephemeralPanelController";
import { once } from "lodash";
import { AbortPanelAction, ClosePanelAction } from "@/bricks/errors";
import { isSpecificError } from "@/errors/errorHelpers";
import { type Except, type JsonObject } from "type-fest";
import { type UUID } from "@/types/stringTypes";
import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type Schema } from "@/types/schemaTypes";
import { type Location } from "@/types/starterBrickTypes";
import { assertNotNull_UNSAFE } from "@/utils/typeUtils";

// Match naming of the sidebar panel extension point triggers
export type RefreshTrigger = "manual" | "statechange";

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

export type TemporaryPanelEntryMetadata = Except<
  TemporaryPanelEntry,
  "type" | "nonce" | "payload"
>;

export type TemporaryDisplayInputs = {
  /**
   * The temporary panel entry.
   */
  panelEntryMetadata: TemporaryPanelEntryMetadata;
  /**
   * Factory function to generate the panel payload
   */
  getPayload: () => Promise<PanelPayload>;
  /**
   * The location to display the panel.
   */
  location: Location;
  /**
   * Target element for popover.
   */
  target: HTMLElement | Document;
  /**
   * An optional abortSignal to cancel the panel.
   */
  signal?: AbortSignal;

  /**
   * An optional trigger to trigger a panel refresh.
   */
  refreshTrigger?: RefreshTrigger;

  /**
   * Handler when the user clicks outside the modal/popover.
   */
  onOutsideClick?: (nonce: UUID) => void;

  /**
   * Handler when the user clicks the close button on the modal/popover. If not provided, don't show the button.
   */
  onCloseClick?: (nonce: UUID) => void;

  /**
   * Optional placement options for popovers.
   */
  popoverOptions?: {
    /**
     * The placement of the popover, default 'auto'
     */
    placement?: Placement;
  };
};

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
export async function displayTemporaryInfo({
  panelEntryMetadata,
  getPayload,
  location,
  signal,
  target,
  refreshTrigger,
  popoverOptions = {},
  onOutsideClick,
  onCloseClick,
}: TemporaryDisplayInputs): Promise<JsonObject> {
  const nonce = uuidv4();
  let onReady: (() => void) | undefined;

  const controller = new AbortController();

  signal?.addEventListener("abort", () => {
    void cancelTemporaryPanels([nonce]);
  });

  function updateEntry(newEntry: Except<TemporaryPanelEntry, "type">) {
    updatePanelDefinition(newEntry);

    if (location === "panel") {
      updateTemporarySidebarPanel(newEntry);
    } else {
      updateTemporaryOverlayPanel(newEntry);
    }
  }

  if (location === "panel") {
    // Register before showTemporarySidebarPanel in order to avoid sidebar initialization race conditions
    registerEmptyTemporaryPanel({
      nonce,
      location,
      extensionId: panelEntryMetadata.extensionId,
    });

    await ensureSidebar();

    // Show loading
    showTemporarySidebarPanel({
      ...panelEntryMetadata,
      nonce,
      payload: {
        key: uuidv4(),
        extensionId: panelEntryMetadata.extensionId,
        loadingMessage: "Loading",
      },
    });

    window.addEventListener(
      HIDE_SIDEBAR_EVENT_NAME,
      () => {
        controller.abort();
      },
      {
        signal: controller.signal,
      },
    );

    controller.signal.addEventListener("abort", () => {
      hideTemporarySidebarPanel(nonce);
      void stopWaitingForTemporaryPanels([nonce]);
    });
  } else {
    // Popover/modal location
    // Clear existing to remove stale modals/popovers
    await cancelTemporaryPanelsForExtension(panelEntryMetadata.extensionId);

    // Register empty panel for "loading" state
    registerEmptyTemporaryPanel({
      nonce,
      location,
      extensionId: panelEntryMetadata.extensionId,
    });

    // Create a source URL for content that will be loaded in the panel iframe
    const frameSource = await createFrameSource(nonce, location);

    if (location === "popover") {
      if (target === document) {
        throw new BusinessError("Target must be an element for popover");
      }

      const { showPopover } = await import(
        /* webpackChunkName: "popoverUtils" */
        "@/bricks/transformers/temporaryInfo/popoverUtils"
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
      if (newEntry.payload) {
        newEntry.payload.key = uuidv4();
      }

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
    return (
      (await waitForTemporaryPanel({
        nonce,
        location,
        entry,
        extensionId: entry.extensionId,
        onRegister: onReady,
      })) ?? {}
    );
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

class DisplayTemporaryInfo extends TransformerABC {
  static BLOCK_ID = validateRegistryId("@pixiebrix/display");
  defaultOutputKey = "infoOutput";

  constructor() {
    super(
      DisplayTemporaryInfo.BLOCK_ID,
      "Display Temporary Information",
      "Display a document in a temporary sidebar panel",
    );
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "A display title for the temporary document, shown in the tab name",
      },
      body: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The render pipeline for the temporary document",
      },
      location: {
        type: "string",
        title: "Location",
        oneOf: [
          { const: "panel", title: "Sidebar" },
          { const: "modal", title: "Modal" },
          { const: "popover", title: "Popover" },
        ],
        default: "panel",
        description: "The location of the information (default='Sidebar')",
      },
      refreshTrigger: {
        type: "string",
        title: "Refresh Trigger",
        oneOf: [
          { const: "manual", title: "Manual" },
          { const: "statechange", title: "Mod Variable/Page State Changed" },
        ],
        description: "An optional trigger for refreshing the document",
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    required: ["body"],
  };

  async transform(
    {
      title,
      body: bodyPipeline,
      location = "panel",
      refreshTrigger = "manual",
      isRootAware = false,
    }: BrickArgs<{
      title: string;
      location: Location;
      refreshTrigger: RefreshTrigger;
      body: PipelineExpression;
      isRootAware: boolean;
    }>,
    {
      logger: {
        context: { extensionId, blueprintId },
      },
      root,
      ctxt,
      runPipeline,
      runRendererPipeline,
      abortSignal,
    }: BrickOptions,
  ): Promise<JsonObject | null> {
    expectContext("contentScript");

    const target = isRootAware ? root : document;
    assertNotNull_UNSAFE(extensionId);
    assertNotNull_UNSAFE(blueprintId);

    // Counter for tracking branch execution
    let counter = 0;

    const panelEntryMetadata: TemporaryPanelEntryMetadata = {
      heading: title,
      extensionId,
      blueprintId,
    };

    const getPayload = async () => {
      const result = await runRendererPipeline(
        bodyPipeline,
        {
          key: "body",
          counter,
        },
        {},
        target,
      );

      counter++;

      return result as PanelPayload;
    };

    return displayTemporaryInfo({
      panelEntryMetadata,
      getPayload,
      location,
      signal: abortSignal,
      target,
      refreshTrigger,
    });
  }
}

export default DisplayTemporaryInfo;

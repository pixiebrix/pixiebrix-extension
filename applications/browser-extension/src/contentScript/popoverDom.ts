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

import { createPopper, type Instance as PopperInstance } from "@popperjs/core";
import { type IFrameComponent, iframeResizer } from "iframe-resizer";
import { trimEnd } from "lodash";
import popoverStyleUrl from "./popover.scss?loadAsUrl";
import injectStylesheet from "../utils/injectStylesheet";
import { uuidv4, validateUUID } from "@/types/helpers";
import { setTemporaryOverlayPanel } from "./ephemeralPanelController";
import { html } from "code-tag";
import { setAnimationFrameInterval } from "../utils/domUtils";
import { ensureTooltipsContainer } from "./tooltipDom";
import { expectContext } from "../utils/expectContext";

// https://popper.js.org/docs/v2/constructors/
export type Placement =
  | "auto"
  | "auto-start"
  | "auto-end"
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "right"
  | "right-start"
  | "right-end"
  | "left"
  | "left-start"
  | "left-end";

type PopoverOptions = {
  placement?: Placement;
};

/**
 * Pool of available popovers that can be re-used to avoid frame cold-start.
 */
const popoverPool: HTMLElement[] = [];
const popperMap = new WeakMap<HTMLElement, PopperInstance>();
const resizerMap = new WeakMap<HTMLElement, IFrameComponent>();

/**
 * Creates a new popover toolip/frame, or reuses an existing one.
 * @param initialUrl the original iframe URL
 */
function popoverFactory(initialUrl: URL): HTMLElement {
  expectContext("contentScript");

  const $container = $(ensureTooltipsContainer());

  const existingPopover = popoverPool.pop();
  if (existingPopover) {
    console.debug("Using existing frame from frame pool");
    return existingPopover;
  }

  const decoratedUrl = new URL(initialUrl);
  const frameNonce = uuidv4();
  console.debug("No available popovers, creating popover %s", frameNonce);

  // Pass to the EphemeralPanel for useTemporaryPanelDefinition
  decoratedUrl.searchParams.set("frameNonce", frameNonce);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- It's being created here, it can't be missing
  const tooltip = $(html`
    <div role="tooltip" data-popover-id="${frameNonce}" style="display: none;">
      <iframe
        src="${decoratedUrl.href}"
        title="Popover content"
        scrolling="no"
        style="border: 0; color-scheme: normal;"
      ></iframe>
      <div data-popper-arrow></div>
    </div>
  `).get(0)!;

  $container.append(tooltip);

  const [resizer] = iframeResizer(
    {
      id: frameNonce,
      // NOTE: autoResize doesn't work very well because BodyContainer has a Shadow DOM. So the mutation
      // observer used by iframeResizer can't see it
      autoResize: false,
      sizeWidth: true,
      sizeHeight: true,
      checkOrigin: [trimEnd(chrome.runtime.getURL(""), "/")],
      // Looks for data-iframe-height in PopoverLayout
      heightCalculationMethod: "taggedElement",
      resizedCallback() {
        void popperMap.get(tooltip)?.update();
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- It's being created here, it can't be missing
    tooltip.querySelector("iframe")!,
  );

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- It's being created here, it can't be missing
  resizerMap.set(tooltip, resizer!);
  return tooltip;
}

/**
 * Reclaim a popover for the popover pool
 * @param tooltip the popover element.
 */
function reclaimTooltip(tooltip: HTMLElement): void {
  const $popover = $(tooltip);

  // Hide, but keep in DOM tree so iframe doesn't have to reload
  $popover.hide();

  // Set popper to null before destroying to avoid deleting the tooltip
  const popper = popperMap.get(tooltip);
  if (popper) {
    // https://github.com/floating-ui/floating-ui/issues/538
    popper.state.elements.popper = document.documentElement;
    popper.destroy();
    popperMap.delete(tooltip);
  }

  // Clear content from the panel
  setTemporaryOverlayPanel({
    frameNonce: validateUUID(tooltip.dataset.popoverId),
    panelNonce: validateUUID(null),
  });

  // Mark as available in the popover pool
  popoverPool.push(tooltip);
}

/**
 * Attach a popover to an element on the page
 */
function attachPopover({
  url,
  element,
  placement,
}: {
  url: URL;
  nonce: string;
  element: HTMLElement;
  placement?: Placement;
}) {
  const tooltip = popoverFactory(url);
  const $tooltip = $(tooltip);

  $tooltip.show();

  const popper = createPopper(element, tooltip, {
    placement: placement ?? "auto",
    strategy: "fixed",
    modifiers: [
      {
        name: "offset",
        options: {
          // The first number, skidding, displaces the popper along the reference element.
          // The second number, distance, displaces the popper away from, or toward, the reference element
          // in the direction of its placement. A positive number displaces it further away, while a negative
          // number lets it overlap the reference.
          offset: [0, 24],
        },
      },
      {
        name: "arrow",
      },
      {
        name: "computeStyles",
        options: {
          // Adaptive was breaking top positioning :shrug:
          adaptive: false,
        },
      },
    ],
  });

  popperMap.set(tooltip, popper);

  return {
    popper,
    tooltip,
    frameNonce: validateUUID(tooltip.dataset.popoverId),
  };
}

export function showPopover({
  url,
  element,
  onOutsideClick,
  signal,
  options: { placement } = {},
}: {
  /**
   * The source of the URL
   * @see createFrameSource
   */
  url: URL;
  /**
   * The target element
   */
  element: HTMLElement;
  /**
   * Callback to be called when the user clicks outside the popover, e.g., skip a tour, or go to next step.
   */
  onOutsideClick?: () => void;
  /**
   * AbortSignal to cancel the popover
   */
  signal: AbortSignal;
  options: PopoverOptions;
}): {
  /**
   * Callback to be called when the popover content ready to be shown, i.e., it's initial panel definition is registered
   */
  onReady: () => void;
} {
  void injectStylesheet(popoverStyleUrl);
  const $body = $(document.body);
  const nonce = validateUUID(url.searchParams.get("nonce"));

  const { tooltip, frameNonce } = attachPopover({
    url,
    nonce,
    element,
    placement,
  });

  // NOTE: autoResize doesn't work very well because BodyContainer has a Shadow DOM. So the mutation
  // observer built into iframeResizer can't see it
  void setAnimationFrameInterval(
    () => {
      resizerMap.get(tooltip)?.iFrameResizer.resize();
    },
    { signal },
  );

  const outsideClickListener = (event: JQuery.TriggeredEvent) => {
    if ($(event.target).closest(tooltip).length === 0) {
      onOutsideClick?.();
    }
  };

  // Hide tooltip on click outside
  $body.on("click touchend", outsideClickListener);

  signal.addEventListener("abort", () => {
    // Must be done before removing the tooltip, otherwise the iframe will be removed from the DOM
    reclaimTooltip(tooltip);

    $body.off("click touchend", outsideClickListener);
  });

  return {
    onReady() {
      setTemporaryOverlayPanel({ frameNonce, panelNonce: nonce });
    },
  };
}

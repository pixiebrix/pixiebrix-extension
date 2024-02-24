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

import ActionRegistry from "@/contentScript/selectionTooltip/ActionRegistry";
import { once } from "lodash";
import type { Nullishable } from "@/utils/nullishUtils";
import { render } from "react-dom";
import React from "react";
import { ensureTooltipsContainer } from "@/contentScript/tooltipDom";
import {
  autoUpdate,
  computePosition,
  flip,
  inline,
  offset,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";
import { getCaretCoordinates } from "@/utils/textAreaUtils";
import SelectionToolbar from "@/contentScript/selectionTooltip/SelectionToolbar";
import { expectContext } from "@/utils/expectContext";
import { onContextInvalidated } from "webext-events";
import { MAX_Z_INDEX } from "@/domConstants";
import { isNativeField } from "@/types/inputTypes";
import { RepeatableAbortController } from "abort-utils";

const MIN_SELECTION_LENGTH_CHARS = 3;

export const tooltipActionRegistry = new ActionRegistry();

let selectionTooltip: Nullishable<HTMLElement>;

/**
 * AbortController fired when the popover is hidden/destroyed.
 */
const cleanupController = new RepeatableAbortController();

async function showTooltip(): Promise<void> {
  if (tooltipActionRegistry.actions.size === 0) {
    // No registered actions to show
    return;
  }

  selectionTooltip ??= createTooltip();
  selectionTooltip.setAttribute("aria-hidden", "false");
  selectionTooltip.style.setProperty("display", "block");

  // For now just hide the tooltip on editor scroll to avoid gotchas with floating UI's `position: fixed` strategy.
  // See updatePosition for more context. Without this, the tooltip moves with the scroll to keep its position
  // in the viewport fixed.
  document.activeElement?.addEventListener(
    "scroll",
    () => {
      hideTooltip();
    },
    { passive: true, once: true },
  );

  return updatePosition();
}

/**
 * Hide the tooltip.
 */
function hideTooltip(): void {
  selectionTooltip?.setAttribute("aria-hidden", "true");
  selectionTooltip?.style.setProperty("display", "none");
  cleanupController.abortAndReset();
}

/**
 * Completely remove the tooltip from the DOM.
 */
function destroyTooltip(): void {
  selectionTooltip?.remove();
  selectionTooltip = null;
  cleanupController.abortAndReset();
}

function createTooltip(): HTMLElement {
  const container = ensureTooltipsContainer();

  const popover = document.createElement("div");
  // TODO: figure out how to use with the popover API. Just setting "popover" attribute doesn't promote the element to
  //  the top layer. I believe we need to call showPopover() on it. We also need it to work with floating UI so we
  //  can target a virtual element with offset. See https://github.com/floating-ui/floating-ui/issues/1842
  // Using popover attribute should keep it on top of the page
  // https://developer.chrome.com/blog/introducing-popover-api
  // https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
  popover.setAttribute("popover", "manual");
  popover.dataset.testid = "pixiebrix-selection-tooltip";
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/showPopover -- required to add it to the top layer
  popover.style.setProperty("z-index", (MAX_Z_INDEX - 1).toString());

  // Must be set before positioning: https://floating-ui.com/docs/computeposition#initial-layout
  // We were getting placement glitches when using "absolute" positioning. The downside of "fixed" is that the
  // positioning on scroll doesn't "just work". See comments in updatePosition
  popover.style.setProperty("position", "fixed");
  popover.style.setProperty("width", "max-content");
  popover.style.setProperty("top", "0");
  popover.style.setProperty("left", "0");
  // Override Chrome's base styles for [popover] attribute and provide a consistent look across applications that
  // override the browser defaults (e.g., Zendesk)
  popover.style.setProperty("margin", "0");
  popover.style.setProperty("padding", "0");
  popover.style.setProperty("border-radius", "5px");
  // Can't use colors file because the element is being rendered directly on the host
  popover.style.setProperty("background-color", "#ffffff"); // $S0 color
  popover.style.setProperty("border", "2px solid #a8a1b4"); // $N200 color

  render(
    <SelectionToolbar registry={tooltipActionRegistry} onHide={hideTooltip} />,
    popover,
  );

  container.append(popover);

  selectionTooltip = popover;

  return selectionTooltip;
}

function getPositionReference(selection: Selection): VirtualElement | Element {
  const { activeElement } = document;

  // Browsers don't report an accurate selection within inputs/textarea
  if (isNativeField(activeElement)) {
    const elementRect = activeElement.getBoundingClientRect();

    return {
      getBoundingClientRect() {
        // Try to be somewhat smart about where to place the tooltip when the user has a range selected. Ideally
        // In a perfect world, we'd be able to provide getClientRects for the top row so the value is consistent
        // with behavior for normal text.
        const topPosition = Math.min(
          activeElement.selectionStart ?? 0,
          activeElement.selectionEnd ?? 0,
        );
        const bottomPosition = Math.max(
          activeElement.selectionStart ?? 0,
          activeElement.selectionEnd ?? 0,
        );
        const topCaret = getCaretCoordinates(activeElement, topPosition);
        const bottomCaret = getCaretCoordinates(activeElement, bottomPosition);

        const width = Math.abs(bottomCaret.left - topCaret.left);
        const height = Math.abs(
          bottomCaret.top - topCaret.top + bottomCaret.height,
        );

        const x = elementRect.x + topCaret.left - activeElement.scrollLeft;
        const y = elementRect.y + topCaret.top - activeElement.scrollTop;

        return {
          height,
          width,
          x,
          y,
          left: x,
          top: y,
          right: elementRect.x + width - activeElement.scrollLeft,
          bottom: elementRect.y + height - activeElement.scrollTop,
        };
      },
    } satisfies VirtualElement;
  }

  // Allows us to measure where the selection is on the page relative to the viewport
  const range = selection.getRangeAt(0);

  // https://floating-ui.com/docs/virtual-elements#getclientrects
  return {
    getBoundingClientRect: () => range.getBoundingClientRect(),
    getClientRects: () => range.getClientRects(),
  };
}

async function updatePosition(): Promise<void> {
  const selection = window.getSelection();

  if (!selectionTooltip || !selection) {
    // Guard against race condition
    return;
  }

  // https://floating-ui.com/docs/getting-started
  const referenceElement = getPositionReference(selection);
  const supportsInline = "getClientRects" in referenceElement;

  // Keep anchored on scroll/resize: https://floating-ui.com/docs/computeposition#anchoring
  const cleanupAutoPosition = autoUpdate(
    referenceElement,
    selectionTooltip,
    async () => {
      if (!selectionTooltip) {
        // Handle race in async handler
        return;
      }

      const { x, y } = await computePosition(
        referenceElement,
        selectionTooltip,
        {
          placement: "top",
          strategy: "fixed",
          // `inline` prevents from appearing detached if multiple lines selected: https://floating-ui.com/docs/inline

          middleware: [
            ...(supportsInline ? [inline()] : []),
            offset(10),
            // Using flip/shift to ensure the tooltip is visible in editors like TinyMCE where the editor is in an
            // iframe. https://floating-ui.com/docs/middleware. We probably don't want the tooltip to shift/move
            // on scroll, though. However, it's a bit tricky because we're using `position: fixed`. See createTooltip
            // for more context.
            flip(),
            shift(),
          ],
        },
      );
      Object.assign(selectionTooltip.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    },
  );

  cleanupController.signal.addEventListener(
    "abort",
    () => {
      cleanupAutoPosition();
    },
    { once: true },
  );
}

/**
 * Return true if selection is valid for showing a tooltip.
 * @param selection current selection from the Selection API
 */
function isSelectionValid(selection: Nullishable<Selection>): boolean {
  if (!selection) {
    return false;
  }

  const selectionText = selection.toString();

  const anchorNodeParent = selection.anchorNode?.parentElement;
  const focusNodeParent = selection.focusNode?.parentElement;

  if (!anchorNodeParent || !focusNodeParent) {
    return false;
  }

  return selectionText.length >= MIN_SELECTION_LENGTH_CHARS;
}

/**
 * Initialize the selection tooltip once.
 */
export const initSelectionTooltip = once(() => {
  expectContext("contentScript");

  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  // Firefox has support watching carat position: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/selectionchange_event
  // but it's not supported in Chrome

  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  document.addEventListener(
    "selectionchange",
    async () => {
      const selection = window.getSelection();
      if (isSelectionValid(selection)) {
        await showTooltip();
      } else {
        hideTooltip();
      }
    },
    { passive: true },
  );

  // For now just hide the tooltip on document scroll to avoid gotchas with floating UI's `position: fixed` strategy.
  // See updatePosition for more context. Without this, the tooltip moves with the scroll to keep its position
  // in the viewport fixed.
  document.addEventListener(
    "scroll",
    () => {
      hideTooltip();
    },
    { passive: true },
  );

  // Try to avoid sticky tool-tip on SPA navigation
  document.addEventListener(
    "navigate",
    () => {
      destroyTooltip();
    },
    { passive: true },
  );

  tooltipActionRegistry.onChange.add(async () => {
    const isShowing = selectionTooltip?.checkVisibility();
    destroyTooltip();

    // Allow live updates from the Page Editor
    if (isShowing) {
      await showTooltip();
    }
  });

  onContextInvalidated.addListener(() => {
    destroyTooltip();
  });
});

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
import { debounce, once } from "lodash";
import type { Nullishable } from "@/utils/nullishUtils";
import { render, unmountComponentAtNode } from "react-dom";
import React from "react";
import { tooltipFactory } from "@/contentScript/tooltipDom";
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
import { isNativeField } from "@/types/inputTypes";
import { onAbort, ReusableAbortController } from "abort-utils";
import { prefersReducedMotion } from "@/utils/a11yUtils";
import { getSelectionRange } from "@/utils/domUtils";

import { snapWithin } from "@/utils/mathUtils";

const MIN_SELECTION_LENGTH_CHARS = 3;

export const tooltipActionRegistry = new ActionRegistry();

let selectionTooltip: Nullishable<HTMLElement>;

/**
 * AbortController fired when the popover is hidden/destroyed.
 */
const hideController = new ReusableAbortController();

async function showTooltip(): Promise<void> {
  if (tooltipActionRegistry.actions.size === 0) {
    // No registered actions to show
    return;
  }

  selectionTooltip ??= createTooltip();

  // Check visibility to avoid re-animating the tooltip fade in as selection changes
  const isShowing = selectionTooltip.checkVisibility();
  if (!isShowing) {
    selectionTooltip.setAttribute("aria-hidden", "false");
    selectionTooltip.style.setProperty("display", "block");
    if (!prefersReducedMotion()) {
      selectionTooltip.animate(
        [
          { opacity: 0, margin: "4px 0" },
          { opacity: 1, margin: "0" },
        ],
        {
          easing: "ease-in-out",
          duration: 150,
          fill: "forwards",
        },
      );
    }
  }

  // For now hide the tooltip on document/element scroll to avoid gotchas with floating UI's `position: fixed` strategy.
  // See updatePosition for more context. Without this, the tooltip moves with the scroll to keep its position in the
  // viewport fixed.

  for (const elementEventType of [
    "scroll",
    // Pressing "Backspace" or "Delete" should hide the tooltip. Those don't register as selection changes
    "keydown",
  ]) {
    document.activeElement?.addEventListener(elementEventType, hideTooltip, {
      passive: true,
      once: true,
      signal: hideController.signal,
    });
  }

  for (const documentEventType of [
    "scroll",
    "selectstart",
    // Avoid sticky tool-tip on SPA navigation
    "navigate",
  ]) {
    document.addEventListener(documentEventType, hideTooltip, {
      passive: true,
      once: true,
      signal: hideController.signal,
    });
  }

  return updatePosition();
}

/**
 * Hide the tooltip. Safe to call multiple times, even if the tooltip is already hidden.
 */
function hideTooltip(): void {
  selectionTooltip?.setAttribute("aria-hidden", "true");
  selectionTooltip?.style.setProperty("display", "none");
  hideController.abortAndReset();
}

/**
 * Completely remove the tooltip from the DOM.
 */
function destroyTooltip(): void {
  if (selectionTooltip) {
    // Cleanly unmount React component to ensure any listeners are cleaned up.
    // https://react.dev/reference/react-dom/unmountComponentAtNode
    unmountComponentAtNode(selectionTooltip);

    selectionTooltip.remove();
    selectionTooltip = null;
    hideController.abortAndReset();
  }
}

function createTooltip(): HTMLElement {
  if (selectionTooltip) {
    throw new Error("Tooltip already exists");
  }

  selectionTooltip = tooltipFactory();
  selectionTooltip.dataset.testid = "pixiebrix-selection-tooltip";

  render(
    <SelectionToolbar registry={tooltipActionRegistry} onHide={hideTooltip} />,
    selectionTooltip,
  );

  return selectionTooltip;
}

/**
 * Get the reference element for the tooltip position.
 * @param range - The current selection range. Allows us to measure where the selection is on the page relative to the viewport
 */
function getPositionReference(range: Range): VirtualElement | Element {
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

        return snapWithin(
          {
            x,
            y,
            width,
            height,
          },
          elementRect,
        );
      },
    } satisfies VirtualElement;
  }

  // https://floating-ui.com/docs/virtual-elements#getclientrects
  return {
    getBoundingClientRect: () => range.getBoundingClientRect(),
    getClientRects: () => range.getClientRects(),
  };
}

async function updatePosition(): Promise<void> {
  const selectionRange = getSelectionRange();

  if (!selectionTooltip || !selectionRange) {
    hideTooltip();
    // Guard against race condition
    return;
  }

  // https://floating-ui.com/docs/getting-started
  const referenceElement = getPositionReference(selectionRange);
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
          placement: "bottom",
          strategy: "fixed",
          // `inline` prevents from appearing detached if multiple lines selected: https://floating-ui.com/docs/inline
          middleware: [
            ...(supportsInline ? [inline()] : []),
            offset(10),
            // Using flip/shift to ensure the tooltip is visible in editors like TinyMCE where the editor is in an
            // iframe. https://floating-ui.com/docs/middleware. We probably don't want the tooltip to shift/move
            // on scroll, though. However, it's a bit tricky because we're using `position: fixed`. See createTooltip
            // for more context. If we do implement recalculating position on scroll, we might be able to use the hide
            // middleware to hide the tooltip.
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

  onAbort(hideController.signal, () => {
    cleanupAutoPosition();
  });
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
    // Debounce to:
    // - avoid slowing drag of selection
    // - simulate "selectionend" event (which doesn't exist)
    debounce(
      async () => {
        const selection = window.getSelection();
        if (isSelectionValid(selection)) {
          await showTooltip();
        }

        // The tooltip is hidden on "selectionstart" via the showTooltip function, so don't need to hide it in response
        // to the selection change event.
        //
        // "selectionchange" can be fired both in response to the user changing the selection, and the host page
        // changing the selection, e.g., Gmail's composer deselects the user's selection on mousedown.
        //
        // Unfortunately Event.isTrusted is not working to distinguish the user selection vs. Gmail composer mousedown
        // handler: https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted
        //
        // See discussion here: https://github.com/pixiebrix/pixiebrix-extension/issues/7729#issuecomment-1975683222
      },
      60,
      {
        trailing: true,
      },
    ),
    { passive: true, signal: onContextInvalidated.signal },
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

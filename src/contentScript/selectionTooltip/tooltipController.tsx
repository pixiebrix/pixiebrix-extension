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

import ActionRegistry from "@/contentScript/selectionTooltip/actionRegistry";
import { once, truncate } from "lodash";
import type { Nullishable } from "@/utils/nullishUtils";
import { render } from "react-dom";
import React from "react";
import { ensureTooltipsContainer } from "@/contentScript/tooltipDom";
import Icon from "@/icons/Icon";
import { splitStartingEmoji } from "@/utils/stringUtils";
import {
  computePosition,
  autoUpdate,
  inline,
  type VirtualElement,
  offset,
} from "@floating-ui/dom";
import { getCaretCoordinates } from "@/utils/textAreaUtils";

const MIN_SELECTION_LENGTH_CHARS = 3;
const ICON_SIZE_PX = 16;

export const tooltipActionRegistry = new ActionRegistry();

let selectionTooltip: Nullishable<HTMLElement>;

let cleanupAutoPosition: () => void;

function showTooltip(): void {
  if (tooltipActionRegistry.actions.size === 0) {
    // No registered actions to show
    return;
  }

  selectionTooltip ??= createTooltip();
  selectionTooltip.setAttribute("aria-hidden", "false");
  selectionTooltip.style.setProperty("display", "block");

  void updatePosition();
}

function hideTooltip(): void {
  selectionTooltip?.setAttribute("aria-hidden", "true");
  selectionTooltip?.style.setProperty("display", "none");
  cleanupAutoPosition?.();
}

function selectButtonTitle(
  title: string,
  {
    selectionPreviewLength = 10,
  }: {
    selectionPreviewLength?: number;
  } = {},
): string {
  const text = splitStartingEmoji(title).rest;
  // Chrome uses %s as selection placeholder, which is confusing to users. We might instead show a preview of
  // the selected text here.
  const selectionText = truncate(window.getSelection()?.toString() ?? "", {
    length: selectionPreviewLength,
    omission: "…",
  });
  return text.replace("%s", selectionText);
}

function createTooltip(): HTMLElement {
  const container = ensureTooltipsContainer();

  const popover = document.createElement("div");
  // Using popover attribute should keep it on top of the page
  // https://developer.chrome.com/blog/introducing-popover-api
  // https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
  popover.setAttribute("popover", "");
  popover.id = "pixiebrix-selection-tooltip";

  // Must be set before positioning: https://floating-ui.com/docs/computeposition#initial-layout
  popover.style.setProperty("position", "fixed");
  popover.style.setProperty("width", "max-content");
  popover.style.setProperty("top", "0");
  popover.style.setProperty("left", "0");
  // Override Chrome's based styles for [popover] attribute
  popover.style.setProperty("margin", "0");
  popover.style.setProperty("padding", "0");

  const shadowRoot = popover.attachShadow({ mode: "closed" });

  // TODO: fix CSS for icon vs. emoji and dark mode
  // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/menu_role
  render(
    <div
      role="menu"
      aria-orientation="horizontal"
      aria-label="Text selection menu"
    >
      {[...tooltipActionRegistry.actions.entries()].map(([id, action]) => (
        <button
          role="menuitem"
          key={id}
          style={{
            borderRadius: 0,
            cursor: "pointer",
            // Keep emoji and icon height consistent
            fontSize: `${ICON_SIZE_PX}px`,
          }}
          title={selectButtonTitle(action.title)}
          onClick={() => {
            const selection = window.getSelection();
            if (selection) {
              action.handler(selection.toString());
              hideTooltip();
            }
          }}
        >
          {action.emoji ?? <Icon {...action.icon} size={ICON_SIZE_PX} />}
        </button>
      ))}
    </div>,
    shadowRoot,
  );

  container.append(popover);

  selectionTooltip = popover;
  return selectionTooltip;
}

function destroyTooltip(): void {
  selectionTooltip?.remove();
  selectionTooltip = null;
}

function getPositionReference(selection: Selection): VirtualElement | Element {
  // Browsers don't report an accurate selection within inputs/textarea
  const tagName = document.activeElement?.tagName;
  if (tagName === "TEXTAREA" || tagName === "INPUT") {
    const activeElement = document.activeElement as
      | HTMLTextAreaElement
      | HTMLInputElement;

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

        return {
          height,
          width,
          x: elementRect.x + topCaret.left,
          y: elementRect.y + topCaret.top,
          left: elementRect.x + topCaret.left,
          top: elementRect.y + topCaret.top,
          right: elementRect.x + width,
          bottom: elementRect.y + height,
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
  cleanupAutoPosition = autoUpdate(
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
          // Prevent from appearing detached if multiple lines selected: https://floating-ui.com/docs/inline
          middleware: [...(supportsInline ? [inline()] : []), offset(10)],
        },
      );
      Object.assign(selectionTooltip.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    },
  );
}

/**
 * Return true if selection is valid for showing a tooltip.
 * @param selection
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
export const initSelectionToolip = once(() => {
  console.debug("Initializing text selection toolip");

  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  // Firefox has support watching carat position: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/selectionchange_event
  // but it's not supported in Chrome

  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (isSelectionValid(selection)) {
      showTooltip();
    } else {
      hideTooltip();
    }
  });

  // Try to avoid sticky tool-tip on SPA navigation
  document.addEventListener("navigate", () => {
    destroyTooltip();
  });

  tooltipActionRegistry.onChange.add(() => {
    const isShowing = selectionTooltip?.checkVisibility();
    destroyTooltip();

    // Allow live updates from the Page Editor
    if (isShowing) {
      showTooltip();
    }
  });
});

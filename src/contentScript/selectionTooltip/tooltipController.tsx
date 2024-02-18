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

// Inspiration:
// - https://github.com/AdamJaggard/text-tip
// Libraries/APIs:
// - Popover API: https://developer.chrome.com/blog/introducing-popover-api

import ActionRegistry from "@/contentScript/selectionTooltip/actionRegistry";
import { once } from "lodash";
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

export const tooltipActionRegistry = new ActionRegistry();
let selectionTooltip: Nullishable<HTMLElement>;

let cleanup: () => void;

export function showTooltip(): void {
  if (!selectionTooltip) {
    createTooltip();
  }

  selectionTooltip.setAttribute("aria-hidden", "false");
  selectionTooltip.style.setProperty("display", "block");

  void updatePosition();
}

export function hideTooltip(): void {
  selectionTooltip?.setAttribute("aria-hidden", "true");
  selectionTooltip?.style.setProperty("display", "none");
  cleanup?.();
}

function selectButtonTitle(title: string): string {
  const text = splitStartingEmoji(title).rest;
  return text.replace("%s", "[selection]");
}

export function createTooltip(): HTMLElement {
  const container = ensureTooltipsContainer();

  const popover = document.createElement("div");
  popover.setAttribute("popover", "");
  popover.id = "pixiebrix-selection-tooltip";

  // Must be set before positioning: https://floating-ui.com/docs/computeposition#initial-layout
  popover.style.setProperty("position", "fixed");
  popover.style.setProperty("width", "max-content");
  popover.style.setProperty("top", "0");
  popover.style.setProperty("left", "0");
  // Chrome base stylesheet has margin: "auto" for the popover attribute
  popover.style.setProperty("margin", "0");

  const shadowRoot = popover.attachShadow({ mode: "closed" });

  render(
    <div>
      {[...tooltipActionRegistry.actions.entries()].map(([id, action]) => (
        <button
          key={id}
          title={selectButtonTitle(action.title)}
          onClick={() => {
            action.handler(window.getSelection().toString());
            hideTooltip();
          }}
        >
          {
            // TODO: need to include stylesheet for icon?
            action.icon ? <Icon {...action.icon} /> : action.emoji
          }
        </button>
      ))}
    </div>,
    shadowRoot,
  );

  container.append(popover);

  selectionTooltip = popover;
  return selectionTooltip;
}

function getPositionReference(): VirtualElement | Element {
  // Browsers don't report an accurate selection within inputs/textarea
  if (["TEXTAREA", "INPUT"].includes(document.activeElement?.tagName)) {
    const activeElement = document.activeElement as
      | HTMLTextAreaElement
      | HTMLInputElement;

    return {
      getBoundingClientRect() {
        const position =
          activeElement.selectionDirection === "forward"
            ? activeElement.selectionStart
            : activeElement.selectionEnd;
        const caret = getCaretCoordinates(activeElement, position);

        const width = 0;
        const height = 0;

        console.debug("getBoundingClientRect", caret);

        const elementRect = activeElement.getBoundingClientRect();
        return {
          height,
          width,
          x: elementRect.x + caret.left,
          y: elementRect.y + caret.top,
          left: elementRect.x + caret.left,
          top: elementRect.y + caret.top,
          right: elementRect.x + width,
          bottom: elementRect.y + height,
        };
      },
    } satisfies VirtualElement;
  }

  // Allows us to measure where the selection is on the page relative to the viewport
  const range = window.getSelection().getRangeAt(0);

  // https://floating-ui.com/docs/virtual-elements#getclientrects
  return {
    getBoundingClientRect: () => range.getBoundingClientRect(),
    getClientRects: () => range.getClientRects(),
  };
}

async function updatePosition(): Promise<void> {
  // Positioning libraries: https://floating-ui.com/docs/getting-started

  const referenceElement = getPositionReference();

  // Keep anchored on scroll/resize: https://floating-ui.com/docs/computeposition#anchoring
  cleanup = autoUpdate(referenceElement, selectionTooltip, async () => {
    const { x, y } = await computePosition(referenceElement, selectionTooltip, {
      placement: "top",
      strategy: "fixed",
      // Prevent from appearing detached if multiple lines selected: https://floating-ui.com/docs/inline
      middleware: [inline(), offset(10)],
    });
    Object.assign(selectionTooltip.style, {
      left: `${x}px`,
      top: `${y}px`,
    });
  });
}

/**
 * Return true if selection is valid for showing a tooltip.
 * @param selection
 */
function isSelectionValid(selection: Selection): boolean {
  const selectionText = selection.toString();

  const anchorNodeParent = selection.anchorNode?.parentElement;
  const focusNodeParent = selection.focusNode?.parentElement;

  console.debug(
    "isSelectionValid",
    selection,
    anchorNodeParent,
    focusNodeParent,
    selectionText,
  );

  if (!anchorNodeParent || !focusNodeParent) {
    return false;
  }

  return selectionText.length > MIN_SELECTION_LENGTH_CHARS;
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
    hideTooltip();
  });
});

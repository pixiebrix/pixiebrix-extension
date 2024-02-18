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

const ITEM_WIDTH_PX = 20;

const MIN_SELECTION_LENGTH_CHARS = 3;

export const tooltipActionRegistry = new ActionRegistry();
let selectionTooltip: Nullishable<HTMLElement>;

export function showTooltip(): void {
  if (!selectionTooltip) {
    createTooltip();
  }

  updatePosition();

  selectionTooltip.setAttribute("aria-hidden", "false");
  selectionTooltip.style.setProperty("display", "block");
}

export function hideTooltip(): void {
  selectionTooltip?.setAttribute("aria-hidden", "true");
  selectionTooltip?.style.setProperty("display", "none");
}

export function createTooltip(): HTMLElement {
  const container = ensureTooltipsContainer();

  const popover = document.createElement("div");
  popover.setAttribute("popover", "");
  popover.id = "pixiebrix-selection-tooltip";

  const shadowRoot = popover.attachShadow({ mode: "closed" });

  render(
    <div>
      {[...tooltipActionRegistry.actions.entries()].map(([id, action]) => (
        <button
          key={id}
          onClick={() => {
            action.handler(window.getSelection().toString());
          }}
        >
          {action.emoji}
        </button>
      ))}
    </div>,
    shadowRoot,
  );

  container.append(popover);

  selectionTooltip = popover;
  return selectionTooltip;
}

export function updatePosition(): void {
  // Positioning libraries: https://floating-ui.com/docs/getting-started

  const selection = window.getSelection();

  // Allows us to measure where the selection is on the page relative to the viewport
  const range = selection.getRangeAt(0);

  const { top, left, width } = range.getBoundingClientRect();

  // Middle of selection width
  let newTipLeft = left + width / 2 - window.scrollX;

  // Right above selection
  const newTipBottom = window.innerHeight - top - window.scrollY;

  const tooltipWidth = tooltipActionRegistry.actions.size * ITEM_WIDTH_PX;

  // Stop tooltip bleeding off of left or right edge of screen
  // Use a buffer of 20px so we don't bump right against the edge
  // The tooltip transforms itself left minus 50% of it's width in css
  // so this will need to be taken into account
  const buffer = 20;
  const tipHalfWidth = tooltipWidth / 2;

  // "real" means after taking the css transform into account
  const realTipLeft = newTipLeft - tipHalfWidth;
  const realTipRight = realTipLeft + tooltipWidth;

  if (realTipLeft < buffer) {
    // Correct for left edge overlap
    newTipLeft = buffer + tipHalfWidth;
  } else if (realTipRight > window.innerWidth - buffer) {
    // Correct for right edge overlap
    newTipLeft = window.innerWidth - buffer - tipHalfWidth;
  }

  selectionTooltip.style.left = newTipLeft + "px";
  selectionTooltip.style.bottom = newTipBottom + "px";
}

/**
 * Return true if selection is valid for showing a tooltip.
 * @param selection
 */
function isSelectionValid(selection: Selection): boolean {
  const selectionText = selection.toString();

  const anchorNodeParent = selection.anchorNode.parentElement;
  const focusNodeParent = selection.focusNode.parentElement;

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
});

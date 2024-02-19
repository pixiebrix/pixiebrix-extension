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

import { once } from "lodash";
import type { Nullishable } from "@/utils/nullishUtils";
import { ensureTooltipsContainer } from "@/contentScript/tooltipDom";
import { render } from "react-dom";
import {
  autoUpdate,
  computePosition,
  inline,
  offset,
  type VirtualElement,
} from "@floating-ui/dom";
import { getCaretCoordinates } from "@/utils/textAreaUtils";
import React from "react";
import CommandRegistry from "@/contentScript/commandPopover/CommandRegistry";
import CommandPopover from "@/contentScript/commandPopover/CommandPopover";
import { onContextInvalidated } from "webext-events";
import { tooltipActionRegistry } from "@/contentScript/selectionTooltip/tooltipController";
import {
  type HTMLTextEditorElement,
  isTextEditorElement,
} from "@/types/inputTypes";

export const commandRegistry = new CommandRegistry();

let commandPopover: Nullishable<HTMLElement>;

let cleanupAutoPosition: () => void;

let targetElement: HTMLTextEditorElement | undefined;

function showPopover(): void {
  if (targetElement == null) {
    return;
  }

  commandPopover ??= createPopover(targetElement);
  commandPopover.setAttribute("aria-hidden", "false");
  commandPopover.style.setProperty("display", "block");

  void updatePosition();
}

function hidePopover(): void {
  commandPopover?.setAttribute("aria-hidden", "true");
  commandPopover?.style.setProperty("display", "none");
  cleanupAutoPosition?.();
}

function createPopover(element: HTMLTextEditorElement): HTMLElement {
  const container = ensureTooltipsContainer();

  const popover = document.createElement("div");
  // Using popover attribute should keep it on top of the page
  // https://developer.chrome.com/blog/introducing-popover-api
  // https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
  popover.setAttribute("popover", "");
  popover.dataset.testid = "pixiebrix-command-tooltip";

  // Must be set before positioning: https://floating-ui.com/docs/computeposition#initial-layout
  popover.style.setProperty("position", "fixed");
  popover.style.setProperty("width", "max-content");
  popover.style.setProperty("top", "0");
  popover.style.setProperty("left", "0");
  // Override Chrome's based styles for [popover] attribute
  popover.style.setProperty("margin", "0");
  popover.style.setProperty("padding", "0");

  render(
    <CommandPopover
      registry={commandRegistry}
      element={element}
      onHide={hidePopover}
    />,
    popover,
  );

  container.append(popover);

  commandPopover = popover;
  return commandPopover;
}

function destroyPopover(): void {
  commandPopover?.remove();
  commandPopover = null;
}

function getPositionReference(
  selection: Selection,
): Nullishable<VirtualElement | Element> {
  // Browsers don't report an accurate selection within inputs/textarea
  const tagName = document.activeElement?.tagName;
  if (tagName === "TEXTAREA" || tagName === "INPUT") {
    const activeElement = document.activeElement as
      | HTMLTextAreaElement
      | HTMLInputElement;

    const elementRect = activeElement.getBoundingClientRect();

    if (
      !activeElement.selectionStart ||
      activeElement.selectionStart !== activeElement.selectionEnd
    ) {
      // Detecting typing "/" vs. a selection
      return;
    }

    return {
      getBoundingClientRect() {
        const { selectionStart } = activeElement;

        const position = selectionStart
          ? getCaretCoordinates(activeElement, selectionStart)
          : {
              top: 0,
              left: 0,
            };

        return {
          height: 0,
          width: 0,
          x: elementRect.x + position.left,
          y: elementRect.y + position.top,
          left: elementRect.x + position.left,
          top: elementRect.y + position.top,
          right: elementRect.x,
          bottom: elementRect.y,
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

  if (!commandPopover || !selection) {
    // Guard against race condition
    return;
  }

  // https://floating-ui.com/docs/getting-started
  const referenceElement = getPositionReference(selection);

  if (!referenceElement) {
    return;
  }

  const supportsInline = "getClientRects" in referenceElement;

  // Keep anchored on scroll/resize: https://floating-ui.com/docs/computeposition#anchoring
  cleanupAutoPosition = autoUpdate(
    referenceElement,
    commandPopover,
    async () => {
      if (!commandPopover) {
        // Handle race in async handler
        return;
      }

      const { x, y } = await computePosition(referenceElement, commandPopover, {
        placement: "right-end",
        strategy: "fixed",
        // Prevent from appearing detached if multiple lines selected: https://floating-ui.com/docs/inline
        middleware: [
          ...(supportsInline ? [inline()] : []),
          offset({
            mainAxis: 15,
            crossAxis: 10,
          }),
        ],
      });
      Object.assign(commandPopover.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    },
  );
}

export const initCommandController = once(() => {
  document.addEventListener(
    "keypress",
    (event) => {
      if (event.key === "/" && isTextEditorElement(event.target)) {
        targetElement = event.target;
        showPopover();
      }
    },
    { capture: true, passive: true },
  );

  // Hide on outside click
  document.addEventListener(
    "click",
    (event) => {
      if (
        event.target !== commandPopover &&
        !commandPopover?.contains(event.target as Node)
      ) {
        hidePopover();
      }
    },
    { capture: true, passive: true },
  );

  // Try to avoid sticky tool-tip on SPA navigation
  document.addEventListener(
    "navigate",
    () => {
      destroyPopover();
    },
    { passive: true },
  );

  tooltipActionRegistry.onChange.add(() => {
    const isShowing = commandPopover?.checkVisibility();
    destroyPopover();

    // Allow live updates from the Page Editor
    if (isShowing) {
      showPopover();
    }
  });

  onContextInvalidated.addListener(() => {
    destroyPopover();
  });
});

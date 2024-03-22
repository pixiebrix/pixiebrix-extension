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
import { tooltipFactory } from "@/contentScript/tooltipDom";
import { render, unmountComponentAtNode } from "react-dom";
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
import React from "react";
import SnippetRegistry from "@/contentScript/shortcutSnippetMenu/ShortcutSnippetRegistry";
import ShortcutSnippetMenu from "@/contentScript/shortcutSnippetMenu/ShortcutSnippetMenu";
import { onContextInvalidated } from "webext-events";
import {
  isContentEditableElement,
  isSelectableTextControlElement,
  isSelectableTextEditorElement,
  isTextControlElement,
  type SelectableTextEditorElement,
  type TextEditorElement,
} from "@/types/inputTypes";
import { expectContext } from "@/utils/expectContext";
import { ReusableAbortController } from "abort-utils";
import { getSelectionRange, waitAnimationFrame } from "@/utils/domUtils";
import { prefersReducedMotion } from "@/utils/a11yUtils";

const COMMAND_KEY = "\\";

export const commandRegistry = new SnippetRegistry();

let targetElement: Nullishable<TextEditorElement>;

let commandPopover: Nullishable<HTMLElement>;

const hideController = new ReusableAbortController();

async function showPopover(element: HTMLElement): Promise<void> {
  if (targetElement != null) {
    // Popover already showing, e.g., because the user typed the command key twice
    return;
  }

  // Required to ensure that the position is available for the first keypress in a row in a content editable.
  await waitAnimationFrame();

  targetElement = element;
  commandPopover ??= createPopover(targetElement);

  // Check visibility to avoid re-animating the tooltip fade in as selection changes
  const isShowing = commandPopover.checkVisibility();
  if (!isShowing) {
    commandPopover.setAttribute("aria-hidden", "false");
    if (prefersReducedMotion()) {
      commandPopover.style.setProperty("display", "block");
    } else {
      commandPopover.animate(
        [
          { opacity: 0, margin: "8px 0", display: "block" },
          { opacity: 1, margin: "0", display: "block" },
        ],
        {
          easing: "ease-in-out",
          duration: 300,
          fill: "forwards",
        },
      );
    }
  }

  // For now just destroy the tooltip on document/element scroll to avoid gotchas with floating UI's `position: fixed`
  // strategy. See tooltipController.ts for more details.
  document.activeElement?.addEventListener(
    "scroll",
    () => {
      destroyPopover();
    },
    { passive: true, once: true, signal: hideController.signal },
  );

  document.addEventListener(
    "scroll",
    () => {
      destroyPopover();
    },
    { passive: true, once: true, signal: hideController.signal },
  );

  // Hide if the user selects somewhere
  document.addEventListener(
    "selectionchange",
    () => {
      if (targetElement && isTextSelected(targetElement)) {
        destroyPopover();
      }
    },
    { passive: true, signal: hideController.signal },
  );

  // Hide on outside click
  document.addEventListener(
    "click",
    (event) => {
      if (
        event.target !== commandPopover &&
        !commandPopover?.contains(event.target as Node)
      ) {
        destroyPopover();
      }
    },
    { capture: true, passive: true, signal: hideController.signal },
  );

  // Try to avoid sticky tool-tip on SPA navigation
  document.addEventListener(
    "navigate",
    () => {
      destroyPopover();
    },
    { capture: true, passive: true, signal: hideController.signal },
  );

  return updatePosition();
}

function createPopover(element: TextEditorElement): HTMLElement {
  if (commandPopover) {
    throw new Error("Popover already exists");
  }

  commandPopover = tooltipFactory();
  commandPopover.dataset.testid = "pixiebrix-command-tooltip";

  render(
    <ShortcutSnippetMenu
      registry={commandRegistry}
      element={element}
      onHide={destroyPopover}
      commandKey={COMMAND_KEY}
    />,
    commandPopover,
  );

  return commandPopover;
}

function destroyPopover(): void {
  if (commandPopover) {
    // Cleanly unmount React component before removing from the DOM because useKeyboardQuery attaches document event
    // listeners via useEffect: https://react.dev/reference/react-dom/unmountComponentAtNode
    unmountComponentAtNode(commandPopover);

    commandPopover.remove();
    commandPopover = null;
    targetElement = null;
  }

  hideController.abortAndReset();
}

function getCursorPositionReference(): Nullishable<VirtualElement | Element> {
  // Browsers don't report an accurate selection within inputs/textarea
  if (isSelectableTextControlElement(targetElement)) {
    const textControl = targetElement;
    const elementRect = targetElement.getBoundingClientRect();

    if (targetElement.selectionStart == null) {
      return;
    }

    return {
      getBoundingClientRect() {
        if (targetElement == null) {
          // Shouldn't happen in practice because autoUpdate won't call if the element is no longer on the page
          throw new Error("Target element is null");
        }

        const { selectionStart } = textControl;

        const positionInTarget = selectionStart
          ? getCaretCoordinates(textControl, selectionStart)
          : {
              top: 0,
              left: 0,
              height: Number.parseInt(
                window.getComputedStyle(targetElement).lineHeight,
                10,
              ),
            };

        const x =
          elementRect.x + positionInTarget.left - targetElement.scrollLeft;

        const y =
          elementRect.y + positionInTarget.top - targetElement.scrollTop;

        return {
          height: positionInTarget.height,
          width: 0,
          x,
          y,
          left: x,
          top: y,
          right: x,
          bottom: y + positionInTarget.height,
        };
      },
    } satisfies VirtualElement;
  }

  if (isTextControlElement(targetElement)) {
    // For email/unsupported fields, we might consider guessing the position based on length or just attach
    // directly to the input element
    throw new Error(`Unsupported text control element: ${targetElement.type}`);
  }

  if (!isContentEditableElement(targetElement)) {
    throw new Error("Expected a content editable");
  }

  // Allows us to measure where the selection is on the page relative to the viewport
  const range = getSelectionRange();

  if (range == null) {
    return;
  }

  // https://floating-ui.com/docs/virtual-elements#getclientrects
  return {
    getBoundingClientRect: () => range.getBoundingClientRect(),
    getClientRects: () => range.getClientRects(),
  };
}

async function updatePosition(): Promise<void> {
  if (!commandPopover) {
    // Guard against race condition
    return;
  }

  const referenceElement = getCursorPositionReference();

  if (!referenceElement) {
    return;
  }

  const supportsInline = "getClientRects" in referenceElement;

  // Keep anchored on scroll/resize: https://floating-ui.com/docs/computeposition#anchoring
  const cleanupAutoPosition = autoUpdate(
    referenceElement,
    commandPopover,
    async () => {
      if (!commandPopover) {
        // Handle race in async handler
        return;
      }

      const { x, y } = await computePosition(referenceElement, commandPopover, {
        // `top-start` is a nice placement because we don't have to worry about font-size or line-height. It also
        // reduces the changes of conflicting with native auto-complete/suggestion dropdowns.
        placement: "top-start",
        strategy: "fixed",
        // Prevent from appearing detached if multiple lines selected: https://floating-ui.com/docs/inline
        middleware: [
          ...(supportsInline ? [inline()] : []),
          offset({
            // Give a little space between top of the text and the popover
            mainAxis: 5,
          }),
          // Using flip/shift to ensure the tooltip is visible in editors like TinyMCE where the editor is in an
          // iframe. See tooltipController.ts for more details.
          shift(),
          flip(),
        ],
      });
      Object.assign(commandPopover.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    },
  );

  hideController.signal.addEventListener(
    "abort",
    () => {
      cleanupAutoPosition();
    },
    { once: true, passive: true },
  );
}

/**
 * Return true if target is a valid target element for showing the command popover.
 *
 * Read-only elements are not valid targets.
 *
 * @see SelectableTextEditorElement
 */
function isValidTarget(target: unknown): target is SelectableTextEditorElement {
  if (!isSelectableTextEditorElement(target)) {
    return false;
  }

  if (target.ariaReadOnly === "true" || target.ariaDisabled === "true") {
    return false;
  }

  if (target.contentEditable === "false") {
    return false;
  }

  return !(isSelectableTextControlElement(target) && target.readOnly);
}

function isTextSelected(target: unknown): boolean {
  if (
    isSelectableTextControlElement(target) &&
    target.selectionStart !== target.selectionEnd
  ) {
    return true;
  }

  if (isContentEditableElement(target)) {
    const range = getSelectionRange();
    return range != null && range.toString().length > 0;
  }

  return false;
}

export const initCommandController = once(() => {
  expectContext("contentScript");

  document.addEventListener(
    "keypress",
    async (event) => {
      if (
        event.key === COMMAND_KEY &&
        isValidTarget(event.target) &&
        !isTextSelected(event.target)
      ) {
        await showPopover(event.target);
      }
    },
    { capture: true, passive: true },
  );

  onContextInvalidated.addListener(() => {
    destroyPopover();
  });
});

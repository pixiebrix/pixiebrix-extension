/* eslint-disable unicorn/consistent-function-scoping -- Keep consistency with other inline functions */
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

import Overlay from "../../vendors/Overlay";
import ReactDOM from "react-dom";
import { expandedCssSelector } from "../../utils/inference/selectorInference";
import { compact, difference, uniq } from "lodash";
import type { SelectionHandlerType } from "@/components/selectionToolPopover/SelectionToolPopover";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { FLOATING_ACTION_BUTTON_CONTAINER_ID } from "@/components/floatingActions/floatingActionsConstants";
import { onContextInvalidated } from "webext-events";
import showSelectionToolPopover from "@/components/selectionToolPopover/showSelectionToolPopover";

/**
 * Primary overlay that moved with the user's mouse/selection.
 */
let overlay: Overlay | null = null;
/**
 * Overlay for similar elements. Shown as lighter color to differentiate what the user has explicitly clicked on.
 */
let expandOverlay: Overlay | null = null;
/**
 * Overlay for the root element.
 */
let rootOverlay: Overlay | null = null;
let styleElement: HTMLStyleElement | null = null;
let multiSelectionToolElement: HTMLElement | null = null;
let selectionHandler: SelectionHandlerType | null = null;
let stopInspectingNative: (() => void) | null = null;

function setSelectionHandler(handler: SelectionHandlerType): void {
  selectionHandler = handler;
}

function hideOverlay(): void {
  overlay?.remove();
  overlay = null;
  expandOverlay?.remove();
  expandOverlay = null;
  rootOverlay?.remove();
  rootOverlay = null;
}

export function stopInspectingNativeHandler(): void {
  stopInspectingNative?.();
}

let _cancelSelect: (() => void) | null = null;

interface UserSelection {
  /** Element(s) to limit the selection to. */
  roots?: HTMLElement[];
  /** CSS selector to limit the selection to. */
  filter?: string;
  /** True to enable multi-selection by default. */
  isMulti?: boolean;
}

export async function userSelectElement({
  /**
   * If provided, root element the user can select inside.
   */
  roots = [],
  /**
   * Selector indicating elements that should be highlighted as elements to select from.
   */
  filter,
  /**
   * True to enable multi-selection by default.
   */
  isMulti: initialIsMulti = false,
}: UserSelection = {}): Promise<{
  elements: HTMLElement[];
  isMulti: boolean;
  shouldSelectSimilar: boolean;
}> {
  return new Promise<{
    elements: HTMLElement[];
    isMulti: boolean;
    shouldSelectSimilar: boolean;
  }>((resolve, reject) => {
    const targets = new Set<HTMLElement>();
    let isMulti = initialIsMulti;
    let shouldSelectSimilar = false;

    if (!overlay) {
      overlay = new Overlay();
      // Themes are defined in contentScript.scss
      rootOverlay = new Overlay("blue");
      expandOverlay = new Overlay("light");
    }

    function highlightRoots() {
      // Highlight and scroll to root element so the user knows where they can click
      if (roots.length > 0) {
        roots[0]?.scrollTo({ behavior: "smooth" });
        rootOverlay?.inspect(roots);
      }
    }

    function prehiglightItems() {
      let filteredElements: HTMLElement[];
      if (filter) {
        filteredElements = [...document.querySelectorAll<HTMLElement>(filter)];
        const updateOverlay = () => {
          if (!_cancelSelect) {
            // The operation has completed
            return;
          }

          overlay?.inspect(filteredElements);
          setTimeout(() => requestAnimationFrame(updateOverlay), 30); // Only when the tab is visible
        };

        if (filteredElements.length > 0) {
          updateOverlay();
        }
      }
    }

    function findExpectedTarget(target: EventTarget): HTMLElement | null {
      if (!(target instanceof HTMLElement)) {
        return null;
      }

      if (!filter) {
        return target;
      }

      return target.closest<HTMLElement>(filter);
    }

    function startInspectingNative(): void {
      _cancelSelect = cancel;
      registerListenersOnWindow(window);
      addInspectingModeStyles(window);

      addMultiSelectionTool(window);

      highlightRoots();
      prehiglightItems();
      onContextInvalidated.addListener(cancel);
    }

    function handleDone(target?: HTMLElement): void {
      try {
        const result = uniq(compact([...targets, target]));
        if (
          roots.length > 0 &&
          result.some((result) => !roots.some((root) => root.contains(result)))
        ) {
          reject(
            new BusinessError(
              "One or more selected elements are not contained within a root element",
            ),
          );
        }

        resolve({ elements: result, isMulti, shouldSelectSimilar });
      } finally {
        stopInspectingNative?.();
      }
    }

    function handleMultiSelectionChange(value: boolean) {
      isMulti = value;
      if (!isMulti) {
        shouldSelectSimilar = false;
        overlay?.inspect([]);
        expandOverlay?.inspect([]);
        targets.clear();
        selectionHandler?.(targets.size);
      }
    }

    function handleSimilarSelectionChange(value: boolean) {
      shouldSelectSimilar = value;
      if (shouldSelectSimilar) {
        const commonSelector = expandedCssSelector([...targets]) ?? "";
        const expandTargets = difference($(commonSelector), [...targets]);
        selectionHandler?.(expandTargets.length);
        expandOverlay?.inspect([...expandTargets]);
      } else {
        selectionHandler?.(targets.size);
        expandOverlay?.inspect([]);
      }
    }

    function noopMouseHandler(event: MouseEvent) {
      const target: HTMLElement | null =
        event.target == null ? null : findExpectedTarget(event.target);
      if (!target) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Do not prevent mouse event in order to drag feature working.
      if (multiSelectionToolElement?.contains(target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    function onClick(event: MouseEvent) {
      const target: HTMLElement | null =
        event.target == null ? null : findExpectedTarget(event.target);
      if (event.altKey || !target) {
        return;
      }

      // Do not allow the user to select the multi-element selection popup.
      if (multiSelectionToolElement?.contains(target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey || isMulti) {
        if (targets.has(target)) {
          targets.delete(target);
        } else {
          targets.add(target);
        }

        overlay?.inspect([...targets]);

        if (targets.size > 1 && shouldSelectSimilar) {
          const commonSelector = expandedCssSelector([...targets]) ?? "";
          const expandTargets = difference($(commonSelector), [...targets]);
          selectionHandler?.(expandTargets.length);
          expandOverlay?.inspect([...expandTargets]);
        } else {
          selectionHandler?.(targets.size);
          expandOverlay?.inspect([]);
        }

        return;
      }

      handleDone(target);
    }

    function onPointerDown(event: MouseEvent) {
      if (event.target == null) {
        return;
      }

      const target = findExpectedTarget(event.target);
      if (!target) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Do not allow the user to select the multi-element selection popup.
      if (multiSelectionToolElement?.contains(target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      console.debug("Pointer down:", event.target);
    }

    function onPointerOver(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
      const target: HTMLElement | null =
        event.target == null ? null : findExpectedTarget(event.target);

      if (target) {
        overlay?.inspect([...targets, target]);
      }
    }

    function onPointerLeave() {
      overlay?.inspect([...targets]);
    }

    function escape(event: KeyboardEvent) {
      if (event.type === "keyup" && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }
    }

    function cancel() {
      stopInspectingNative?.();
      reject(new CancelError("Selection cancelled"));
    }

    function registerListenersOnWindow(window: Window) {
      window.addEventListener("click", onClick, true);
      window.addEventListener("mousedown", noopMouseHandler, true);
      window.addEventListener("mouseover", noopMouseHandler, true);
      window.addEventListener("mouseup", noopMouseHandler, true);
      window.addEventListener("pointerdown", onPointerDown, true);

      if (!filter) {
        window.addEventListener("pointerover", onPointerOver, true);
        window.document.addEventListener("pointerleave", onPointerLeave, true);
      }

      window.addEventListener("pointerup", noopMouseHandler, true);
      window.addEventListener("keyup", escape, true);
    }

    function removeListenersOnWindow(window: Window) {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("mousedown", noopMouseHandler, true);
      window.removeEventListener("mouseover", noopMouseHandler, true);
      window.removeEventListener("mouseup", noopMouseHandler, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerover", onPointerOver, true);
      window.document.removeEventListener("pointerleave", onPointerLeave, true);
      window.removeEventListener("pointerup", noopMouseHandler, true);
      window.removeEventListener("keyup", escape, true);
    }

    function addInspectingModeStyles(window: Window) {
      const doc = window.document;
      styleElement = doc.createElement("style");
      styleElement.innerHTML = `
        html:not(:hover):before {
          content: '';
          border: solid 10px rgba(182, 109, 255, 0.3);
          position: fixed;
          z-index: 100000000;
          pointer-events: none;
          inset: 0;
          /* Sine curve to make the pulse smooth */
          animation: 600ms cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite alternate pbGlow;
        }

        @keyframes pbGlow {
          to {
            border-width: 25px;
          }
        }`;
      doc.body.append(styleElement);
    }

    function removeInspectingModeStyles() {
      styleElement?.remove();
      styleElement = null;
    }

    function addMultiSelectionTool(window: Window) {
      const windowDocument = window.document;
      multiSelectionToolElement = windowDocument.createElement("div");
      windowDocument.body.append(multiSelectionToolElement);

      // Hide the FAB so it doesn't conflict with the selection tool. Is a NOP if the FAB is not on the page
      $(`#${FLOATING_ACTION_BUTTON_CONTAINER_ID}`).hide();

      showSelectionToolPopover({
        rootElement: multiSelectionToolElement,
        isMulti,
        onCancel: cancel,
        onDone: handleDone,
        onChangeMultiSelection: handleMultiSelectionChange,
        onChangeSimilarSelection: handleSimilarSelectionChange,
        setSelectionHandler,
      });
    }

    function removeMultiSelectionTool() {
      $(`#${FLOATING_ACTION_BUTTON_CONTAINER_ID}`).show();
      if (multiSelectionToolElement) {
        ReactDOM.unmountComponentAtNode(multiSelectionToolElement);
        multiSelectionToolElement?.remove();
        multiSelectionToolElement = null;
      }
    }

    startInspectingNative();

    stopInspectingNative = () => {
      hideOverlay();
      _cancelSelect = null;
      removeListenersOnWindow(window);
      removeInspectingModeStyles();
      removeMultiSelectionTool();

      stopInspectingNative = null;
    };
  });
}

export async function cancelSelect() {
  if (_cancelSelect) {
    _cancelSelect();
  }
}

/* eslint-disable unicorn/consistent-function-scoping -- Keep consistency with other inline functions */
/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import Overlay from "@/vendors/Overlay";
import {
  expandedCssSelector,
  findContainer,
  inferSelectorsIncludingStableAncestors,
  safeCssSelector,
} from "@/utils/inference/selectorInference";
import { type Framework } from "@/pageScript/messenger/constants";
import { uniq, compact, difference } from "lodash";
import * as pageScript from "@/pageScript/messenger/api";
import { requireSingleElement } from "@/utils/requireSingleElement";
import { type SelectMode } from "@/contentScript/pageEditor/types";
import {
  type SelectionHandlerType,
  showSelectionToolPopover,
} from "@/components/selectionToolPopover/SelectionToolPopover";
import { CancelError } from "@/errors/businessErrors";

let overlay: Overlay | null = null;
let expandOverlay: Overlay | null = null;
let styleElement: HTMLStyleElement = null;
let multiSelectionToolElement: HTMLElement = null;
let selectionHandler: SelectionHandlerType;
let stopInspectingNative: () => void;

function setSelectionHandler(handler: SelectionHandlerType) {
  selectionHandler = handler;
}

export function hideOverlay(): void {
  overlay?.remove();
  overlay = null;
  expandOverlay?.remove();
  expandOverlay = null;
}

export function stopInspectingNativeHandler(): void {
  stopInspectingNative?.();
}

let _cancelSelect: () => void = null;
interface UserSelection {
  root?: HTMLElement;
  /** CSS selector to limit the selection to */
  filter?: string;
  enableSelectionTools?: boolean;
}

export async function userSelectElement({
  root,
  filter,
  enableSelectionTools = false,
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
    let isMulti = false;
    let shouldSelectSimilar = false;
    if (!overlay) {
      overlay = new Overlay();
      expandOverlay = new Overlay("light");
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

          overlay.inspect(filteredElements);
          setTimeout(() => requestAnimationFrame(updateOverlay), 30); // Only when the tab is visible
        };

        if (filteredElements.length > 0) {
          updateOverlay();
        }
      }
    }

    function findExpectedTarget(target: EventTarget): HTMLElement | void {
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (!filter) {
        return target;
      }

      return target.closest<HTMLElement>(filter);
    }

    function startInspectingNative() {
      _cancelSelect = cancel;
      registerListenersOnWindow(window);
      addInspectingModeStyles(window);
      if (enableSelectionTools) {
        addMultiSelectionTool(window);
      }

      prehiglightItems();
    }

    function handleDone(target?: HTMLElement) {
      try {
        const result = uniq(compact([...targets, target]));
        if (root && result.some((x) => !root.contains(x))) {
          throw new Error(
            "One or more selected elements are not contained within the root container"
          );
        }

        resolve({ elements: result, isMulti, shouldSelectSimilar });
      } finally {
        stopInspectingNative();
      }
    }

    function handleMultiSelectionChange(value: boolean) {
      isMulti = value;
      if (!isMulti) {
        shouldSelectSimilar = false;
        overlay.inspect([]);
        expandOverlay.inspect([]);
        targets.clear();
        selectionHandler(targets.size);
      }
    }

    function handleSimilarSelectionChange(value: boolean) {
      shouldSelectSimilar = value;
      if (shouldSelectSimilar) {
        const commonSelector = expandedCssSelector([...targets]);
        const expandTargets = difference($(commonSelector), [...targets]);
        selectionHandler(expandTargets.length);
        expandOverlay.inspect([...expandTargets]);
      } else {
        selectionHandler(targets.size);
        expandOverlay.inspect([]);
      }
    }

    function noopMouseHandler(event: MouseEvent) {
      const target = findExpectedTarget(event.target);
      if (!target) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Do not prevent mouse event in order to drag feature working.
      if (target.contains(multiSelectionToolElement)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    function onClick(event: MouseEvent) {
      const target = findExpectedTarget(event.target);
      if (event.altKey || !target) {
        return;
      }

      // Do not allow the user to select the multi-element selection popup.
      if (target.contains(multiSelectionToolElement)) {
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

        overlay.inspect([...targets]);

        if (targets.size > 1 && shouldSelectSimilar) {
          const commonSelector = expandedCssSelector([...targets]);
          const expandTargets = difference($(commonSelector), [...targets]);
          selectionHandler(expandTargets.length);
          expandOverlay.inspect([...expandTargets]);
        } else {
          selectionHandler(targets.size);
          expandOverlay.inspect([]);
        }

        return;
      }

      handleDone(target);
    }

    function onPointerDown(event: MouseEvent) {
      const target = findExpectedTarget(event.target);
      if (!target) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Do not allow the user to select the multi-element selection popup.
      if (target.contains(multiSelectionToolElement)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      console.debug("Pointer down:", event.target);
    }

    function onPointerOver(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
      const target = findExpectedTarget(event.target);

      if (target) {
        overlay.inspect([...targets, target]);
      }
    }

    function onPointerLeave() {
      overlay.inspect([...targets]);
    }

    function escape(event: KeyboardEvent) {
      if (event.type === "keyup" && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }
    }

    function cancel() {
      stopInspectingNative();
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
      if (!styleElement) {
        return;
      }

      if (styleElement.parentNode) {
        styleElement.remove();
      }

      styleElement = null;
    }

    function addMultiSelectionTool(window: Window) {
      const doc = window.document;
      multiSelectionToolElement = doc.createElement("div");
      doc.body.append(multiSelectionToolElement);

      showSelectionToolPopover({
        rootElement: multiSelectionToolElement,
        handleCancel: cancel,
        handleDone() {
          handleDone();
        },
        handleMultiChange: handleMultiSelectionChange,
        handleSimilarChange: handleSimilarSelectionChange,
        setSelectionHandler,
      });
    }

    function removeMultiSelectionTool() {
      if (!multiSelectionToolElement) {
        return;
      }

      if (multiSelectionToolElement.parentNode) {
        multiSelectionToolElement.remove();
      }

      multiSelectionToolElement = null;
    }

    startInspectingNative();

    stopInspectingNative = () => {
      hideOverlay();
      _cancelSelect = null;
      removeListenersOnWindow(window);
      removeInspectingModeStyles();
      if (enableSelectionTools) {
        removeMultiSelectionTool();
      }

      stopInspectingNative = null;
    };
  });
}

export async function cancelSelect() {
  if (_cancelSelect) {
    _cancelSelect();
  }
}

export async function selectElement({
  traverseUp = 0,
  mode = "element",
  framework,
  root,
  excludeRandomClasses,
  enableSelectionTools = false,
}: {
  traverseUp: number;
  framework?: Framework;
  mode: SelectMode;
  isMulti?: boolean;
  root?: string;
  excludeRandomClasses?: boolean;
  enableSelectionTools?: boolean;
}) {
  const rootElement = root == null ? undefined : requireSingleElement(root);
  const { elements, isMulti, shouldSelectSimilar } = await userSelectElement({
    root: rootElement,
    enableSelectionTools,
  });

  console.debug("Selected elements", { elements, isMulti });
  switch (mode) {
    case "container": {
      if (root) {
        throw new Error(`root selector not implemented for mode: ${mode}`);
      }

      const { selectors } = findContainer(elements);

      requireSingleElement(selectors[0]);

      return pageScript.getElementInfo({
        selector: selectors[0],
        framework,
        traverseUp,
      });
    }

    case "element": {
      const selector = shouldSelectSimilar
        ? expandedCssSelector(elements, {
            root: rootElement,
            excludeRandomClasses,
          })
        : safeCssSelector(elements, {
            root: rootElement,
            excludeRandomClasses,
          });

      console.debug(`Generated selector: ${selector}`);

      if (isMulti) {
        const inferredSelectors = uniq([
          selector,
          // TODO: Discuss if it's worth to include stableAncestors for multi-element selector
          // ...inferSelectorsIncludingStableAncestors(elements[0]),
        ]);

        return {
          selectors: inferredSelectors,
          framework: null,
          hasData: false,
          tagName: elements[0].tagName, // Will first element tag be enough/same for all elemtns?
          parent: null,
          isMulti: true,
        };
      }

      // Double-check we have a valid selector
      const element = requireSingleElement(selector);

      // We're using pageScript getElementInfo only when specific framework is used.

      // On Salesforce we were running into an issue where certain selectors weren't finding any elements when
      // run from the pageScript. It might have something to do with the custom web components Salesforce uses?
      // In any case, the pageScript is not necessary if framework is not specified, because selectElement
      // only needs to return the selector alternatives.
      if (framework) {
        return pageScript.getElementInfo({
          selector,
          framework,
          traverseUp,
        });
      }

      const inferredSelectors = uniq([
        selector,
        ...inferSelectorsIncludingStableAncestors(element),
      ]);

      return {
        selectors: inferredSelectors,
        framework: null,
        hasData: false,
        tagName: element.tagName,
        parent: null,
      };
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for type `never`
      throw new Error(`Unexpected mode: ${mode}`);
    }
  }
}

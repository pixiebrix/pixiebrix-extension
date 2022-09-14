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
  findContainer,
  inferSelectorsIncludingStableAncestors,
  safeCssSelector,
  safeMultiCssSelector,
} from "@/contentScript/nativeEditor/selectorInference";
import { Framework } from "@/messaging/constants";
import { uniq } from "lodash";
import * as pageScript from "@/pageScript/protocol";
import { requireSingleElement } from "@/utils/requireSingleElement";
import { SelectMode } from "@/contentScript/nativeEditor/types";
import { showSelectionToolPopover } from "@/components/SelectionToolPopover";

let overlay: Overlay | null = null;
let styleElement: HTMLStyleElement = null;
let multiSelectionToolElement: HTMLElement = null;

export function hideOverlay(): void {
  if (overlay != null) {
    overlay.remove();
    overlay = null;
  }
}

let _cancelSelect: () => void = null;

function noopMouseHandler(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

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
}: UserSelection = {}): Promise<{ elements: HTMLElement[]; isMulti: boolean }> {
  return new Promise<{ elements: HTMLElement[]; isMulti: boolean }>(
    (resolve, reject) => {
      const targets = new Set<HTMLElement>();
      let isMulti = enableSelectionTools;
      if (!overlay) {
        overlay = new Overlay();
      }

      function prehiglightItems() {
        let filteredElements: HTMLElement[];
        if (filter) {
          filteredElements = [
            ...document.querySelectorAll<HTMLElement>(filter),
          ];
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

      function stopInspectingNative() {
        hideOverlay();
        _cancelSelect = null;
        removeListenersOnWindow(window);
        removeInspectingModeStyles();
        if (enableSelectionTools) {
          removeMultiSelectionTool();
        }
      }

      function handleDone(target?: HTMLElement) {
        try {
          const result = target
            ? uniq([...targets, target])
            : uniq([...targets]);
          if (root && result.some((x) => !root.contains(x))) {
            throw new Error(
              "One or more selected elements are not contained with the root container"
            );
          }

          resolve({ elements: result, isMulti });
        } finally {
          stopInspectingNative();
        }
      }

      function handleMultiSelectionChange(value: boolean) {
        console.debug("////", value);
        isMulti = value;
      }

      function onClick(event: MouseEvent) {
        const target = findExpectedTarget(event.target);
        if (event.altKey || !target) {
          return;
        }

        // Do not allow select the multi-element selection popup.
        if (target.contains(multiSelectionToolElement)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
          if (targets.has(target)) {
            targets.delete(target);
          } else {
            targets.add(target);
          }

          return;
        }

        handleDone(target);
      }

      function onPointerDown(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();

        console.debug("Pointer down:", event.target);
      }

      function onPointerOver(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        const target = findExpectedTarget(event.target);

        if (target) {
          overlay.inspect([target]);
        }
      }

      function onPointerLeave() {
        overlay.inspect([]);
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
        reject(new Error("Selection cancelled"));
      }

      function registerListenersOnWindow(window: Window) {
        window.addEventListener("click", onClick, true);
        window.addEventListener("mousedown", noopMouseHandler, true);
        window.addEventListener("mouseover", noopMouseHandler, true);
        window.addEventListener("mouseup", noopMouseHandler, true);
        window.addEventListener("pointerdown", onPointerDown, true);

        if (!filter) {
          window.addEventListener("pointerover", onPointerOver, true);
          window.document.addEventListener(
            "pointerleave",
            onPointerLeave,
            true
          );
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
        window.document.removeEventListener(
          "pointerleave",
          onPointerLeave,
          true
        );
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
          handleChange: handleMultiSelectionChange,
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
    }
  );
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
  const { elements, isMulti } = await userSelectElement({
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
      if (isMulti) {
        const selector = safeMultiCssSelector(elements, {
          root: rootElement,
          excludeRandomClasses,
        });

        console.debug(`Generated selector: ${selector}`);

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
          // TODO: Discuss if it's worth to include stableAncestors for multi-elements selector
          // ...inferSelectorsIncludingStableAncestors(elements[0]),
        ]);

        return {
          selectors: inferredSelectors,
          framework: null,
          hasData: false,
          tagName: elements[0].tagName, // Will first element tag will be enough/same for all elemtns?
          parent: null,
        };
      }

      const selector = safeCssSelector(elements[0], {
        root: rootElement,
        excludeRandomClasses,
      });

      console.debug(`Generated selector: ${selector}`);

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

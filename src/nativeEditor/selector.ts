/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import Overlay from "@/nativeEditor/Overlay";
import { liftContentScript } from "@/contentScript/backgroundProtocol";
import { findContainer, safeCssSelector } from "@/nativeEditor/infer";
import { Framework } from "@/messaging/constants";
import { uniq } from "lodash";
import * as pageScript from "@/pageScript/protocol";
import { requireSingleElement } from "@/nativeEditor/utils";

let overlay: Overlay | null = null;

export function hideOverlay(): void {
  if (overlay != null) {
    overlay.remove();
    overlay = null;
  }
}

let _cancelSelect: () => void = null;

export function userSelectElement(root?: HTMLElement): Promise<HTMLElement[]> {
  return new Promise<HTMLElement[]>((resolve, reject) => {
    const targets: HTMLElement[] = [];

    function stopInspectingNative() {
      hideOverlay();
      _cancelSelect = null;
      removeListenersOnWindow(window);
    }

    function noopMouseHandler(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
    }

    function onClick(event: MouseEvent) {
      if (event.altKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey) {
        if (event.target) {
          const index = targets.indexOf(event.target as HTMLElement);
          if (index >= 0) {
            targets.splice(index, 1);
          } else {
            targets.push(event.target as HTMLElement);
          }
        }
      } else {
        try {
          if (event.target) {
            const result = uniq([...targets, event.target as HTMLElement]);
            if (root && result.some((x) => !root.contains(x))) {
              throw new Error(
                "One or more selected elements are not contained with the root container"
              );
            }
            resolve(result);
          }
        } finally {
          stopInspectingNative();
        }
      }
    }

    function onPointerDown(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();

      console.log("Pointer down:", event.target);
    }

    function onPointerOver(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (overlay == null) {
        overlay = new Overlay();
      }

      overlay.inspect([event.target as HTMLElement], null);
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
      reject("Selection cancelled");
    }

    function registerListenersOnWindow(window: Window) {
      window.addEventListener("click", onClick, true);
      window.addEventListener("mousedown", noopMouseHandler, true);
      window.addEventListener("mouseover", noopMouseHandler, true);
      window.addEventListener("mouseup", noopMouseHandler, true);
      window.addEventListener("pointerdown", onPointerDown, true);
      window.addEventListener("pointerover", onPointerOver, true);
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
      window.removeEventListener("pointerup", noopMouseHandler, true);
      window.removeEventListener("keyup", escape, true);
    }

    _cancelSelect = cancel;
    registerListenersOnWindow(window);
  });
}

export type SelectMode = "element" | "container";

// export const findComponent = liftContentScript(
//     "SELECT_COMPONENT",
//     async ({ selector, framework }: { selector: string, framework: Framework }) => {
//     }
// )

export const cancelSelect = liftContentScript(
  "CANCEL_SELECT_ELEMENT",
  async () => {
    if (_cancelSelect) {
      _cancelSelect();
    }
  }
);

export const selectElement = liftContentScript(
  "SELECT_ELEMENT",
  async ({
    traverseUp = 0,
    mode = "element",
    framework,
    root = undefined,
  }: {
    traverseUp: number;
    framework?: Framework;
    mode: SelectMode;
    isMulti?: boolean;
    root?: string;
  }) => {
    const rootElement = root != null ? requireSingleElement(root) : undefined;
    const elements = await userSelectElement(rootElement);

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
        const selector = safeCssSelector(elements[0], [], rootElement);

        console.debug(`Generated selector: ${selector}`);

        // double-check we have a valid selector
        requireSingleElement(selector);

        return pageScript.getElementInfo({
          selector,
          framework,
          traverseUp,
        });
      }
      default: {
        throw new Error(`Unexpected mode: ${mode}`);
      }
    }
  }
);

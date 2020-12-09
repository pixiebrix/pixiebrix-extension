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
import { findContainer, inferSelectors } from "@/nativeEditor/infer";
import { uniq } from "lodash";
import { Framework } from "@/messaging/constants";
import adapters from "@/frameworks/adapters";
import { ComponentNotFoundError } from "@/frameworks/errors";

let overlay: Overlay | null = null;

export function hideOverlay(): void {
  if (overlay != null) {
    overlay.remove();
    overlay = null;
  }
}

export function userSelectElement(): Promise<HTMLElement> {
  return new Promise<HTMLElement>((resolve) => {
    function stopInspectingNative() {
      hideOverlay();
      removeListenersOnWindow(window);
    }

    function noopMouseHandler(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
    }

    function onClick(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();

      try {
        if (event.target) {
          resolve(event.target as HTMLElement);
        }
      } finally {
        stopInspectingNative();
      }
    }

    function onPointerDown(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();

      console.log("Pointer down: ", event.target);
    }

    function onPointerOver(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (overlay == null) {
        overlay = new Overlay();
      }

      overlay.inspect([event.target as HTMLElement], null);
    }

    function registerListenersOnWindow(window: Window) {
      window.addEventListener("click", onClick, true);
      window.addEventListener("mousedown", noopMouseHandler, true);
      window.addEventListener("mouseover", noopMouseHandler, true);
      window.addEventListener("mouseup", noopMouseHandler, true);
      window.addEventListener("pointerdown", onPointerDown, true);
      window.addEventListener("pointerover", onPointerOver, true);
      window.addEventListener("pointerup", noopMouseHandler, true);
    }

    function removeListenersOnWindow(window: Window) {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("mousedown", noopMouseHandler, true);
      window.removeEventListener("mouseover", noopMouseHandler, true);
      window.removeEventListener("mouseup", noopMouseHandler, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerover", onPointerOver, true);
      window.removeEventListener("pointerup", noopMouseHandler, true);
    }

    registerListenersOnWindow(window);
  });
}

export type SelectMode = "element" | "container";

export interface ElementInfo {
  selectors: string[];
  framework: Framework;
  tagName: string;
  owner: ElementInfo | undefined;
}

export async function elementInfo(
  element: HTMLElement,
  framework?: Framework,
  selectors: string[] = []
): Promise<ElementInfo> {
  for (const [adapterFramework, adapter] of Object.entries(adapters)) {
    if (framework && framework !== adapterFramework) {
      continue;
    }
    if (adapter.elementComponent(element)) {
      return {
        selectors: uniq([...selectors, ...inferSelectors(element)]),
        framework: adapterFramework as Framework,
        tagName: element.tagName,
        owner: null,
      };
    }

    let ownerElement;

    try {
      ownerElement = adapter.getOwner(element);
    } catch (err) {
      if (err instanceof ComponentNotFoundError) {
        continue;
      }
      throw err;
    }

    if (ownerElement && ownerElement !== element) {
      return {
        selectors: uniq([...selectors, ...inferSelectors(element)]),
        framework: adapterFramework as Framework,
        tagName: element.tagName,
        owner: {
          selectors: inferSelectors(ownerElement),
          framework: adapterFramework as Framework,
          tagName: ownerElement.tagName,
          owner: null,
        },
      };
    }
  }

  return {
    selectors: uniq([...selectors, ...inferSelectors(element)]),
    framework: null,
    tagName: element.tagName,
    owner: null,
  };
}

// export const findComponent = liftContentScript(
//     "SELECT_COMPONENT",
//     async ({ selector, framework }: { selector: string, framework: Framework }) => {
//     }
// )

export const selectElement = liftContentScript(
  "SELECT_ELEMENT",
  async ({
    mode = "element",
    framework,
  }: {
    framework?: Framework;
    mode: SelectMode;
  }) => {
    const element = await userSelectElement();
    if (mode === "container") {
      const { container, selectors } = findContainer(element);
      return await elementInfo(container, framework, selectors);
    }
    return await elementInfo(element, framework);
  }
);

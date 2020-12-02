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

// https://github.com/facebook/react/blob/7559722a865e89992f75ff38c1015a865660c3cd/packages/react-devtools-shared/src/backend/views/Highlighter/index.js

import Mustache from "mustache";
import { liftContentScript } from "@/contentScript/backgroundProtocol";
import Overlay from "./Overlay";
import {
  DEFAULT_ACTION_CAPTION,
  findContainer,
  inferButtonHTML,
} from "@/nativeEditor/infer";
import { v4 as uuidv4 } from "uuid";

let overlay: Overlay | null = null;

export function hideOverlay(): void {
  if (overlay != null) {
    overlay.remove();
    overlay = null;
  }
}

export interface InsertResult {
  uuid: string;
  containerSelector: string;
  containerSelectorOptions: string[];
  template: string;
  caption: string;
  position: "append" | "prepend";
}

function setupInserter(): Promise<InsertResult> {
  return new Promise<InsertResult>((resolve) => {
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
          const { container, selectors } = findContainer(
            event.target as HTMLElement
          );

          resolve({
            uuid: uuidv4(),
            caption: DEFAULT_ACTION_CAPTION,
            containerSelector: selectors[0],
            containerSelectorOptions: selectors,
            template: inferButtonHTML(container),
            position: "append",
          });
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

function makeElement(element: InsertResult) {
  const { uuid, template, caption } = element;
  console.log("template", { template, caption });
  const html = Mustache.render(template, { caption });
  return $(html).attr("data-uuid", uuid).data(element);
}

export const updateButton = liftContentScript(
  "UPDATE_BUTTON",
  async (element: InsertResult) => {
    const $elt = $(`[data-uuid="${element.uuid}"]`);

    const $newElt = makeElement(element);

    if (
      $elt.data("containerSelector") !== element.containerSelector ||
      $elt.data("position") !== element.position
    ) {
      $elt.remove();
      $(element.containerSelector)[element.position]($newElt);
    } else {
      $elt.replaceWith($newElt);
    }

    $newElt.on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      alert("No action implemented");
    });
  }
);

export const removeElement = liftContentScript(
  "REMOVE_ELEMENT",
  async ({ uuid }: { uuid: string }) => {
    $(`[data-uuid="${uuid}"]`).remove();
  }
);

export const insertButton = liftContentScript("INSERT_BUTTON", async () => {
  const element = await setupInserter();
  $(element.containerSelector).append(makeElement(element));
  return element;
});

export const toggleOverlay = liftContentScript(
  "TOGGLE_OVERLAY",
  async ({ uuid, on = true }: { uuid: string; on: boolean }) => {
    if (on) {
      if (overlay == null) {
        overlay = new Overlay();
      }
      const $elt = $(`[data-uuid="${uuid}"]`);
      overlay.inspect($elt.toArray(), null);
    } else {
      hideOverlay();
    }
  }
);

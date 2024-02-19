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

import { getCommonAncestor } from "@/utils/inference/selectorInference";

type HTMLTextElement = HTMLTextAreaElement | HTMLInputElement;

function getSelection(): Selection {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Firefox-only iframe-only "null"
  return window.getSelection()!;
}

// https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
// Note that according to the WHATWG forms spec selectionStart, selectionEnd properties and setSelectionRange
// method apply only to inputs of types text, search, URL, tel and password.
const SUPPORTED_INPUT_TYPES = new Set<string>([
  "text",
  "search",
  "url",
  "tel",
  "password",
]);

// // https://stackoverflow.com/a/59106148
function withInputSelectionHack(
  element: HTMLTextElement,
  fn: (supportedElement: HTMLTextElement) => void,
): void {
  let doHack = false;
  const originalType = element.getAttribute("type");

  if (
    element instanceof HTMLInputElement &&
    !SUPPORTED_INPUT_TYPES.has(originalType ?? "text")
  ) {
    doHack = true;
    element.setAttribute("type", "text");
  }

  try {
    fn(element);
  } finally {
    if (doHack) {
      if (originalType == null) {
        element.removeAttribute("type");
      } else {
        element.setAttribute("type", originalType);
      }
    }
  }
}

/**
 * Get the HTMLElement corresponding to the current selection.
 *
 * Originally introduced to guess which HTML element the user right-clicked to trigger a context menu if PixieBrix
 * did not already have access to the page.
 *
 * @see setActiveElement
 */
export function guessSelectedElement(): HTMLElement | null {
  const selection = getSelection();
  if (selection?.rangeCount) {
    const start =
      selection.getRangeAt(0).startContainer.parentElement ??
      document.documentElement;
    const end =
      selection.getRangeAt(selection.rangeCount - 1).endContainer
        .parentElement ?? document.documentElement;
    const node = getCommonAncestor(start, end);
    if (node instanceof HTMLElement) {
      return node;
    }

    return null;
  }

  return null;
}

type TextElementRange = {
  activeElement: WeakRef<HTMLTextElement>;
  selectionStart: typeof HTMLInputElement.prototype.selectionStart;
  selectionEnd: typeof HTMLInputElement.prototype.selectionEnd;
  selectionDirection: typeof HTMLInputElement.prototype.selectionDirection;
};

/**
 * Overridable selection getter. Useful to allow the QuickBar to preserve the selection
 * https://github.com/pixiebrix/pixiebrix-extension/issues/2443
 */
let selectionOverride: Range | undefined;
let elementOverride: TextElementRange | undefined;
// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const selectionController = {
  save(): void {
    const selection = getSelection();

    const { activeElement } = document;

    // Browser's Selection API not reliable for input elements. For example, on https://pbx.vercel.app/bootstrap-5/
    // the selection is the fieldset
    if (
      activeElement instanceof HTMLElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA")
    ) {
      const textElement = activeElement as HTMLTextElement;

      // FIXME: this isn't working for email field on https://pbx.vercel.app/bootstrap-5/. You can see a flash
      //  where the cursor resets when the field type changes
      // withInputSelectionHack(textElement, () => {

      elementOverride = {
        activeElement: new WeakRef(textElement),
        selectionStart: textElement.selectionStart,
        selectionEnd: textElement.selectionEnd,
        selectionDirection: textElement.selectionDirection,
      };

      return;
    }

    // It must be set to "undefined" even if there are selections
    selectionOverride = selection.rangeCount
      ? selection.getRangeAt(0)
      : undefined;
  },
  restore(): void {
    if (elementOverride != null) {
      const element = elementOverride.activeElement.deref();
      if (element) {
        console.debug("Restoring selection for input element", element);

        withInputSelectionHack(element, (supportedElement) => {
          supportedElement.focus();
          supportedElement.setSelectionRange(
            element.selectionStart,
            element.selectionEnd,
            element.selectionDirection ?? "none",
          );
        });
      }

      elementOverride = undefined;
    }

    if (selectionOverride) {
      const native = getSelection();
      native.removeAllRanges();
      native.addRange(selectionOverride);
      selectionOverride = undefined;
    }
  },
  get(): string {
    return (selectionOverride ?? getSelection()).toString();
  },
};

export default selectionController;

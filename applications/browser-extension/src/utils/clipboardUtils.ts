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

import { BusinessError } from "@/errors/businessErrors";
import legacyCopyText from "copy-text-to-clipboard";
import { getErrorMessage } from "@/errors/errorHelpers";
import { focusCaptureDialog } from "@/contentScript/focusCaptureDialog";
import { isPromiseFulfilled } from "./promiseUtils";
import { writeToClipboardInFocusedDocument } from "@/background/messenger/api";

export type ContentType = "infer" | "text" | "image";

export type ClipboardText = {
  /**
   * The text to copy to the clipboard.
   */
  text: string;
  /**
   * Optional HTML content to copy to the clipboard for pasting into rich text editors.
   */
  html?: string;
};

type ClipboardImage = {
  /**
   * The image to copy to the clipboard.
   */
  image: Blob;
};

/** Serializable ClipboardItem-like object */
export type ClipboardContent = ClipboardText | ClipboardImage;

function getClipboardItem(content: ClipboardContent): ClipboardItem {
  if ("image" in content) {
    return new ClipboardItem({ [content.image.type]: content.image });
  }

  const items: Record<string, Blob> = {
    "text/plain": new Blob([content.text], { type: "text/plain" }),
  };

  if (content.html) {
    items["text/html"] = new Blob([content.html], { type: "text/html" });
  }

  return new ClipboardItem(items);
}

export function detectContentType(content: unknown): "text" | "image" {
  if (typeof content === "string" && content.startsWith("data:image/")) {
    return "image";
  }

  return "text";
}

function isDocumentFocusError(error: unknown): boolean {
  // Chrome throws a DOMException with the message "Document is not focused" when it can't establish a user action
  // for the clipboard write request
  // https://stackoverflow.com/questions/56306153/domexception-on-calling-navigator-clipboard-readtext/70386674#70386674
  return getErrorMessage(error)
    .toLowerCase()
    .includes("document is not focused");
}

/**
 * Attempt to write to clipboard, but don't throw nor retry in other ways.
 * Use `writeToClipboard` in the current context if you want to handle errors and try in other ways.
 */
export async function nonInteractivelyWriteToClipboard(
  content: ClipboardText,
): Promise<boolean> {
  return isPromiseFulfilled(
    navigator.clipboard.write([getClipboardItem(content)]),
  );
}

/**
 * Copy to clipboard, and prompt user to interact with page if the browser blocks the clipboard write due to focus
 */
async function interactiveWriteToClipboard(
  content: ClipboardContent,
): Promise<void> {
  const clipboardItems = [getClipboardItem(content)];
  try {
    await navigator.clipboard.write(clipboardItems);
  } catch (error) {
    if (!isDocumentFocusError(error)) {
      throw error;
    }

    const type = "image" in content ? "image" : "text";
    await focusCaptureDialog({
      message: `Click "Copy ${type}" to copy the ${type} to your clipboard.`,
      buttonText: `Copy ${type}`,
    });

    // Let the error be caught by the caller if it still fails
    await navigator.clipboard.write(clipboardItems);
  }
}

/**
 * Copy to the clipboard, working around document focus restrictions if necessary.
 */
export async function writeToClipboard(
  content: ClipboardContent,
): Promise<boolean> {
  if ("image" in content && !("write" in navigator.clipboard)) {
    throw new BusinessError(
      "Your browser does not support writing images to the clipboard",
    );
  }

  // Attempt to write to the clipboard in the last focused document
  if (
    !document.hasFocus() &&
    "text" in content &&
    (await writeToClipboardInFocusedDocument(content))
  ) {
    return true;
  }

  // If the document is focused, or the last focused document is not available, continue here interactively

  try {
    // Fails in frame contexts if the frame CSP doesn't include clipboard-write. Unfortunately, that includes the
    // Chrome DevTools. In this case, will fall back to legacy method in the catch block
    await interactiveWriteToClipboard(content);
  } catch (error) {
    if (
      "text" in content &&
      // Deprecated method of copying text to clipboard doesn't require clipboard-write in frame CSP.
      // It can sometimes return `true` even if the text wasn't actually copied so try to use navigator.clipboard first
      // The legacy approach uses a hidden text area and document.execCommand('copy') under the hood
      legacyCopyText(content.text)
    ) {
      // The legacy method worked, probably
      return true;
    }

    throw new BusinessError("Unable to write text to clipboard", {
      cause: error,
    });
  }

  return true;
}

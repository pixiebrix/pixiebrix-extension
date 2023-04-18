/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import pDefer from "p-defer";
import notify, { hideNotification } from "@/utils/notify";
import { BusinessError } from "@/errors/businessErrors";
import legacyCopyText from "copy-text-to-clipboard";
import { getErrorMessage } from "@/errors/errorHelpers";

export type ContentType = "infer" | "text" | "image";

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

function isPermissionError(error: unknown): boolean {
  return getErrorMessage(error).toLowerCase().includes("has been blocked");
}

// Parse instead of using fetch to avoid potential CSP issues with data: URIs
// https://stackoverflow.com/a/12300351
export function dataURItoBlob(dataURI: string): Blob {
  // Convert base64 to raw binary data held in a string doesn't handle URLEncoded DataURIs - see SO answer #6850276 for
  // code that does this
  const byteString = atob(dataURI.split(",")[1]);

  // Separate out the mime component
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

  // Write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length);

  // Create a view into the buffer
  const ia = new Uint8Array(ab);

  // Set the bytes of the buffer to the correct values
  for (let i = 0; i < byteString.length; i++) {
    // eslint-disable-next-line unicorn/prefer-code-point,security/detect-object-injection -- is a number; copied SO
    ia[i] = byteString.charCodeAt(i);
  }

  // Write the ArrayBuffer to a blob, and you're done
  return new Blob([ab], { type: mimeString });
}

/**
 * Copy to clipboard, and prompt user to interact with page if the browser blocks the clipboard write due to focus
 * @param clipboardFn function to copy to the clipboard
 * @param type the data type, to show in the message to the user.
 */
async function interactiveWriteToClipboard(
  clipboardFn: () => Promise<void>,
  { type }: { type: "text" | "image" }
): Promise<void> {
  try {
    await clipboardFn();
  } catch (error) {
    if (isDocumentFocusError(error)) {
      const copyPromise = pDefer<void>();

      const notificationId = notify.info({
        message: `Click anywhere to copy ${type} to clipboard`,
        duration: Number.POSITIVE_INFINITY,
        dismissable: false,
      });

      const handler = async () => {
        try {
          hideNotification(notificationId);
          await clipboardFn();
          copyPromise.resolve();
        } catch (error) {
          if (isDocumentFocusError(error)) {
            copyPromise.reject(
              new BusinessError(
                "Your Browser was unable to determine the user action that initiated the clipboard write."
              )
            );
            return;
          }

          copyPromise.reject(error);
        }
      };

      document.body.addEventListener("click", handler);

      try {
        await copyPromise.promise;
      } finally {
        document.body.removeEventListener("click", handler);
      }

      // Remember to return to avoid falling through to the original error
      return;
    }

    throw error;
  }
}

export async function writeTextToClipboard(text: string): Promise<void> {
  try {
    await interactiveWriteToClipboard(
      async () => navigator.clipboard.writeText(text),
      {
        type: "text",
      }
    );
  } catch (error) {
    if (isPermissionError(error)) {
      // Legacy method of copying text to clipboard doesn't require clipboard-write in frame CSP. However, it can
      // sometimes return `true` even if the text wasn't actually copied so try to use navigator.clipboard first
      const copied = legacyCopyText(text);
      if (!copied) {
        throw new BusinessError("Unable to write text to clipboard");
      }

      return;
    }

    throw error;
  }
}

export async function writeToClipboard(items: ClipboardItems): Promise<void> {
  await interactiveWriteToClipboard(
    async () => navigator.clipboard.write(items),
    {
      type: "image",
    }
  );
}

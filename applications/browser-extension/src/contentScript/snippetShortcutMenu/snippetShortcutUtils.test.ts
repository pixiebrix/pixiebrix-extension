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

import {
  normalizePreview,
  replaceAtCommandKey,
} from "@/contentScript/snippetShortcutMenu/snippetShortcutUtils";

// `jsdom` doesn't implement execCommand
document.execCommand = jest.fn().mockReturnValue(true);

// Can only do very limited testing due to lack of jsdom support for execCommand and selection/focus
describe("replaceAtCommandKey", () => {
  it("inserts in normal text field", async () => {
    document.body.innerHTML = String.raw`<input type="text" value="\hello world" id="input" />`;

    await replaceAtCommandKey({
      element: document.querySelector("#input")!,
      text: "new text",
      query: "",
      commandKey: "\\",
    });

    expect(document.execCommand).toHaveBeenCalledWith(
      "insertText",
      false,
      "new text",
    );
  });
});

describe("normalizePreview", () => {
  it("removes excess space", () => {
    expect(normalizePreview("  hello \n\n world  ")).toBe("hello world");
  });
});

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

import { CopyToClipboard } from "@/blocks/effects/clipboard";
import copy from "copy-text-to-clipboard";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { PropError } from "@/errors/businessErrors";

const brick = new CopyToClipboard();

jest.mock("copy-text-to-clipboard", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const copyMock = copy as jest.MockedFunction<typeof copy>;

// From https://en.wikipedia.org/wiki/Data_URI_scheme
const SMALL_RED_DOT_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";

// Clipboard API not available in JSDOM: https://github.com/jsdom/jsdom/issues/1568
(navigator as any).clipboard = {
  ...navigator.clipboard,
  write: jest.fn(),
};

globalThis.ClipboardItem = jest.fn();

const writeMock = navigator.clipboard.write as jest.MockedFunction<
  typeof navigator.clipboard.write
>;

describe("CopyToClipboard", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("copies to clipboard", async () => {
    const text = "Hello, world!";
    await brick.run(unsafeAssumeValidArg({ text }), {} as any);
    expect(copyMock).toHaveBeenCalledWith(text);
  });

  it("copies null to clipboard", async () => {
    await brick.run(
      unsafeAssumeValidArg({ text: null, contentType: "infer" }),
      {} as any
    );
    expect(copyMock).toHaveBeenCalledWith("null");
  });

  it("copies boolean clipboard", async () => {
    await brick.run(
      unsafeAssumeValidArg({ text: false, contentType: "infer" }),
      {} as any
    );
    expect(copyMock).toHaveBeenCalledWith("false");
  });

  it("copies image to clipboard", async () => {
    await brick.run(
      unsafeAssumeValidArg({ text: SMALL_RED_DOT_URI, contentType: "infer" }),
      {} as any
    );
    expect(copyMock).not.toHaveBeenCalled();
    expect(writeMock).toHaveBeenCalled();
    expect(ClipboardItem).toHaveBeenCalledWith({
      "image/png": expect.any(Blob),
    });
  });

  it("throws prop error on invalid image content", async () => {
    await expect(async () =>
      brick.run(
        unsafeAssumeValidArg({ text: false, contentType: "image" }),
        {} as any
      )
    ).rejects.toThrow(PropError);
  });
});

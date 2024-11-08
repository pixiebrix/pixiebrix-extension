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

import { CopyToClipboard } from "./clipboard";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { PropError } from "@/errors/businessErrors";
import userEvent from "@testing-library/user-event";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";
import { convertDataUrl } from "../../utils/parseDataUrl";

const brick = new CopyToClipboard();

// From https://en.wikipedia.org/wiki/Data_URI_scheme
const SMALL_RED_DOT_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";

// Clipboard API not available in JSDOM: https://github.com/jsdom/jsdom/issues/1568
(navigator as any).clipboard = {
  ...navigator.clipboard,
  write: jest.fn(),
  writeText: jest
    .fn()
    .mockRejectedValue(new Error("write should be called instead")),
};

class ClipboardItemFake implements ClipboardItem {
  presentationStyle: PresentationStyle = "unspecified";

  constructor(
    private readonly items: Record<
      string,
      string | Blob | PromiseLike<string | Blob>
    >,
  ) {}

  static supports(type: string): boolean {
    return true;
  }

  async getType(type: string): Promise<Blob> {
    return this.items[type] as Blob;
  }

  public get types(): string[] {
    return Object.keys(this.items);
  }
}

// @ts-expect-error -- BlobFake is not a real Blob
class BlobFake implements Blob {
  constructor(
    // @ts-expect-error -- match Block constructor
    private readonly parts: BlobPart[],
    private readonly options: BlobPropertyBag,
  ) {}

  get type(): string {
    return this.options.type!;
  }
}

globalThis.ClipboardItem = ClipboardItemFake;
globalThis.Blob = BlobFake as unknown as typeof Blob;

const writeMock = jest.mocked(navigator.clipboard.write);

describe("CopyToClipboard", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("copies to clipboard", async () => {
    const text = "Hello, world!";
    await brick.run(unsafeAssumeValidArg({ text }), brickOptionsFactory());
    expect(writeMock).toHaveBeenCalledWith([
      new ClipboardItemFake({
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
  });

  it("copies null to clipboard", async () => {
    await brick.run(
      unsafeAssumeValidArg({ text: null, contentType: "infer" }),
      brickOptionsFactory(),
    );
    expect(writeMock).toHaveBeenCalledWith([
      new ClipboardItemFake({
        "text/plain": new Blob(["null"], { type: "text/plain" }),
      }),
    ]);
  });

  it("copies boolean clipboard", async () => {
    await brick.run(
      unsafeAssumeValidArg({ text: false, contentType: "infer" }),
      brickOptionsFactory(),
    );
    expect(writeMock).toHaveBeenCalledWith([
      new ClipboardItemFake({
        "text/plain": new Blob(["false"], { type: "text/plain" }),
      }),
    ]);
  });

  it("copies html clipboard", async () => {
    const text = "Hello, world!";
    const html = "<b>Hello, world!</b>";
    await brick.run(
      unsafeAssumeValidArg({ text, html }),
      brickOptionsFactory(),
    );
    expect(writeMock).toHaveBeenCalledWith([
      new ClipboardItemFake({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
  });

  it("copies image to clipboard", async () => {
    await brick.run(
      unsafeAssumeValidArg({ text: SMALL_RED_DOT_URI, contentType: "infer" }),
      brickOptionsFactory(),
    );
    expect(writeMock).toHaveBeenCalled();
    expect(writeMock).toHaveBeenCalledWith([
      // XXX: matcher doesn't inspect inside of Blob for comparison
      new ClipboardItemFake({
        "image/png": convertDataUrl(SMALL_RED_DOT_URI, "Blob"),
      }),
    ]);
  });

  it("throws prop error on invalid image content", async () => {
    await expect(async () =>
      brick.run(
        unsafeAssumeValidArg({ text: false, contentType: "image" }),
        brickOptionsFactory(),
      ),
    ).rejects.toThrow(PropError);
  });

  it("handles document focus error", async () => {
    writeMock.mockRejectedValueOnce(new Error("Document is not focused."));

    const brickPromise = brick.run(
      unsafeAssumeValidArg({ text: SMALL_RED_DOT_URI, contentType: "image" }),
      brickOptionsFactory(),
    );

    writeMock.mockResolvedValue();

    await userEvent.click(document.body);

    await expect(brickPromise).resolves.toBeUndefined();
  });

  // Jest fails the test because it's not happy about the BusinessError in HTMLBodyElement.handler. The assertion
  // that brickPromise throws succeeds, though.  I'm not sure if it thinks the promise is unhandled, or there's special
  // logic in JSDOM/Jest about errors.
  it.skip("handles unfixable document focus error", async () => {
    writeMock.mockRejectedValue(new Error("Document is not focused."));

    const brickPromise = brick.run(
      unsafeAssumeValidArg({ text: SMALL_RED_DOT_URI, contentType: "image" }),
      brickOptionsFactory(),
    );

    await userEvent.click(document.body);

    await expect(brickPromise).rejects.toThrow();
  });
});

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

import TourStepTransformer from "@/blocks/transformers/tourStep/tourStep";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type BlockOptions } from "@/core";
import {
  cancelAllTours,
  markTourStart,
} from "@/extensionPoints/tourController";
import { tick } from "@/extensionPoints/extensionPointTestUtils";

Element.prototype.scrollIntoView = jest.fn();

jest.mock("@/utils/injectStylesheet", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    remove: jest.fn(),
  }),
}));

const logger = new ConsoleLogger({
  extensionId: uuidv4(),
  blueprintId: validateRegistryId("test/tour"),
});

const brick = new TourStepTransformer();

// XXX: can't figure out how to test intro.js with jest; debugger segfaults in showIntroJsStep
describe("tourStep", () => {
  beforeEach(() => {
    (Element.prototype.scrollIntoView as jest.Mock).mockReset();
  });

  test("isRootAware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  it("requires tour", async () => {
    const promise = brick.run(
      unsafeAssumeValidArg({ title: "Test", body: "**markdown**" }),
      { logger, root: document } as BlockOptions
    );
    await expect(promise).rejects.toThrow(
      "This brick can only be called from a tour"
    );
  });

  it("renders simple step over document", async () => {
    const nonce = uuidv4();
    const abortController = new AbortController();

    document.body.innerHTML = "<div>Test</div>";

    markTourStart(
      nonce,
      {
        id: uuidv4(),
        label: "Test Tour",
        _recipe: null,
      },
      { abortController }
    );

    const promise = brick.run(
      unsafeAssumeValidArg({ title: "Test", body: "**markdown**" }),
      { logger, root: document } as BlockOptions
    );

    await tick();

    expect(document.body.innerHTML).toContain("markdown");

    $(document).find(".introjs-donebutton").click();

    await tick();

    expect(document.body.innerHTML).not.toContain("markdown");

    await expect(promise).resolves.toEqual({});

    cancelAllTours();
  });

  it("highlights element", async () => {
    const nonce = uuidv4();
    const abortController = new AbortController();

    document.body.innerHTML = "<div>Test</div>";

    markTourStart(
      nonce,
      {
        id: uuidv4(),
        label: "Test Tour",
        _recipe: null,
      },
      { abortController }
    );

    const promise = brick.run(
      unsafeAssumeValidArg({
        title: "Test",
        body: "**markdown**",
        appearance: { highlight: { backgroundColor: "yellow" } },
      }),
      { logger, root: document.querySelector("div") } as unknown as BlockOptions
    );

    await tick();

    expect(document.querySelector("div").style.backgroundColor).toBe("yellow");

    $(document).find(".introjs-donebutton").click();

    await tick();

    expect(document.querySelector("div").style.backgroundColor).not.toBe(
      "yellow"
    );

    await expect(promise).resolves.toEqual({});
    cancelAllTours();
  });

  it("don't scroll to element by default", async () => {
    const nonce = uuidv4();
    const abortController = new AbortController();

    document.body.innerHTML = "<div>Test</div>";

    markTourStart(
      nonce,
      {
        id: uuidv4(),
        label: "Test Tour",
        _recipe: null,
      },
      { abortController }
    );

    const promise = brick.run(
      unsafeAssumeValidArg({ title: "Test", body: "**markdown**" }),
      { logger, root: document.querySelector("div") } as unknown as BlockOptions
    );

    await tick();

    $(document).find(".introjs-donebutton").click();

    await tick();

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    await expect(promise).resolves.toEqual({});
    cancelAllTours();
  });

  it("scrolls to element", async () => {
    const nonce = uuidv4();
    const abortController = new AbortController();

    document.body.innerHTML = "<div>Test</div>";

    markTourStart(
      nonce,
      {
        id: uuidv4(),
        label: "Test Tour",
        _recipe: null,
      },
      { abortController }
    );

    const promise = brick.run(
      unsafeAssumeValidArg({
        title: "Test",
        body: "**markdown**",
        appearance: { scroll: {} },
      }),
      { logger, root: document.querySelector("div") } as unknown as BlockOptions
    );

    await tick();

    $(document).find(".introjs-donebutton").click();

    await tick();

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    await expect(promise).resolves.toEqual({});
    cancelAllTours();
  });

  it("waits for element to initialize on page", async () => {
    const nonce = uuidv4();
    const abortController = new AbortController();

    document.body.innerHTML = "<div>Test</div>";

    markTourStart(
      nonce,
      {
        id: uuidv4(),
        label: "Test Tour",
        _recipe: null,
      },
      { abortController }
    );

    const promise = brick.run(
      unsafeAssumeValidArg({
        selector: "#foo",
        title: "Test",
        body: "**markdown**",
        appearance: { wait: { maxWaitMillis: 0 } },
      }),
      { logger, root: document } as unknown as BlockOptions
    );

    await tick();

    expect(document.body.innerHTML).toBe("<div>Test</div>");

    // :initialize:
    document.body.innerHTML = '<div id="foo">Foo</div>';

    await tick();

    $(document).find(".introjs-donebutton").click();

    await tick();

    await expect(promise).resolves.toEqual({});
    cancelAllTours();
  });
});

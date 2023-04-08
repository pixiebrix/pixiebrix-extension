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
import { type BlockOptions } from "@/types/runtimeTypes";
import {
  cancelAllTours,
  markTourStart,
} from "@/extensionPoints/tourController";
import { tick } from "@/extensionPoints/extensionPointTestUtils";
import { MultipleElementsFoundError } from "@/errors/businessErrors";
import { showModal } from "@/blocks/transformers/ephemeralForm/modalUtils";
import { showPopover } from "@/blocks/transformers/temporaryInfo/popoverUtils";
import { ensureMocksReset, requestIdleCallback } from "@shopify/jest-dom-mocks";

beforeAll(() => {
  requestIdleCallback.mock();
});

beforeEach(() => {
  ensureMocksReset();
});

Element.prototype.scrollIntoView = jest.fn();
browser.runtime.getURL = jest
  .fn()
  .mockImplementation((path) => `chrome-extension://abc/${path}`);

jest.mock("@/utils/injectStylesheet", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    remove: jest.fn(),
  }),
}));

jest.mock("@/blocks/transformers/ephemeralForm/modalUtils", () => ({
  showModal: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/blocks/transformers/temporaryInfo/popoverUtils", () => ({
  showPopover: jest.fn().mockReturnValue({
    onReady: jest.fn(),
  }),
}));

const logger = new ConsoleLogger({
  extensionId: uuidv4(),
  blueprintId: validateRegistryId("test/tour"),
});

const brick = new TourStepTransformer();

const showModalMock = showModal as jest.MockedFn<typeof showModal>;
const showPopoverMock = showPopover as jest.MockedFn<typeof showPopover>;

function startTour() {
  const nonce = uuidv4();
  const abortController = new AbortController();
  const extensionId = uuidv4();

  markTourStart(
    nonce,
    {
      id: extensionId,
      label: "Test Tour",
      _recipe: null,
    },
    { abortController, context: { extensionId } }
  );

  return { nonce, abortController };
}

function makeOptions({
  root = document,
  signal = undefined,
}: { root?: HTMLElement | Document; signal?: AbortSignal } = {}): BlockOptions {
  return {
    logger,
    root,
    runRendererPipeline: jest.fn().mockResolvedValue(undefined),
    runPipeline: jest.fn().mockImplementation(async () => {
      throw new Error("Not implemented");
    }),
    ctxt: {},
    abortSignal: signal,
  };
}

describe("tourStep", () => {
  beforeEach(() => {
    (Element.prototype.scrollIntoView as jest.Mock).mockReset();
    showModalMock.mockReset();
    showPopoverMock.mockReset();

    showPopoverMock.mockReturnValue({
      onReady: jest.fn(),
    });
  });

  test("isRootAware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  it("requires tour", async () => {
    const promise = brick.run(
      unsafeAssumeValidArg({ title: "Test", body: "**markdown**" }),
      makeOptions()
    );
    await expect(promise).rejects.toThrow(
      "This brick can only be called from a tour"
    );
  });

  it("skippable", async () => {
    document.body.innerHTML = "<div>Test</div>";

    startTour();

    const promise = brick.run(
      unsafeAssumeValidArg({
        title: "Test",
        body: "**markdown**",
        appearance: { skippable: true },
        selector: "button",
      }),
      makeOptions()
    );

    await expect(promise).resolves.toEqual({});

    cancelAllTours();
  });

  it("throws on multiple matches", async () => {
    document.body.innerHTML = "<div><div>Test</div></div>";

    startTour();

    const promise = brick.run(
      unsafeAssumeValidArg({
        title: "Test",
        body: "**markdown**",
        selector: "div",
      }),
      makeOptions()
    );

    await expect(promise).rejects.toThrow(MultipleElementsFoundError);

    cancelAllTours();
  });

  it("renders simple step over document", async () => {
    document.body.innerHTML = "<div>Test</div>";

    const { abortController } = startTour();

    const promise = brick.run(
      unsafeAssumeValidArg({ title: "Test", body: "**markdown**" }),
      makeOptions({ signal: abortController.signal })
    );

    await tick();

    expect(showModalMock).toHaveBeenCalled();

    cancelAllTours();
    await expect(promise).resolves.toEqual({});
  });

  it("highlights element", async () => {
    document.body.innerHTML = "<div>Test</div>";

    const { abortController } = startTour();

    const promise = brick.run(
      unsafeAssumeValidArg({
        title: "Test",
        body: "**markdown**",
        appearance: { highlight: { backgroundColor: "yellow" } },
      }),
      makeOptions({
        root: document.querySelector("div"),
        signal: abortController.signal,
      })
    );

    await tick();

    expect(document.querySelector("div").style.backgroundColor).toBe("yellow");

    await tick();
    expect(showPopoverMock).toHaveBeenCalled();
    cancelAllTours();

    await expect(promise).resolves.toEqual({});

    await tick();

    expect(document.querySelector("div").style.backgroundColor).not.toBe(
      "yellow"
    );
  });

  it("don't scroll to element by default", async () => {
    document.body.innerHTML = "<div>Test</div>";

    const { abortController } = startTour();

    const promise = brick.run(
      unsafeAssumeValidArg({ title: "Test", body: "**markdown**" }),
      makeOptions({
        root: document.querySelector("div"),
        signal: abortController.signal,
      })
    );

    await tick();

    cancelAllTours();

    await expect(promise).resolves.toEqual({});
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls to element", async () => {
    document.body.innerHTML = "<div>Test</div>";

    const { abortController } = startTour();

    const promise = brick.run(
      unsafeAssumeValidArg({
        title: "Test",
        body: "**markdown**",
        appearance: { scroll: {} },
      }),
      makeOptions({
        root: document.querySelector("div"),
        signal: abortController.signal,
      })
    );

    await tick();

    cancelAllTours();

    await expect(promise).resolves.toEqual({});
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("waits for element to initialize on page", async () => {
    document.body.innerHTML = "<div>Test</div>";

    const { abortController } = startTour();

    const promise = brick.run(
      unsafeAssumeValidArg({
        selector: "#foo",
        title: "Test",
        body: "**markdown**",
        appearance: { wait: { maxWaitMillis: 0 } },
      }),
      makeOptions({ signal: abortController.signal })
    );

    await tick();

    expect(document.body.innerHTML).toBe("<div>Test</div>");

    // :initialize:
    document.body.innerHTML = '<div id="foo">Foo</div>';

    requestIdleCallback.runIdleCallbacks();
    // Ticks to allow the setInterval to run
    await tick();
    await tick();

    cancelAllTours();
    await expect(promise).resolves.toEqual({});
  });
});

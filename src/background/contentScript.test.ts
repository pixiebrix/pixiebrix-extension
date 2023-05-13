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

import {
  ensureContentScript,
  initContentScriptReadyListener,
  makeSenderKey,
} from "@/background/contentScript";
import {
  ENSURE_CONTENT_SCRIPT_READY,
  getTargetState,
} from "@/contentScript/ready";
import { injectContentScript } from "webext-content-scripts";
import { getAdditionalPermissions } from "webext-additional-permissions";
import pDefer, { type DeferredPromise } from "p-defer";
import { tick } from "@/extensionPoints/extensionPointTestUtils";

// Unmock because this test is testing injection
jest.unmock("webext-dynamic-content-scripts/distribution/active-tab");

// Can't use setContext("background") because webext-dynamic-content-scripts/distribution/active-tab needs the
// values at module initialization time
jest.mock("webext-detect-page", () => ({
  isBackground: () => true,
}));

jest.mock("@/contentScript/ready", () => {
  const actual = jest.requireActual("@/contentScript/ready");
  return {
    ...actual,
    getTargetState: jest.fn().mockRejectedValue(new Error("Not Implemented")),
  };
});

jest.mock("webext-content-scripts", () => ({
  injectContentScript: jest
    .fn()
    .mockRejectedValue(new Error("Not Implemented")),
}));

jest.mock("webext-additional-permissions", () => ({
  getAdditionalPermissions: jest.fn().mockResolvedValue({ origins: [] }),
}));

let messageListener: any;

const addListenerMock = browser.runtime.onMessage.addListener as jest.Mock;
const getAdditionalPermissionsMock = jest.mocked(getAdditionalPermissions);
const getTargetStateMock = jest.mocked(getTargetState);
const injectContentScriptMock = jest.mocked(injectContentScript);

const RUNTIME_ID = "abc123";

describe("ensureContentScript", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    messageListener = null;

    addListenerMock.mockImplementation((listener: any) => {
      messageListener = listener;
    });

    initContentScriptReadyListener();

    browser.runtime.id = RUNTIME_ID;

    browser.runtime.getManifest = jest.fn().mockReturnValue({
      content_scripts: [
        {
          matches: ["https://*.pixiebrix.com/*"],
          js: ["contentScript.js"],
          css: ["contentScript.css"],
          run_at: "document_idle",
        },
      ],
    });
  });

  it("contentScript already ready", async () => {
    getTargetStateMock.mockResolvedValue({
      url: "https://www.example.com",
      installed: true,
      ready: true,
    });

    const injectPromise = pDefer<void>();
    injectContentScriptMock.mockReturnValue(injectPromise.promise);

    const first = ensureContentScript({ tabId: 1, frameId: 0 });
    const second = ensureContentScript({ tabId: 1, frameId: 0 });

    expect(first).toBe(second);
    await Promise.all([first, second]);

    expect(injectContentScriptMock).not.toHaveBeenCalled();
  });

  it("inject script into new page", async () => {
    getTargetStateMock.mockResolvedValue({
      url: "https://www.example.com",
      installed: false,
      ready: false,
    });

    getAdditionalPermissionsMock.mockResolvedValue({
      origins: [],
      permissions: [],
    });

    const injectPromise = pDefer<void>();
    injectContentScriptMock.mockReturnValue(injectPromise.promise);

    const first = ensureContentScript({ tabId: 1, frameId: 0 });
    const second = ensureContentScript({ tabId: 1, frameId: 0 });
    expect(first).toBe(second);

    injectPromise.resolve();

    messageListener(
      { type: ENSURE_CONTENT_SCRIPT_READY },
      { id: RUNTIME_ID, tab: { id: 1 }, frameId: 0 }
    );
    await Promise.all([first, second]);
  });

  it("wait for script to be ready in page", async () => {
    getTargetStateMock.mockResolvedValue({
      url: "https://www.example.com",
      installed: true,
      ready: false,
    });

    const first = ensureContentScript({ tabId: 1, frameId: 0 });
    const second = ensureContentScript({ tabId: 1, frameId: 0 });
    expect(first).toBe(second);

    messageListener(
      { type: ENSURE_CONTENT_SCRIPT_READY },
      { id: RUNTIME_ID, tab: { id: 1 }, frameId: 0 }
    );
    await Promise.all([first, second]);

    expect(injectContentScriptMock).not.toHaveBeenCalled();
  });

  it("should not inject if site is in additionalPermissions", async () => {
    getTargetStateMock.mockResolvedValue({
      url: "https://www.example.com",
      installed: false,
      ready: false,
    });

    getAdditionalPermissionsMock.mockResolvedValue({
      origins: ["https://www.example.com/*"],
      permissions: [],
    });

    const first = ensureContentScript({ tabId: 1, frameId: 0 });
    const second = ensureContentScript({ tabId: 1, frameId: 0 });
    expect(first).toBe(second);

    messageListener(
      { type: ENSURE_CONTENT_SCRIPT_READY },
      { id: RUNTIME_ID, tab: { id: 1 }, frameId: 0 }
    );
    await Promise.all([first, second]);

    expect(injectContentScriptMock).not.toHaveBeenCalled();
  });

  it("should watch frames independently", async () => {
    // Same URL for each tab
    getTargetStateMock.mockResolvedValue({
      url: "https://www.example.com",
      installed: false,
      ready: false,
    });

    getAdditionalPermissionsMock.mockResolvedValue({
      origins: [],
      permissions: [],
    });

    const injectPromises: Array<DeferredPromise<void>> = [];

    injectContentScriptMock.mockImplementation(async () => {
      const deferred = pDefer<void>();
      injectPromises.push(deferred);
      return deferred.promise;
    });

    let firstFrameReady = false;
    let secondFrameReady = false;

    const firstFrame = ensureContentScript({ tabId: 1, frameId: 1 });
    const secondFrame = ensureContentScript({ tabId: 1, frameId: 2 });
    expect(firstFrame).not.toBe(secondFrame);

    // eslint-disable-next-line promise/prefer-await-to-then -- keep going
    void firstFrame.then(() => {
      firstFrameReady = true;
    });

    // eslint-disable-next-line promise/prefer-await-to-then -- keep going
    void secondFrame.then(() => {
      secondFrameReady = true;
    });

    await tick();
    expect(injectPromises).toHaveLength(2);

    for (const { resolve } of injectPromises) {
      resolve();
    }

    // Messages from other extensions/other things that aren't being awaited
    messageListener(
      { type: ENSURE_CONTENT_SCRIPT_READY },
      { id: "zzz", tab: { id: 1 }, frameId: 1 }
    );
    messageListener(
      { type: ENSURE_CONTENT_SCRIPT_READY },
      { id: RUNTIME_ID, tab: { id: 2 }, frameId: 1 }
    );
    await tick();
    expect(firstFrameReady).toBe(false);
    expect(secondFrameReady).toBe(false);

    messageListener(
      { type: ENSURE_CONTENT_SCRIPT_READY },
      { id: RUNTIME_ID, tab: { id: 1 }, frameId: 1 }
    );

    await tick();
    expect(firstFrameReady).toBe(true);
    expect(secondFrameReady).toBe(false);

    messageListener(
      { type: ENSURE_CONTENT_SCRIPT_READY },
      { id: RUNTIME_ID, tab: { id: 1 }, frameId: 2 }
    );

    await tick();
    expect(firstFrameReady).toBe(true);
    expect(secondFrameReady).toBe(true);

    await Promise.all([firstFrame, secondFrame]);
  });
});

describe("makeSenderKey", () => {
  it("handles non-tab message", () => {
    expect(makeSenderKey({ id: RUNTIME_ID })).toBe("{}");
  });
});

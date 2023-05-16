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

import { getDocument, tick } from "@/extensionPoints/extensionPointTestUtils";
import { awaitElementOnce } from "@/extensionPoints/helpers";
import { ensureMocksReset, requestIdleCallback } from "@shopify/jest-dom-mocks";

beforeAll(() => {
  requestIdleCallback.mock();
});

beforeEach(() => {
  ensureMocksReset();
});

describe("awaitElementOnce", () => {
  it("finds change in ancestor", async () => {
    document.body.innerHTML = getDocument(
      '<div id="root"><div id="menu"></div></div>'
    ).body.innerHTML;
    const [promise] = awaitElementOnce(".newClass #menu");
    document.querySelector("#root").classList.add("newClass");

    requestIdleCallback.runIdleCallbacks();
    await tick();

    await expect(promise).resolves.toHaveLength(1);
  });

  it("finds change in ancestor with :has", async () => {
    document.body.innerHTML = getDocument(
      '<div id="root"><h1>Foo</h1><div id="menu"></div></div>'
    ).body.innerHTML;
    const [promise] = awaitElementOnce('#root:has(h1:contains("Bar")) #menu');
    document.querySelector("h1").textContent = "Bar";

    requestIdleCallback.runIdleCallbacks();
    await tick();

    await expect(promise).resolves.toHaveLength(1);
  });

  it("finds button within modal content", async () => {
    // Mimics targeting the LinkedIn modal

    document.body.innerHTML = getDocument(
      '<div id="root"></div>'
    ).body.innerHTML;

    const [promise] = awaitElementOnce(
      'div[data-test-modal-id="send-invite-modal"] div:has(>button[aria-label="Cancel adding a note"])'
    );

    $("#root").append(
      '<div data-test-modal-id="send-invite-modal"><div></div></div>'
    );
    requestIdleCallback.runIdleCallbacks();
    await tick();

    $("[data-test-modal-id] div").append(
      '<button aria-label="Cancel adding a note"></button>'
    );
    requestIdleCallback.runIdleCallbacks();
    await tick();

    await expect(promise).resolves.toHaveLength(1);
  });
});

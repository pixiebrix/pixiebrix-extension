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

import { renderHook } from "@/extensionConsole/testHelpers";
import useSetDocumentTitle from "./useSetDocumentTitle";

const TEST_TITLE = "Test Page";

describe("useSetDocumentTitle", () => {
  let originalTitle: string;

  beforeAll(() => {
    originalTitle = document.title;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it("updates the document title properly", () => {
    renderHook(() => {
      useSetDocumentTitle(TEST_TITLE);
    });
    // The hook adds a suffix to the title, so we assert with toStartWith()
    expect(document.title).toStartWith(TEST_TITLE);
  });

  it("cleans up the title when unmounted", () => {
    const { unmount } = renderHook(() => {
      useSetDocumentTitle(TEST_TITLE);
    });
    // The hook adds a suffix to the title, so we assert with toStartWith()
    expect(document.title).toStartWith(TEST_TITLE);
    unmount();
    expect(document.title).toEqual(originalTitle);
  });
});

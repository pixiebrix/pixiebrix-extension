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

import { shortcutSnippetMenuSlice } from "@/contentScript/shortcutSnippetMenu/shortcutSnippetMenuSlice";
import { type ShortcutSnippet } from "@/platform/platformTypes/shortcutSnippetMenuProtocol";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";

describe("shortcutSnippetMenuSlice", () => {
  it.each(["test", "TeSt"])("case matches query: %s", (query) => {
    const shortcutSnippet: ShortcutSnippet = {
      componentId: autoUUIDSequence(),
      shortcut: "test",
      title: "Test",
      handler: jest.fn(),
    };

    expect(
      shortcutSnippetMenuSlice.reducer(
        undefined,
        shortcutSnippetMenuSlice.actions.search({
          query,
          shortcutSnippets: [shortcutSnippet],
        }),
      ),
    ).toStrictEqual({
      activeShortcutSnippet: null,
      query,
      results: [shortcutSnippet],
      selectedIndex: 0,
    });
  });
});

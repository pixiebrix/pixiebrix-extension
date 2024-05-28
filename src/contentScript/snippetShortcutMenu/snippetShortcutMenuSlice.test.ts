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

import { snippetShortcutMenuSlice } from "@/contentScript/snippetShortcutMenu/snippetShortcutMenuSlice";
import { type SnippetShortcut } from "@/platform/platformTypes/snippetShortcutMenuProtocol";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";

describe("snippetShortcutMenuSlice", () => {
  it.each(["test", "TeSt"])("case matches query: %s", (query) => {
    const snippetShortcut: SnippetShortcut = {
      componentId: autoUUIDSequence(),
      context: {},
      shortcut: "test",
      title: "Test",
      handler: jest.fn(),
    };

    expect(
      snippetShortcutMenuSlice.reducer(
        undefined,
        snippetShortcutMenuSlice.actions.search({
          query,
          snippetShortcuts: [snippetShortcut],
        }),
      ),
    ).toStrictEqual({
      activeSnippetShortcut: null,
      query,
      results: [snippetShortcut],
      selectedIndex: 0,
    });
  });
});

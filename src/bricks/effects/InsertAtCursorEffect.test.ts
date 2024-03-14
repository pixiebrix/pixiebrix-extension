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

import InsertAtCursorEffect from "@/bricks/effects/InsertAtCursorEffect";

const brick = new InsertAtCursorEffect();

// The brick's functionality will need to be tested in a browser environment `jsdom` doesn't support
// document.execCommand, which is used by text-field-edit under the hood, and for
// contenteditable elements.

describe("InsertAtCursorEffect", () => {
  it("is root-aware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(false);
  });
});

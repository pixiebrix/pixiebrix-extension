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

import DocumentReader from "@/blocks/readers/DocumentReader";

const brick = new DocumentReader();

describe("DocumentReader", () => {
  it("reads current title", async () => {
    document.head.innerHTML =
      '<title>Original</title><link rel="canonical" href="https://example.com" />';
    window.location.assign("https://example.com");

    await expect(brick.read()).resolves.toStrictEqual({
      timestamp: expect.toBeDateString(),
      url: expect.toBeString(),
      title: "Original",
    });

    document.title = "New Title";

    await expect(brick.read()).resolves.toStrictEqual({
      timestamp: expect.toBeDateString(),
      url: expect.toBeString(),
      title: "New Title",
    });
  });
});

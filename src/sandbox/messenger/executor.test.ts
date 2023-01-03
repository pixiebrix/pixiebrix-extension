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

import { renderNunjucksTemplate } from "@/sandbox/messenger/executor";
import { InvalidTemplateError } from "@/errors/businessErrors";

describe("renderNunjucksTemplate", () => {
  it("handles template", async () => {
    await expect(
      renderNunjucksTemplate({
        template: "{{ hello }}",
        context: { hello: "world" },
        autoescape: false,
      })
    ).resolves.toBe("world");
  });

  it("handles malformed template", async () => {
    await expect(
      renderNunjucksTemplate({
        template: "{{ hello",
        context: { hello: "world" },
        autoescape: false,
      })
    ).rejects.toThrow(InvalidTemplateError);
  });

  it("handles non-nunjucks error", async () => {
    jest.doMock("@/sandbox/messenger/executor", () => ({
      renderString: jest.fn().mockImplementation(() => {
        throw new Error("test");
      }),
    }));

    await expect(
      renderNunjucksTemplate({
        template: "{{ hello",
        context: { hello: "world" },
        autoescape: false,
      })
    ).rejects.toThrow(Error);

    jest.resetAllMocks();
  });
});

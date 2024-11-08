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

import HtmlRenderer from "./HtmlRenderer";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

const brick = new HtmlRenderer();

// OneDrive embed iframe: https://support.microsoft.com/en-au/office/embed-files-directly-into-your-website-or-blog-ed07dd52-8bdb-431d-96a5-cbe8a80b7418
const oneDriveEmbedFrame =
  '<iframe src="https://pixiebrixoffice-my.sharepoint.com/personal/todd_pixiebrixoffice_onmicrosoft_com/_layouts/15/embed.aspx?UniqueId=43f4044d-69bc-4daf-890b-1623cc32e75e" width="640" height="360" frameborder="0" scrolling="no" allowfullscreen title="7-cat-png-image-download-picture-kitten.png"></iframe>';

describe("html renderer", () => {
  it("sanitizes HTML", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({
        html: "<h1><foo>hello</foo></h1>",
      }),
      brickOptionsFactory(),
    );

    expect(result).toBe("<h1>hello</h1>");
  });

  it.each([undefined, false])(
    "sanitizes HTML with iframe when allowIframes: %s",
    async (allowIFrames) => {
      const result = await brick.run(
        unsafeAssumeValidArg({
          html: oneDriveEmbedFrame,
          allowIFrames,
        }),
        brickOptionsFactory(),
      );

      expect(result).toBe("");
    },
  );

  it("allows HTML with iframe when allowIFrames: true", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({
        html: oneDriveEmbedFrame,
        allowIFrames: true,
      }),
      brickOptionsFactory(),
    );

    // Sanitization re-orders attributes, so we can't compare the strings directly.
    const original = $(oneDriveEmbedFrame);
    const sanitized = $(result);
    expect(sanitized).toEqual(original);
  });
});

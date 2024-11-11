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

import React from "react";
import MarkdownRenderer from "@/bricks/renderers/MarkdownRenderer";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { render, screen } from "@testing-library/react";

const brick = new MarkdownRenderer();

// OneDrive embed iframe: https://support.microsoft.com/en-au/office/embed-files-directly-into-your-website-or-blog-ed07dd52-8bdb-431d-96a5-cbe8a80b7418
const oneDriveEmbedFrame =
  '<iframe src="https://pixiebrixoffice-my.sharepoint.com/personal/todd_pixiebrixoffice_onmicrosoft_com/_layouts/15/embed.aspx?UniqueId=43f4044d-69bc-4daf-890b-1623cc32e75e" width="640" height="360" frameborder="0" scrolling="no" allowfullscreen title="7-cat-png-image-download-picture-kitten.png"></iframe>';

describe("MarkdownRenderer", () => {
  it("should render markdown", async () => {
    const { Component, props } = await brick.render(
      unsafeAssumeValidArg({ markdown: "# Hello" }),
    );
    render(<Component {...props} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Hello",
    );
  });

  it.each([undefined, false])(
    "should strip iframe when allowIFrames: %s",
    async (allowIFrames) => {
      const { Component, props } = await brick.render(
        unsafeAssumeValidArg({ markdown: oneDriveEmbedFrame, allowIFrames }),
      );
      render(<Component {...props} />);
      expect(
        screen.queryByTitle("7-cat-png-image-download-picture-kitten.png"),
      ).not.toBeInTheDocument();
    },
  );

  it("should include iframe when allowIFrames: true", async () => {
    const { Component, props } = await brick.render(
      unsafeAssumeValidArg({
        markdown: oneDriveEmbedFrame,
        allowIFrames: true,
      }),
    );
    render(<Component {...props} />);
    expect(
      screen.getByTitle("7-cat-png-image-download-picture-kitten.png"),
    ).toBeInTheDocument();
  });
});

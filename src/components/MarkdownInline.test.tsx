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
import { render } from "@testing-library/react";
import React from "react";
import MarkdownInline from "@/components/MarkdownInline";

describe("MarkdownInline", () => {
  it("renders without p tag", () => {
    const wrapper = render(
      <MarkdownInline
        markdown="**Hello** World"
        sanitizeConfig={{
          ALLOWED_TAGS: ["strong"],
        }}
      />
    );
    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it("linkifies text", () => {
    const wrapper = render(
      <MarkdownInline
        markdown="**Hello** https://www.example.com"
        sanitizeConfig={{
          ALLOWED_TAGS: ["strong", "a"],
        }}
      />
    );
    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});

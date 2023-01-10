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

import React from "react";
import { render } from "@testing-library/react";
import LinkifiedString from "./LinkifiedString";

describe("LinkifiedString", () => {
  test("linkifies string", async () => {
    const rendered = render(
      <LinkifiedString>https://example.com and more</LinkifiedString>
    );

    expect(rendered.asFragment()).toMatchSnapshot();
  });
  test("ignores string without links", async () => {
    const rendered = render(
      <LinkifiedString>Here’s regular text</LinkifiedString>
    );

    expect(rendered.asFragment()).toMatchSnapshot();
  });
  test("ignores empty string", async () => {
    const rendered = render(<LinkifiedString>{""}</LinkifiedString>);

    expect(rendered.asFragment()).toMatchSnapshot();
  });
  test("ignores non-string children", async () => {
    const rendered = render(
      <LinkifiedString>
        Half<a href="https://example.com">linked</a>
      </LinkifiedString>
    );

    expect(rendered.asFragment()).toMatchSnapshot();
  });
  test("ignores missing children", async () => {
    const rendered = render(<LinkifiedString />);

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});

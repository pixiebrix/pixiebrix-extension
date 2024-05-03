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
import { fireEvent, render, screen } from "@testing-library/react";
import { Stylesheets } from "./Stylesheets";

it("renders the children immediately when no stylesheets are provided", () => {
  render(
    <Stylesheets href={[]}>
      <div>hello</div>
    </Stylesheets>,
  );

  expect(screen.getByText("hello")).toBeInTheDocument();
});

it("renders the children after the stylesheet is loaded", () => {
  const { container } = render(
    <Stylesheets href="https://example.com/style.css">
      <button>Buy flowers</button>
    </Stylesheets>,
  );

  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- Not a visible element
  const stylesheet = container.querySelector("link")!;
  expect(stylesheet).toHaveAttribute("href", "https://example.com/style.css");

  // It should be in the document but not visible
  expect(screen.getByText("Buy flowers")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();

  fireEvent.load(stylesheet);

  // Now it should be visible
  expect(screen.getByRole("button")).toBeInTheDocument();
});

it("renders the children after the stylesheet is loaded when multiple stylesheets are provided", () => {
  const { container } = render(
    <Stylesheets
      href={[
        "https://example.com/style1.css",
        "https://example.com/style2.css",
      ]}
    >
      <button>Download a car</button>
    </Stylesheets>,
  );

  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- Not a visible element
  const stylesheets = container.querySelectorAll("link") as unknown as [
    HTMLLinkElement,
    HTMLLinkElement,
  ];
  expect(stylesheets).toHaveLength(2);
  expect(stylesheets[0]).toHaveAttribute(
    "href",
    "https://example.com/style1.css",
  );
  expect(stylesheets[1]).toHaveAttribute(
    "href",
    "https://example.com/style2.css",
  );

  expect(screen.queryByRole("button")).not.toBeInTheDocument();

  fireEvent.load(stylesheets[0]);
  fireEvent.load(stylesheets[1]);

  // Now it should be visible
  expect(screen.getByRole("button")).toBeInTheDocument();
});

it("renders the children immediately even when the loading of the stylesheet fails", () => {
  const { container } = render(
    <Stylesheets href="https://example.com/style.css">
      <button>Eject floppy</button>
    </Stylesheets>,
  );

  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- Not a visible element
  const stylesheet = container.querySelector("link")!;
  expect(stylesheet).not.toBeNull();
  expect(stylesheet).toHaveAttribute("href", "https://example.com/style.css");

  expect(screen.queryByRole("button")).not.toBeInTheDocument();

  fireEvent.error(stylesheet);

  // It should show anyway
  expect(screen.getByRole("button")).toBeInTheDocument();
});

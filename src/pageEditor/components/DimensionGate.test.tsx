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
import { render } from "@/pageEditor/testHelpers";
import DimensionGate from "@/pageEditor/components/DimensionGate";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Simulate window resize event: https://gist.github.com/javierarques/d95948ac7e9ddc8097612866ecc63a4b#file-jsdom-helper-js
const resizeEvent = document.createEvent("Event");
resizeEvent.initEvent("resize", true, true);

global.window.resizeTo = (width, height) => {
  global.window.innerWidth = width || global.window.innerWidth;
  global.window.innerHeight = height || global.window.innerHeight;
  global.window.dispatchEvent(resizeEvent);
};

describe("Dimension Gate", () => {
  it("shows content in landscape mode", async () => {
    render(
      <DimensionGate>
        <div>foo</div>
      </DimensionGate>,
    );
    expect(screen.getByText("foo")).toBeInTheDocument();
  });

  it("shows dismissible warning in portrait mode", async () => {
    window.resizeTo(400, 800);

    render(
      <DimensionGate>
        <div>foo</div>
      </DimensionGate>,
    );

    expect(screen.queryByText("foo")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss Warning" }),
    );

    expect(screen.getByText("foo")).toBeInTheDocument();
  });
});

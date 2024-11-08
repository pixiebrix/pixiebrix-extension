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

import { render } from "@/pageEditor/testHelpers";
import React from "react";
import ConnectedCollapsibleFieldSection from "@/pageEditor/fields/ConnectedCollapsibleFieldSection";
import { screen } from "@testing-library/react";

// :shrug: toBeVisible checks currently don't work with our CollapsibleFieldSection component because we're using
// we're using Collapse from react-bootstrap, which uses CSS to set display: none. RTL/jest-dom doesn't have access
// to the css.

describe("ConnectedCollapsibleFieldSection", () => {
  it("should render collapsed by default", () => {
    render(
      <ConnectedCollapsibleFieldSection title="Test Section">
        <div>foo</div>
      </ConnectedCollapsibleFieldSection>,
    );

    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("should render expanded", () => {
    render(
      <ConnectedCollapsibleFieldSection title="Test Section" initialExpanded>
        <div>foo</div>
      </ConnectedCollapsibleFieldSection>,
    );

    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });
});

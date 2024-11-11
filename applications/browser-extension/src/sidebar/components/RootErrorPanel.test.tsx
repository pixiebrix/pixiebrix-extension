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

import { render, screen } from "@/sidebar/testHelpers";
import { BusinessError, NoRendererError } from "@/errors/businessErrors";
import RootErrorPanel from "@/sidebar/components/RootErrorPanel";

describe("RootErrorPanel", () => {
  it("should render business error", () => {
    const expectedErrorMessage = "Business error message";
    const { asFragment } = render(
      <RootErrorPanel error={new BusinessError(expectedErrorMessage)} />,
    );
    expect(screen.getByText(expectedErrorMessage)).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it("should render application error", () => {
    const expectedErrorMessage = "Application error message";
    const { asFragment } = render(
      <RootErrorPanel error={new Error(expectedErrorMessage)} />,
    );
    expect(screen.getByText(expectedErrorMessage)).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it("should render no renderer error", () => {
    const { asFragment } = render(
      <RootErrorPanel error={new NoRendererError()} />,
    );
    expect(screen.getByText("No renderer found")).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });
});

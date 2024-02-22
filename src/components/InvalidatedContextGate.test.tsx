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

import { render, screen } from "@testing-library/react";
import React from "react";
import InvalidatedContextGate from "./InvalidatedContextGate";
import useContextInvalidated from "@/hooks/useContextInvalidated";

jest.mock("@/hooks/useContextInvalidated");

const useContextInvalidatedMock = jest.mocked(useContextInvalidated);

describe("InvalidatedContextGate", () => {
  it("renders children when context is not invalidated", () => {
    render(
      <InvalidatedContextGate contextNameTitleCase="Test Page">
        <p>Welcome to my YouTube channel</p>
      </InvalidatedContextGate>,
    );

    expect(
      screen.getByText("Welcome to my YouTube channel"),
    ).toBeInTheDocument();
  });

  it("renders message and reload button when context is invalidated", () => {
    useContextInvalidatedMock.mockReturnValueOnce(true);

    render(
      <InvalidatedContextGate contextNameTitleCase="Test Page">
        M’illumino d’immenso
      </InvalidatedContextGate>,
    );
    expect(
      screen.getByText(
        "PixieBrix was updated or restarted. Reload the test page to continue.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Reload Test Page")).toBeInTheDocument();
  });
});

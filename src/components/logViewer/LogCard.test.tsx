/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { LogEntry } from "@/background/logging";
import { render } from "@testing-library/react";
import React from "react";
import { LogCard } from "./LogCard";

const defaultProps = {
  isLoading: false,
  availableEntries: [] as LogEntry[],
  entries: [] as LogEntry[],
  refreshEntries: jest.fn(),
  clearAvailableEntries: jest.fn(),
};

test("shows loader", () => {
  const rendered = render(<LogCard {...defaultProps} isLoading />);

  expect(rendered.getByTestId("loader")).toBeInTheDocument();
});

test("renders empty table", () => {
  const rendered = render(<LogCard {...defaultProps} />);

  expect(rendered.asFragment()).toMatchSnapshot();
});

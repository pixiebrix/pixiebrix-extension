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
import { render, screen } from "@testing-library/react";
import AbortSignalGate from "./AbortSignalGate";

it("renders the children when active and hides them when aborted", () => {
  const controller = new AbortController();
  const { rerender } = render(
    <AbortSignalGate signal={controller.signal}>
      <div>Content</div>
    </AbortSignalGate>,
  );
  expect(screen.getByText("Content")).toBeInTheDocument();

  controller.abort();
  rerender(
    <AbortSignalGate signal={controller.signal}>
      <div>Content</div>
    </AbortSignalGate>,
  );
  expect(screen.queryByText("Content")).not.toBeInTheDocument();
});

it("does not render children when the signal is already aborted", () => {
  render(
    <AbortSignalGate signal={AbortSignal.abort()}>
      <div>Content</div>
    </AbortSignalGate>,
  );
  expect(screen.queryByText("Content")).not.toBeInTheDocument();
});

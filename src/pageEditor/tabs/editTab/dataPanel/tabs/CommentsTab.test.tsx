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
import CommentsTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/CommentsTab";
import { render, screen } from "@/pageEditor/testHelpers";

describe("CommentsTab", () => {
  it("renders comments", () => {
    render(<CommentsTab fieldName="foo" />);
    expect(screen.getByText("foo")).toBeInTheDocument();
  });

  it.each([undefined, ""])("renders message when no comments", (comments) => {
    render(<CommentsTab fieldName="foo" />);
    expect(
      screen.getByPlaceholderText("No comments available"),
    ).toBeInTheDocument();
  });
});

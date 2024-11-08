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
import CollapsibleFieldSection from "@/pageEditor/fields/CollapsibleFieldSection";
import React from "react";
import userEvent from "@testing-library/user-event";

describe("CollapsibleFieldSection", () => {
  it("does not toggle on input click in header", async () => {
    const onToggle = jest.fn();

    render(
      <CollapsibleFieldSection
        title={<input name="foo" />}
        toggleExpanded={onToggle}
        expanded={true}
      />,
    );

    await userEvent.click(screen.getByRole("textbox"));

    expect(onToggle).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("img", { hidden: true }));

    expect(onToggle).toHaveBeenCalled();
  });
});

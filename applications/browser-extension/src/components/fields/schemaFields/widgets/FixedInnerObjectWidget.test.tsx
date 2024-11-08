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

import { render, screen } from "../../../../pageEditor/testHelpers";
import React from "react";
import FixedInnerObjectWidget from "./FixedInnerObjectWidget";
import { type Schema } from "../../../../types/schemaTypes";
import registerDefaultWidgets from "./registerDefaultWidgets";

beforeAll(() => {
  registerDefaultWidgets();
});

describe("FixedInnerObjectWidget", () => {
  it("bail on allOf", () => {
    render(<FixedInnerObjectWidget name="test" schema={{ allOf: [] }} />);
    expect(
      screen.getByDisplayValue("Use Workshop to edit"),
    ).toBeInTheDocument();
  });

  it("handle simple object", () => {
    const schema = {
      type: "object",
      properties: { foo: { type: "string" } },
    } as Schema;
    const { asFragment } = render(
      <FixedInnerObjectWidget name="test" schema={schema} />,
      {
        initialValues: { test: { foo: "bar" } },
      },
    );
    expect(screen.queryByDisplayValue("Use Workshop to edit")).toBeNull();
    expect(asFragment()).toMatchSnapshot();
  });

  it("handle oneOf object", () => {
    const schema = {
      oneOf: [
        { type: "object", properties: { foo: { type: "string" } } },
        { type: "string" },
      ],
    } as Schema;
    const { asFragment } = render(
      <FixedInnerObjectWidget name="test" schema={schema} />,
      {
        initialValues: { test: { foo: "bar" } },
      },
    );
    expect(screen.queryByDisplayValue("Use Workshop to edit")).toBeNull();
    expect(asFragment()).toMatchSnapshot();
  });
});

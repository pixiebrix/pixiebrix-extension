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

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectToggleMode"] }] -- TODO: replace with native expect and it.each */

import React from "react";
import { type Schema } from "../../../types/schemaTypes";
import { render, screen } from "../../../pageEditor/testHelpers";
import RemoteSchemaObjectField from "./RemoteSchemaObjectField";
import { expectToggleOptions } from "./testHelpers";
import registerDefaultWidgets from "./widgets/registerDefaultWidgets";
import {
  errorToAsyncState,
  loadingAsyncStateFactory,
  valueToAsyncState,
} from "../../../utils/asyncStateUtils";

beforeAll(() => {
  registerDefaultWidgets();
});

describe("RemoteSchemaObjectField", () => {
  const expectToggleMode = async (toggleTestId: string, mode: string) => {
    const toggle = await screen.findByTestId(toggleTestId);
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("data-test-selected", mode);
  };

  test("renders object schema", async () => {
    const name = "test";
    const schema: Schema = {
      type: "object",
      properties: {
        InputValue: { type: "string", description: "A string input value" },
        OtherInput: {
          type: "string",
          title: "Another Input Value",
          description: "Another input",
        },
      },
      required: ["InputValue"],
    };
    render(
      <RemoteSchemaObjectField
        name={name}
        heading="Test Field"
        remoteSchemaState={valueToAsyncState(schema)}
      />,
      {
        initialValues: {
          test: {
            InputValue: "test_input_value",
          },
        },
      },
    );

    const toggleTestId = `toggle-${name}.InputValue`;
    await expectToggleMode(toggleTestId, "Text");
    await expectToggleOptions(toggleTestId, ["string", "var"]);

    const input = screen.getByLabelText("InputValue");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("test_input_value");
    expect(screen.getByText("A string input value")).toBeInTheDocument();

    const otherToggleTestId = `toggle-${name}.OtherInput`;
    await expectToggleMode(otherToggleTestId, "Exclude");
    await expectToggleOptions(otherToggleTestId, ["string", "var", "omit"]);

    const otherInput = screen.getByLabelText("Another Input Value");
    expect(otherInput).toBeInTheDocument();
    expect(screen.getByText("Another input")).toBeInTheDocument();
  });

  test("renders loader", async () => {
    const name = "test";
    render(
      <RemoteSchemaObjectField
        name={name}
        heading="Test Field"
        remoteSchemaState={loadingAsyncStateFactory()}
      />,
      {
        initialValues: {},
      },
    );

    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  test("renders error", async () => {
    const name = "test";
    render(
      <RemoteSchemaObjectField
        name={name}
        heading="Test Field"
        remoteSchemaState={errorToAsyncState(new Error("Test error"))}
      />,
      {
        initialValues: {},
      },
    );

    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  test("renders empty schema", async () => {
    const name = "test";
    const schema: Schema = {
      type: "object",
      properties: {},
    };
    render(
      <RemoteSchemaObjectField
        name={name}
        heading="Test Field"
        remoteSchemaState={valueToAsyncState(schema)}
      />,
      {
        initialValues: {},
      },
    );

    expect(screen.getByText("No parameters")).toBeInTheDocument();
  });
});

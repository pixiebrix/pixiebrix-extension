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

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectToggleOptions", "expectTab1Selected", "expectTab2Selected"] }]
-- TODO: replace with native expect and it.each */

import React from "react";
import { expectToggleOptions } from "@/components/fields/schemaFields/testHelpers";
import { render } from "@/pageEditor/testHelpers";
import TabField from "@/contrib/google/sheets/ui/TabField";
import { waitForEffect } from "@/testUtils/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { type Spreadsheet } from "@/contrib/google/sheets/core/types";
import { screen } from "@testing-library/react";
import { selectSchemaFieldInputMode } from "@/testUtils/formHelpers";
import userEvent from "@testing-library/user-event";
import { toExpression } from "@/utils/expressionUtils";

beforeAll(() => {
  registerDefaultWidgets();
});

const TEST_SPREADSHEET: Spreadsheet = {
  spreadsheetId: "testId",
  properties: {
    title: "Test Spreadsheet",
  },
  sheets: [
    {
      properties: {
        sheetId: 123,
        title: "Tab1",
      },
    },
    {
      properties: {
        sheetId: 456,
        title: "Tab2",
      },
    },
  ],
};

function expectTab1Selected() {
  expect(screen.getByText("Tab1")).toBeVisible();
  expect(screen.queryByText("Tab2")).not.toBeInTheDocument();
}

function expectTab2Selected() {
  expect(screen.getByText("Tab2")).toBeVisible();
  expect(screen.queryByText("Tab1")).not.toBeInTheDocument();
}

describe("TabField", () => {
  it("Renders select and variable toggle options", async () => {
    render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
      {
        initialValues: {
          tabName: "",
        },
      },
    );

    await waitForEffect();

    await expectToggleOptions("toggle-tabName", ["select", "string", "var"]);
  });

  it("defaults to the first tab name when value is null literal", async () => {
    render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
      {
        initialValues: {
          tabName: null,
        },
      },
    );

    await waitForEffect();

    expectTab1Selected();
  });

  it("defaults to the first tab name when value is empty nunjucks expression", async () => {
    render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
      {
        initialValues: {
          tabName: toExpression("nunjucks", ""),
        },
      },
    );

    await waitForEffect();

    expectTab1Selected();
  });

  test("given invalid tabName, when input is focused, then does not change the value", async () => {
    const { rerender } = render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
      {
        initialValues: {
          tabName: null,
        },
      },
    );

    await waitForEffect();

    expectTab1Selected();

    // Change field to text and type something
    await selectSchemaFieldInputMode("tabName", "string");
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "InvalidTab");

    // Change spreadsheet
    rerender(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={{
          ...TEST_SPREADSHEET,
          sheets: [
            {
              properties: {
                sheetId: 123,
                title: "Foo",
              },
            },
            {
              properties: {
                sheetId: 456,
                title: "Bar",
              },
            },
          ],
        }}
      />,
    );

    await waitForEffect();

    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
    expect(screen.getByText("InvalidTab")).toBeVisible();
  });

  test("given string tabName value, when spreadsheet changes, then updates the value", async () => {
    const { rerender } = render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
      {
        initialValues: {
          tabName: null,
        },
      },
    );

    await waitForEffect();

    expectTab1Selected();

    // Change spreadsheet
    rerender(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={{
          ...TEST_SPREADSHEET,
          sheets: [
            {
              properties: {
                sheetId: 123,
                title: "Foo",
              },
            },
            {
              properties: {
                sheetId: 456,
                title: "Bar",
              },
            },
          ],
        }}
      />,
    );

    await waitForEffect();

    // Should have selected first tab automatically
    expect(screen.queryByText("Tab1")).not.toBeInTheDocument();
    expect(screen.getByText("Foo")).toBeVisible();
  });

  test("given non-empty expression tabName value, when spreadsheet changes, does not clear the value", async () => {
    const { rerender, container } = render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
      {
        initialValues: {
          tabName: null,
        },
      },
    );

    await waitForEffect();

    expectTab1Selected();

    // Change field to text and type something
    await selectSchemaFieldInputMode("tabName", "string");
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "InvalidTab");

    // Clear input focus
    await userEvent.click(container);

    // Change spreadsheet
    rerender(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={{
          ...TEST_SPREADSHEET,
          sheets: [
            {
              properties: {
                sheetId: 123,
                title: "Foo",
              },
            },
            {
              properties: {
                sheetId: 456,
                title: "Bar",
              },
            },
          ],
        }}
      />,
    );

    await waitForEffect();

    // Should have selected first tab automatically
    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
    expect(screen.getByText("InvalidTab")).toBeVisible();
  });

  test("given empty expression tabName value, when spreadsheet changes, then updates the value", async () => {
    const { rerender, container } = render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
      {
        initialValues: {
          tabName: null,
        },
      },
    );

    await waitForEffect();

    expectTab1Selected();

    // Change field to text and clear the input
    await selectSchemaFieldInputMode("tabName", "string");
    await userEvent.clear(screen.getByRole("textbox"));

    // Clear input focus
    await userEvent.click(container);

    // Change spreadsheet
    rerender(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={{
          ...TEST_SPREADSHEET,
          sheets: [
            {
              properties: {
                sheetId: 123,
                title: "Foo",
              },
            },
            {
              properties: {
                sheetId: 456,
                title: "Bar",
              },
            },
          ],
        }}
      />,
    );

    await waitForEffect();

    // Should have selected first tab automatically
    expect(screen.queryByText("Tab1")).not.toBeInTheDocument();
    expect(screen.getByText("Foo")).toBeVisible();
  });

  test("given string tabName value, when spreadsheet changes to null, then does not update the value", async () => {
    const { rerender } = render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
      {
        initialValues: {
          tabName: "Tab2",
        },
      },
    );

    await waitForEffect();

    expectTab2Selected();

    // Change spreadsheet
    rerender(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={null}
      />,
    );

    await waitForEffect();

    // Tab name should not be cleared yet
    expectTab2Selected();
  });

  test("given string tabName value, when spreadsheet changes to null and back to the same spreadsheet, should not reset the value", async () => {
    const { rerender } = render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
      {
        initialValues: {
          tabName: "Tab2",
        },
      },
    );

    await waitForEffect();

    expectTab2Selected();

    // Change spreadsheet to null (simulate google login)
    rerender(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={null}
      />,
    );

    await waitForEffect();

    // Tab name should not be cleared yet
    expectTab2Selected();

    // Change spreadsheet back
    rerender(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheet={TEST_SPREADSHEET}
      />,
    );

    await waitForEffect();

    // Tab2 should still be selected
    expectTab2Selected();
  });
});

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
import { expectToggleOptions } from "@/components/fields/schemaFields/fieldTestUtils";
import { render } from "@/pageEditor/testHelpers";
import TabField from "@/contrib/google/sheets/TabField";
import { waitForEffect } from "@/testUtils/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { sheets } from "@/background/messenger/api";
import { makeTemplateExpression } from "@/runtime/expressionCreators";
import { FormErrorContext } from "@/components/form/FormErrorContext";

jest.mock("@/background/messenger/api", () => ({
  sheets: {
    getTabNames: jest.fn().mockResolvedValue(["Tab1", "Tab2"]),
  },
}));

const getTabNamesMock = sheets.getTabNames as jest.MockedFunction<
  typeof sheets.getTabNames
>;

beforeAll(() => {
  registerDefaultWidgets();
});

describe("TabField", () => {
  it("Renders select and variable toggle options", async () => {
    const rendered = render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheetId={"testId"}
      />,
      {
        initialValues: {
          tabName: "",
        },
      }
    );

    await waitForEffect();

    await expectToggleOptions(rendered.container, ["select", "string", "var"]);
  });

  it("defaults to the first tab name when value is null literal", async () => {
    const rendered = render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheetId={"testId"}
      />,
      {
        initialValues: {
          tabName: null,
        },
      }
    );

    await waitForEffect();

    // Should have defaulted
    expect(rendered.queryByText("Select...")).not.toBeInTheDocument();
    expect(rendered.queryByText("Tab1")).toBeInTheDocument();
  });

  it("defaults to the first tab name when value is nunjucks expression", async () => {
    const rendered = render(
      <TabField
        name="tabName"
        schema={{}} // Does not currently check the passed-in schema
        spreadsheetId={"testId"}
      />,
      {
        initialValues: {
          tabName: makeTemplateExpression("nunjucks", ""),
        },
      }
    );

    await waitForEffect();

    // Should have defaulted
    expect(rendered.queryByText("Select...")).not.toBeInTheDocument();
    expect(rendered.queryByText("Tab1")).toBeInTheDocument();
  });

  it("shows error message", async () => {
    getTabNamesMock.mockRejectedValue(new Error("Test error"));

    const rendered = render(
      <FormErrorContext.Provider
        value={{
          shouldUseAnalysis: false,
          showUntouchedErrors: true,
          showFieldActions: false,
        }}
      >
        <TabField
          name="tabName"
          schema={{}} // Does not currently check the passed-in schema
          spreadsheetId={"testId"}
        />
      </FormErrorContext.Provider>,
      {
        initialValues: {
          tabName: makeTemplateExpression("nunjucks", ""),
        },
      }
    );

    await waitForEffect();

    // Should have defaulted
    expect(rendered.queryByText("Select...")).not.toBeInTheDocument();

    // XXX: can this do partial matches? In any case, it's not in the document
    expect(
      rendered.getByText("Error loading tab names: Test error")
    ).toBeVisible();
  });
});

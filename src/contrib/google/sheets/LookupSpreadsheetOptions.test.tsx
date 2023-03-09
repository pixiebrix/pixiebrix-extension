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
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import LookupSpreadsheetOptions from "@/contrib/google/sheets/LookupSpreadsheetOptions";
import { render } from "@/sidebar/testHelpers";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  makeTemplateExpression,
  makeVariableExpression,
} from "@/runtime/expressionCreators";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuthOptions } from "@/hooks/auth";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import selectEvent from "react-select-event";
import { act } from "react-dom/test-utils";

const SPREADSHEET_ID = "testId";

jest.mock("@/components/fields/schemaFields/serviceFieldUtils", () => ({
  ...jest.requireActual("@/components/fields/schemaFields/serviceFieldUtils"),
  // Mock so we don't have to have full Page Editor state in tests
  produceExcludeUnusedDependencies: jest.fn().mockImplementation((x: any) => x),
}));

jest.mock("@/hooks/auth", () => ({
  __esModule: true,
  useAuthOptions: jest.fn().mockReturnValue([[], () => {}]),
}));

jest.mock("@/contrib/google/sheets/useSpreadsheetId", () => ({
  __esModule: true,
  default: () => SPREADSHEET_ID,
}));

jest.mock("@/background/messenger/api", () => ({
  __esModule: true,
  sheets: {
    getSheetProperties: jest.fn().mockResolvedValue({ title: "Test Sheet" }),
    getTabNames: jest.fn().mockResolvedValue(["Tab1", "Tab2"]),
    getHeaders: jest.fn().mockImplementation(({ tabName }) => {
      if (tabName === "Tab1") {
        return ["Column1", "Column2"];
      }

      return ["Foo", "Bar"];
    }),
  },
}));

const useAuthOptionsMock = useAuthOptions as jest.MockedFunction<
  typeof useAuthOptions
>;

beforeAll(() => {
  registerDefaultWidgets();
});

describe("LookupSpreadsheetOptions", () => {
  it("should render successfully", async () => {
    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: SPREADSHEET_ID,
            tabName: "",
            header: "",
            query: "",
            multi: false,
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("should show tab names automatically when config is selected", async () => {
    useAuthOptionsMock.mockReturnValue([
      [
        // Provide 2 so ServiceSelectWidget won't select one by default
        {
          label: "Test 1",
          value: uuidv4(),
          local: true,
          serviceId: validateRegistryId("google/sheet"),
        },
        {
          label: "Test 2",
          value: uuidv4(),
          local: true,
          serviceId: validateRegistryId("google/sheet"),
        },
      ],
      () => {},
    ]);

    const wrapper = render(
      <ErrorBoundary>
        <LookupSpreadsheetOptions name="" configKey="config" />
      </ErrorBoundary>,
      {
        initialValues: {
          config: {
            // Causes integration configuration checker to be shown
            spreadsheetId: null,
            // XXX: the test passes if this starts as "", but not if it's a blank expression
            // That's because the TabField only defaults if the value is null
            tabName: makeTemplateExpression("nunjucks", ""),
            rowValues: {},
          },
          services: [],
        },
      }
    );

    await act(async () => {
      await waitForEffect();

      const spreadsheetSelect = await screen.findByLabelText("Spreadsheet");
      await selectEvent.select(spreadsheetSelect, "Test 1");
      await waitForEffect();
    });

    const tabOption = await screen.findByText("Tab1");
    expect(tabOption).toBeVisible();

    expect(wrapper.container).toMatchSnapshot();
  });

  it("can choose tab and header values will load automatically", async () => {
    render(<LookupSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: SPREADSHEET_ID,
          tabName: "",
          rowValues: {},
        },
      },
    });

    await waitForEffect();

    const tabChooser = await screen.findByLabelText("Tab Name");

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1 in the dropdown
    const headerChooser = await screen.findByLabelText("Column Header");
    await userEvent.click(headerChooser);
    // TODO: This check fails because Column1 appears twice, in the field value and dropdown option.
    //  We should convert this test to use react-select-event
    // expect(screen.getByText("Column1")).toBeVisible();
    expect(screen.getByText("Column2")).toBeVisible();
    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
    expect(screen.queryByText("Bar")).not.toBeInTheDocument();

    // Choose Tab2
    await userEvent.click(tabChooser);
    const tab2Option = await screen.findByText("Tab2");
    await userEvent.click(tab2Option);

    // Shows the header names for Tab2 in the dropdown
    await userEvent.click(headerChooser);
    // TODO: This check fails because Foo appears twice, in the field value and dropdown option.
    //  We should convert this test to use react-select-event
    // expect(screen.getByText("Foo")).toBeVisible();
    expect(screen.getByText("Bar")).toBeVisible();
    expect(screen.queryByText("Column1")).not.toBeInTheDocument();
    expect(screen.queryByText("Column2")).not.toBeInTheDocument();
  });

  it("renders with variable inputs", async () => {
    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: SPREADSHEET_ID,
            tabName: makeVariableExpression("@myTab"),
            header: makeVariableExpression("@myHeader"),
            query: makeVariableExpression("@query"),
            multi: true,
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});

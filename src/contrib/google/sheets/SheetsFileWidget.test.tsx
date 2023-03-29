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

import { render } from "@/pageEditor/testHelpers";
import React from "react";
import SheetsFileWidget from "@/contrib/google/sheets/SheetsFileWidget";
import { BASE_SHEET_SCHEMA } from "@/contrib/google/sheets/schemas";
import { waitForEffect } from "@/testUtils/testHelpers";
import { sheets } from "@/background/messenger/api";
import { makeVariableExpression } from "@/runtime/expressionCreators";
import {
  blockConfigFactory,
  extensionFactory,
  formStateFactory,
  uuidSequence,
} from "@/testUtils/factories";
import { validateRegistryId } from "@/types/helpers";
import { OutputKey } from "@/core";

jest.mock("@/background/messenger/api", () => ({
  sheets: {
    getSheetProperties: jest
      .fn()
      .mockRejectedValue(new Error("Not implemented")),
  },
}));

const getSheetPropertiesMock = sheets.getSheetProperties as jest.MockedFunction<
  typeof sheets.getSheetProperties
>;

describe("SheetsFileWidget", () => {
  it("smoke test", async () => {
    const wrapper = render(
      <SheetsFileWidget name="spreadsheetId" schema={BASE_SHEET_SCHEMA} />,
      {
        initialValues: { spreadsheetId: null },
      }
    );

    await waitForEffect();

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it("renders valid sheet on load", async () => {
    getSheetPropertiesMock.mockResolvedValue({
      title: "Test Sheet",
    });

    const wrapper = render(
      <SheetsFileWidget name="spreadsheetId" schema={BASE_SHEET_SCHEMA} />,
      {
        initialValues: { spreadsheetId: "abc123" },
      }
    );

    await waitForEffect();

    expect(wrapper.asFragment()).toMatchSnapshot();
    expect(wrapper.container.querySelector("input")).toHaveValue("Test Sheet");
  });

  it("falls back to spreadsheet id if fetching properties fails", async () => {
    getSheetPropertiesMock.mockRejectedValue(
      new Error("Error fetching sheet properties")
    );

    const wrapper = render(
      <SheetsFileWidget name="spreadsheetId" schema={BASE_SHEET_SCHEMA} />,
      {
        initialValues: { spreadsheetId: "abc123" },
      }
    );

    await waitForEffect();

    expect(wrapper.asFragment()).toMatchSnapshot();
    expect(wrapper.container.querySelector("input")).toHaveValue("abc123");
  });

  it("shows workshop fallback on expression", async () => {
    const wrapper = render(
      <SheetsFileWidget name="spreadsheetId" schema={BASE_SHEET_SCHEMA} />,
      {
        initialValues: { spreadsheetId: makeVariableExpression("@sheet") },
      }
    );

    await waitForEffect();

    expect(wrapper.container.querySelector("input")).toHaveValue(
      "Use Workshop to edit"
    );
  });

  it("removes unused service on mount", async () => {
    const initialValues = formStateFactory(
      {
        services: [
          {
            id: validateRegistryId("google/sheet"),
            outputKey: "google" as OutputKey,
            config: uuidSequence(1),
          },
        ],
      },
      [
        blockConfigFactory({
          config: {
            spreadsheetId: "abc123",
          },
        }),
      ]
    );

    const { getFormState } = render(
      <SheetsFileWidget
        name="extension.blockPipeline[0].config.spreadsheetId"
        schema={BASE_SHEET_SCHEMA}
      />,
      { initialValues }
    );

    await waitForEffect();

    const formState = await getFormState();

    expect(formState.services).toHaveLength(0);
  });

  it("does not remove used service on mount", async () => {
    const service = {
      id: validateRegistryId("google/sheet"),
      outputKey: "google" as OutputKey,
      config: uuidSequence(1),
    };

    const initialValues = formStateFactory(
      {
        services: [service],
      },
      [
        blockConfigFactory({
          config: {
            spreadsheetId: makeVariableExpression("@google"),
          },
        }),
      ]
    );

    const { getFormState } = render(
      <SheetsFileWidget
        name="extension.blockPipeline[0].config.spreadsheetId"
        schema={BASE_SHEET_SCHEMA}
      />,
      { initialValues }
    );

    await waitForEffect();

    const formState = await getFormState();

    expect(formState.services).toHaveLength(1);
    expect(formState.services[0]).toEqual(service);
  });
});

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
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { render } from "../../testHelpers";
import ModOptionsDefinitionEditor from "./ModOptionsDefinitionEditor";
import { waitForEffect } from "../../../testUtils/testHelpers";
import selectEvent from "react-select-event";
import { screen } from "@testing-library/react";
import modComponentSlice from "../../../store/modComponents/modComponentSlice";
import userEvent from "@testing-library/user-event";
import { defaultModDefinitionFactory } from "../../../testUtils/factories/modDefinitionFactories";
import { editorSlice } from "../../store/editor/editorSlice";

jest.mock("../../../hooks/useFlags", () =>
  jest.fn().mockReturnValue({
    flagOn: jest.fn().mockReturnValue(true),
  }),
);

beforeAll(() => {
  registerDefaultWidgets();
});

describe("ModOptionsDefinitionEditor", () => {
  it("shows google sheets, and both database field type options", async () => {
    const modDefinition = defaultModDefinitionFactory();

    render(<ModOptionsDefinitionEditor />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );

        dispatch(editorSlice.actions.setActiveModId(modDefinition.metadata.id));
      },
    });
    await waitForEffect();

    expect(
      screen.getByLabelText("Activation Instructions"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText("Add new field"));

    const inputTypeSelector = screen.getByLabelText("Input Type");
    selectEvent.openMenu(inputTypeSelector);
    expect(screen.getByText("Checkbox")).toBeVisible();
    expect(screen.getByText("Google Sheet")).toBeVisible();
    expect(screen.getByText("Database selector")).toBeVisible();
    expect(
      screen.getByText("Database automatically created at activation"),
    ).toBeVisible();
  });
});

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

import { render } from "@/pageEditor/testHelpers";
import React from "react";
import ModListingPanel from "@/pageEditor/modListingPanel/ModListingPanel";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("ModListingPanel", () => {
  it("renders listing for activated mod with no changes", async () => {
    const modDefinition = modDefinitionFactory();

    render(<ModListingPanel />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            configuredDependencies: [],
            optionsArgs: {},
            screen: "pageEditor",
            isReactivate: false,
            deployment: undefined,
          }),
        );
      },
    });

    expect(screen.getByText(modDefinition.metadata.name)).toBeInTheDocument();

    // Select the mod
    await userEvent.click(screen.getByText(modDefinition.metadata.name));

    // Check that clicking expands the mod listing
    expect(
      screen.getByText(modDefinition.extensionPoints[0]!.label),
    ).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", {
        name: `${modDefinition.metadata.name} - Ellipsis`,
      }),
    );

    // "Clear Changes" is disabled because there's no dirty state
    expect(screen.getByText("Clear Changes")).toBeInTheDocument();
    expect(screen.getByText("Clear Changes")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

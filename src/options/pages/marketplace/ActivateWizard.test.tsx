/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { render } from "@/options/testHelpers";
import ActivateWizard from "@/options/pages/marketplace/ActivateWizard";
import { recipeDefinitionFactory } from "@/testUtils/factories";
import { waitForEffect } from "@/testUtils/testHelpers";
import { screen, fireEvent, getByText } from "@testing-library/react";

jest.mock("@/options/store", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

jest.mock("@/services/api", () => ({
  useGetMarketplaceListingsQuery: jest.fn(() => ({
    data: [],
  })),
  useGetRecipesQuery: jest.fn(() => ({
    data: [],
  })),
}));

global.chrome = {
  commands: {
    getAll: jest.fn(),
  },
};

describe("ActivateWizard", () => {
  test("renders", async () => {
    const rendered = render(
      <ActivateWizard blueprint={recipeDefinitionFactory()} />
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("activate blueprint", async () => {
    const rendered = render(
      <ActivateWizard
        blueprint={recipeDefinitionFactory({
          options: {
            schema: {
              $schema: "https://json-schema.org/draft/2019-09/schema#",
              properties: {
                database: {
                  $ref: "https://app.pixiebrix.com/schemas/database#",
                  title: "Database",
                },
              },
              required: ["database"],
              type: "object",
            },
            uiSchema: {},
          },
        })}
      />
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
    fireEvent(
      getByText(rendered.container, "Activate"),
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      })
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});

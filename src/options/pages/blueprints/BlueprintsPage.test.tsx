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
import BlueprintsCard from "@/options/pages/blueprints/BlueprintsCard";
import { Installable } from "@/options/pages/blueprints/blueprintsTypes";

jest.mock("@/services/api", () => ({
  useGetRecipesQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useGetCloudExtensionsQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useGetMarketplaceListingsQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useGetOrganizationsQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useGetStarterBlueprintsQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

const installables: Installable[] = [];

describe("BlueprintsPage", () => {
  test("it renders", () => {
    render(<BlueprintsCard installables={installables} />);
  });
});

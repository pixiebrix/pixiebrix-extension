/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import ActiveBricksCard from "@/options/pages/installed/ActiveBricksCard";
import { StaticRouter } from "react-router-dom";
import { screen, render } from "@testing-library/react";
import { ResolvedExtension } from "@/core";

jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: jest.fn(),
  useGetRecipesQuery: jest.fn(),
}));

jest.mock("@/hooks/useDeployments", () => jest.fn());

import { useGetOrganizationsQuery, useGetRecipesQuery } from "@/services/api";
import useDeployments from "@/hooks/useDeployments";
import { Organization } from "@/types/contract";

const extensions: ResolvedExtension[] = [
  {
    id: "20152aa4-a39e-492a-a189-26006df54405",
    apiVersion: "v1",
    _recipe: {
      id: "@user/test-brick",
      version: "11.0.0",
      name: "Search Etsy",
      description: "Testing raw config",
      sharing: {
        public: false,
        organizations: [],
      },
      updated_at: "2021-11-18T21:48:25.261939Z",
    },
    definitions: {},
    optionsArgs: {},
    services: [],
    label: "Search Etsy?",
    extensionPointId: "@pixiebrix/context-search",
    config: {},
    active: true,
    createTimestamp: "2021-11-18T21:49:14.274Z",
    updateTimestamp: "2021-11-18T21:49:14.274Z",
  },
];

describe("ExtensionGroup update", () => {
  test("Update shows for latest version greater than installed version", () => {
    (useGetOrganizationsQuery as jest.Mock).mockImplementation(() => ({
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we only need organizations.length > 1
      data: [{} as Organization],
    }));

    const newer_timestamp = "2021-11-20T21:48:25.261939Z";
    (useGetRecipesQuery as jest.Mock).mockImplementation(() => ({
      data: [
        {
          metadata: {
            id: "@user/test-brick",
          },
          // TODO: refactor into earlier_timestamp constant
          updated_at: newer_timestamp,
        },
      ],
      isLoading: false,
    }));

    render(
      <StaticRouter>
        <ActiveBricksCard
          extensions={extensions}
          onRemove={jest.fn()}
          onExportBlueprint={jest.fn()}
        />
      </StaticRouter>
    );

    const updateStatus = screen.getByText("Update");

    expect(updateStatus).not.toBeNull();
  });
});

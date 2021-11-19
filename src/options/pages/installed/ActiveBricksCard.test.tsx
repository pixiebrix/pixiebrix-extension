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
import { ResolvedExtension, UUID } from "@/core";

jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: () => ({ data: [] as Organization[] }),
  useGetRecipesQuery: jest.fn(),
}));

import { useGetRecipesQuery } from "@/services/api";
import { Organization } from "@/types/contract";

const extensionFactory = ({
  timestamp = undefined,
  isPersonalBrick = false,
  isTeamDeployment = false,
}: {
  timestamp?: string;
  isPersonalBrick?: boolean;
  isTeamDeployment?: boolean;
} = {}) => ({
  id: "",
  apiVersion: "v1",
  ...(!isPersonalBrick && {
    _recipe: {
      id: "@user/foo",
      version: "1.0.0",
      name: "Test Brick",
      description: "Testing update status",
      sharing: {
        public: false,
        organizations: [] as UUID[],
      },
      ...(timestamp && { updated_at: timestamp }),
    },
  }),
  ...(isTeamDeployment && {
    _deployment: {
      id: "@team/foo",
    },
  }),
  definitions: {},
  optionsArgs: {},
  services: [],
  label: "Test Brick",
  extensionPointId: "@pixiebrix/bar",
  config: {},
  active: true,
  createTimestamp: "2021-11-18T21:49:14.274Z",
  updateTimestamp: "2021-11-18T21:49:14.274Z",
});

const recipeFactory = (timestamp: string) => ({
  metadata: {
    id: "@user/foo",
  },
  updated_at: timestamp,
});

const mockGetRecipesImplementation = (recipe) => {
  (useGetRecipesQuery as jest.Mock).mockImplementation(() => ({
    data: [recipe],
    isLoading: false,
  }));
};

describe("ExtensionGroup Update status", () => {
  const older_timestamp = "2021-11-18T00:00:00.000000Z";
  const newer_timestamp = "2021-11-20T00:00:00.000000Z";

  test("shows when latest Blueprint is newer", () => {
    mockGetRecipesImplementation(recipeFactory(newer_timestamp));

    render(
      <StaticRouter>
        <ActiveBricksCard
          extensions={[extensionFactory({ timestamp: older_timestamp })]}
          onRemove={jest.fn()}
          onExportBlueprint={jest.fn()}
        />
      </StaticRouter>
    );

    const updateStatus = screen.getByText("Update");
    expect(updateStatus).not.toBeNull();
  });

  test("doesn't show when latest Blueprint is older", () => {
    mockGetRecipesImplementation(recipeFactory(older_timestamp));

    render(
      <StaticRouter>
        <ActiveBricksCard
          extensions={[extensionFactory({ timestamp: newer_timestamp })]}
          onRemove={jest.fn()}
          onExportBlueprint={jest.fn()}
        />
      </StaticRouter>
    );

    const updateStatus = screen.queryByText("Update");
    expect(updateStatus).toBeNull();
  });

  test("doesn't show Update when latest Blueprint has same timestamp", () => {
    const same_timestamp = "2021-11-20T00:00:00.000000Z";
    mockGetRecipesImplementation(recipeFactory(same_timestamp));

    render(
      <StaticRouter>
        <ActiveBricksCard
          extensions={[extensionFactory({ timestamp: same_timestamp })]}
          onRemove={jest.fn()}
          onExportBlueprint={jest.fn()}
        />
      </StaticRouter>
    );

    const updateStatus = screen.queryByText("Update");
    expect(updateStatus).toBeNull();
  });

  // If the installed blueprint updated_at is undefined, this means that the user
  // installed this extension before the Update feature was released. In order to
  // detect future updates, the user needs to reactive the blueprint.
  test("shows when installed Blueprint updated_at is undefined", () => {
    const arbitrary_timestamp = "2021-11-20T00:00:00.000000Z";
    mockGetRecipesImplementation(recipeFactory(arbitrary_timestamp));

    render(
      <StaticRouter>
        <ActiveBricksCard
          extensions={[extensionFactory()]}
          onRemove={jest.fn()}
          onExportBlueprint={jest.fn()}
        />
      </StaticRouter>
    );

    const updateStatus = screen.queryByText("Update");
    expect(updateStatus).not.toBeNull();
  });

  test("doesn't show on Personal Bricks and Team Deployments", () => {
    const arbitrary_timestamp = "2021-11-20T00:00:00.000000Z";
    mockGetRecipesImplementation(recipeFactory(arbitrary_timestamp));

    render(
      <StaticRouter>
        <ActiveBricksCard
          extensions={[
            extensionFactory({ isPersonalBrick: true }),
            extensionFactory({ isTeamDeployment: true }),
          ]}
          onRemove={jest.fn()}
          onExportBlueprint={jest.fn()}
        />
      </StaticRouter>
    );

    const updateStatus = screen.queryByText("Update");
    expect(updateStatus).toBeNull();
  });
});

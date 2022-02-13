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
import ActiveBricksCard from "@/options/pages/installed/ActiveBricksCard";
import { screen, render, fireEvent } from "@testing-library/react";
import { ResolvedExtension, UUID } from "@/core";
import { useGetRecipesQuery } from "@/services/api";
import { Organization } from "@/types/contract";
import { RecipeDefinition } from "@/types/definitions";
import { anonAuth } from "@/hooks/auth";

jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: () => ({ data: [] as Organization[] }),
  useGetRecipesQuery: jest.fn(),
  useGetAuthQuery: jest.fn(() => ({ data: anonAuth })),
}));

const arbitraryTimestamp = "2021-11-20T00:00:00.000000Z";

type TestExtension = {
  timestamp?: string;
  isPersonalBrick?: boolean;
  isTeamDeployment?: boolean;
};

const extensionFactory = ({
  timestamp,
  isPersonalBrick = false,
  isTeamDeployment = false,
}: TestExtension = {}) =>
  ({
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
    label: "Test Brick",
    extensionPointId: "@pixiebrix/bar",
    config: {},
    active: true,
  } as unknown as ResolvedExtension);

// XXX: use the factories.ts factory instead
const recipeFactory: (timestamp: string) => RecipeDefinition = (
  timestamp: string
) =>
  ({
    // Omitting properties for brevity
    metadata: {
      id: "@user/foo",
      name: "Test recipe",
      version: "1.0.0",
    } as unknown as Metadata,
    updated_at: timestamp,
  } as unknown as RecipeDefinition);

const mockGetRecipesImplementation = (recipe: RecipeDefinition) => {
  (useGetRecipesQuery as jest.Mock).mockImplementation(() => ({
    data: [recipe],
    isLoading: false,
  }));
};

const expandEllipsisMenuOptions = (container: HTMLElement) => {
  fireEvent.click(container.querySelector("button"));
};

describe("ExtensionGroup Update status", () => {
  const olderTimestamp = "2021-11-18T00:00:00.000000Z";
  const newerTimestamp = "2021-11-20T00:00:00.000000Z";

  test("shows when latest Blueprint is newer", () => {
    mockGetRecipesImplementation(recipeFactory(newerTimestamp));

    render(
      <ActiveBricksCard
        extensions={[extensionFactory({ timestamp: olderTimestamp })]}
        onRemove={jest.fn()}
        onExportBlueprint={jest.fn()}
      />
    );

    const updateStatus = screen.getByText("Update");
    expect(updateStatus).not.toBeNull();
  });

  test("doesn't show when latest Blueprint is older", () => {
    mockGetRecipesImplementation(recipeFactory(olderTimestamp));

    const { container } = render(
      <ActiveBricksCard
        extensions={[extensionFactory({ timestamp: newerTimestamp })]}
        onRemove={jest.fn()}
        onExportBlueprint={jest.fn()}
      />
    );

    const updateStatus = screen.queryByText("Update");
    expect(updateStatus).toBeNull();

    expandEllipsisMenuOptions(container);
    const reactivateOption = screen.queryByText("Reactivate");
    expect(reactivateOption).not.toBeNull();
  });

  test("doesn't show Update when latest Blueprint has same timestamp", () => {
    const sameTimestamp = "2021-11-20T00:00:00.000000Z";
    mockGetRecipesImplementation(recipeFactory(sameTimestamp));

    const { container } = render(
      <ActiveBricksCard
        extensions={[extensionFactory({ timestamp: sameTimestamp })]}
        onRemove={jest.fn()}
        onExportBlueprint={jest.fn()}
      />
    );

    const updateStatus = screen.queryByText("Update");
    expect(updateStatus).toBeNull();

    expandEllipsisMenuOptions(container);
    const reactivateOption = screen.queryByText("Reactivate");
    expect(reactivateOption).not.toBeNull();
  });

  // If the installed blueprint updated_at is undefined, this means that the user
  // installed this extension before the Update feature was released.
  test("doesn't show when installed Blueprint updated_at is undefined", () => {
    mockGetRecipesImplementation(recipeFactory(arbitraryTimestamp));

    render(
      <ActiveBricksCard
        extensions={[extensionFactory()]}
        onRemove={jest.fn()}
        onExportBlueprint={jest.fn()}
      />
    );

    const updateStatus = screen.queryByText("Update");
    expect(updateStatus).toBeNull();
  });

  test("doesn't show on Personal Bricks", () => {
    mockGetRecipesImplementation(recipeFactory(arbitraryTimestamp));

    const { container } = render(
      <ActiveBricksCard
        extensions={[extensionFactory({ isPersonalBrick: true })]}
        onRemove={jest.fn()}
        onExportBlueprint={jest.fn()}
      />
    );

    const updateStatus = screen.queryByText("Update");
    expect(updateStatus).toBeNull();

    expandEllipsisMenuOptions(container);
    const reactivateOption = screen.queryByText("Reactivate");
    expect(reactivateOption).toBeNull();
  });

  test("doesn't show on Team Deployments", () => {
    mockGetRecipesImplementation(recipeFactory(arbitraryTimestamp));

    const { container } = render(
      <ActiveBricksCard
        extensions={[extensionFactory({ isTeamDeployment: true })]}
        onRemove={jest.fn()}
        onExportBlueprint={jest.fn()}
      />
    );

    const updateStatus = screen.queryByText("Update");
    expect(updateStatus).toBeNull();

    expandEllipsisMenuOptions(container);
    const reactivateOption = screen.queryByText("Reactivate");
    expect(reactivateOption).toBeNull();
  });
});

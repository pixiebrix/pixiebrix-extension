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
import { render } from "@/options/testHelpers";
import BlueprintsPageLayout from "@/options/pages/blueprints/BlueprintsPageLayout";
import { type Installable } from "@/options/pages/blueprints/blueprintsTypes";
import { waitForEffect } from "@/testUtils/testHelpers";
import { useGetMeQuery, useGetStarterBlueprintsQuery } from "@/services/api";
import { screen } from "@testing-library/react";
import { organizationFactory } from "@/testUtils/factories";
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import { Provider } from "react-redux";
import { persistExtensionOptionsConfig } from "@/store/extensionsStorage";
import extensionsSlice from "@/store/extensionsSlice";
import blueprintsSlice, {
  persistBlueprintsConfig,
} from "@/options/pages/blueprints/blueprintsSlice";

const EMPTY_RESPONSE = Object.freeze({
  data: Object.freeze([]),
  isLoading: false,
});

// Need to return the same object every time, because useInstallableViewItems doesn't destructure the object. Or maybe
// we just need to make sure the data [] array is the same object?
jest.mock("@/services/api", () => ({
  useGetMeQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetCloudExtensionsQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetMarketplaceListingsQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetOrganizationsQuery: jest.fn(() => EMPTY_RESPONSE),
  useGetStarterBlueprintsQuery: jest.fn(() => EMPTY_RESPONSE),
}));

jest.mock("@/recipes/recipesHooks", () => ({
  useAllRecipes: jest
    .fn()
    .mockReturnValue({ data: [], isFetchingFromCache: false }),
  useRecipe: jest
    .fn()
    .mockReturnValue({ data: [], isFetchingFromCache: false }),
}));

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      auth: persistReducer(persistAuthConfig, authSlice.reducer),
      options: persistReducer(
        persistExtensionOptionsConfig,
        extensionsSlice.reducer
      ),
      blueprints: persistReducer(
        persistBlueprintsConfig,
        blueprintsSlice.reducer
      ),
    },
    preloadedState: initialState,
  });
}

const installables: Installable[] = [];

describe("BlueprintsPageLayout", () => {
  const { env } = process;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  test("renders", async () => {
    const rendered = render(
      <BlueprintsPageLayout installables={installables} />
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("doesn't flash the 'Get Started' tab while loading", async () => {
    (useGetStarterBlueprintsQuery as jest.Mock).mockImplementation(() => ({
      isLoading: true,
    }));

    render(<BlueprintsPageLayout installables={installables} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();

    (useGetStarterBlueprintsQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
    }));

    render(<BlueprintsPageLayout installables={installables} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).not.toBeNull();
    expect(screen.queryByText("Get Started")).not.toBeNull();
  });

  test("get started tab is active by default", async () => {
    (useGetStarterBlueprintsQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
    }));

    render(<BlueprintsPageLayout installables={installables} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).not.toBeNull();
    expect(screen.queryByText("Get Started")).not.toBeNull();
    expect(screen.getByTestId("get-started-blueprint-tab")).toHaveClass(
      "active"
    );
  });

  test("does not show 'Get Started' tab for enterprise users", async () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      data: { organization: organizationFactory() },
    }));

    render(<BlueprintsPageLayout installables={installables} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
  });

  test("shows the bot games tab", async () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
    }));

    render(
      <Provider
        store={optionsStore({
          auth: {
            isLoggedIn: true,
            flags: ["bot-games-event-in-progress"],
            milestones: [{ key: "bot_games_2022_register" }],
          },
        })}
      >
        <BlueprintsPageLayout installables={installables} />
      </Provider>
    );
    await waitForEffect();
    expect(screen.getByText("Bot Games")).not.toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
  });

  test("doesn't flash get started tab while loading the bot games tab", async () => {
    (useGetMeQuery as jest.Mock).mockImplementation(() => ({
      isLoading: true,
    }));
    (useGetStarterBlueprintsQuery as jest.Mock).mockImplementation(() => ({
      isLoading: false,
    }));

    render(<BlueprintsPageLayout installables={installables} />);
    await waitForEffect();
    expect(screen.queryByText("Get Started")).toBeNull();

    render(
      <Provider
        store={optionsStore({
          auth: {
            isLoggedIn: true,
            flags: ["bot-games-event-in-progress"],
            milestones: [{ key: "bot_games_2022_register" }],
          },
        })}
      >
        <BlueprintsPageLayout installables={installables} />
      </Provider>
    );
    await waitForEffect();
    expect(screen.getByText("Bot Games")).not.toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
  });

  test("bot games tab is active by default", async () => {
    render(
      <Provider
        store={optionsStore({
          auth: {
            isLoggedIn: true,
            flags: ["bot-games-event-in-progress"],
            milestones: [{ key: "bot_games_2022_register" }],
          },
        })}
      >
        <BlueprintsPageLayout installables={installables} />
      </Provider>
    );
    await waitForEffect();
    expect(screen.queryByText("Bot Games")).not.toBeNull();
    expect(screen.getByTestId("bot-games-blueprint-tab")).toHaveClass("active");
  });
});

describe("Serializable Data Test", () => {
  test("Pushes unserializable data to redux", async () => {
    const spy = jest.spyOn(console, "error");
    render(<BlueprintsPageLayout installables={installables} />, {
      setupRedux(dispatch) {
        dispatch(
          blueprintsSlice.actions.setSearchQuery(
            (() => {}) as unknown as string
          )
        );
      },
    });

    await waitForEffect();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("A non-serializable value was detected"),
      expect.toBeFunction(),
      expect.toBeString()
    );
  });
});

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
import { render } from "@/extensionConsole/testHelpers";
import BlueprintsPageLayout from "@/extensionConsole/pages/blueprints/BlueprintsPageLayout";
import { type Installable } from "@/extensionConsole/pages/blueprints/blueprintsTypes";
import { waitForEffect } from "@/testUtils/testHelpers";
import { screen } from "@testing-library/react";
import {
  authStateFactory,
  userFactory,
  userOrganizationFactory,
} from "@/testUtils/factories";
import blueprintsSlice from "@/extensionConsole/pages/blueprints/blueprintsSlice";
import pDefer from "p-defer";
import { appApiMock } from "@/testUtils/appApiMock";
import { mockCachedUser, mockLoadingUser } from "@/testUtils/userMock";
import { authSlice } from "@/auth/authSlice";

jest.mock("@/services/apiClient", () => require("@/testUtils/apiClientMock"));

jest.mock("@/recipes/recipesHooks", () => ({
  useAllRecipes: jest
    .fn()
    .mockReturnValue({ data: [], isFetchingFromCache: false }),
  useOptionalRecipe: jest
    .fn()
    .mockReturnValue({ data: [], isFetchingFromCache: false }),
}));

const installables: Installable[] = [];

describe("BlueprintsPageLayout", () => {
  const { env } = process;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
    jest.clearAllMocks();
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
    appApiMock.reset();
    const deferred = pDefer<any>();
    // Force loading state
    appApiMock
      .onGet("/api/onboarding/starter-blueprints/")
      .reply(async () => deferred.promise);

    render(<BlueprintsPageLayout installables={installables} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();

    deferred.resolve([200, []]);

    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).not.toBeNull();
    expect(screen.queryByText("Get Started")).not.toBeNull();
  });

  test("get started tab is active by default", async () => {
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
    mockCachedUser(
      userFactory({
        organization: userOrganizationFactory(),
      })
    );

    render(<BlueprintsPageLayout installables={installables} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
  });

  test("shows the bot games tab", async () => {
    mockCachedUser();

    render(<BlueprintsPageLayout installables={installables} />, {
      setupRedux(dispatch) {
        dispatch(
          authSlice.actions.setAuth(
            authStateFactory({
              flags: ["bot-games-event-in-progress"],
              milestones: [{ key: "bot_games_2022_register" }],
            })
          )
        );
      },
    });
    await waitForEffect();
    expect(screen.getByText("Bot Games")).not.toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
  });

  test("doesn't flash get started tab while loading the bot games tab", async () => {
    mockLoadingUser();

    render(<BlueprintsPageLayout installables={installables} />);
    await waitForEffect();
    expect(screen.queryByText("Get Started")).toBeNull();

    render(<BlueprintsPageLayout installables={installables} />, {
      setupRedux(dispatch) {
        dispatch(
          authSlice.actions.setAuth(
            authStateFactory({
              flags: ["bot-games-event-in-progress"],
              milestones: [{ key: "bot_games_2022_register" }],
            })
          )
        );
      },
    });
    await waitForEffect();
    expect(screen.getByText("Bot Games")).not.toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
  });

  test("bot games tab is active by default", async () => {
    render(<BlueprintsPageLayout installables={installables} />, {
      setupRedux(dispatch) {
        dispatch(
          authSlice.actions.setAuth(
            authStateFactory({
              flags: ["bot-games-event-in-progress"],
              milestones: [{ key: "bot_games_2022_register" }],
            })
          )
        );
      },
    });

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

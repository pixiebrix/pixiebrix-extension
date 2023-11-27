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
import ModsPageLayout from "@/extensionConsole/pages/mods/ModsPageLayout";
import { type Mod } from "@/types/modTypes";
import { waitForEffect } from "@/testUtils/testHelpers";
import { act, screen } from "@testing-library/react";
import modsPageSlice from "@/extensionConsole/pages/mods/modsPageSlice";
import userEvent from "@testing-library/user-event";
import { mockCachedUser } from "@/testUtils/userMock";
import { appApiMock, onDeferredGet } from "@/testUtils/appApiMock";
import {
  userFactory,
  userOrganizationFactory,
} from "@/testUtils/factories/authFactories";

jest.mock("@/modDefinitions/modDefinitionHooks", () => ({
  useAllModDefinitions: jest
    .fn()
    .mockReturnValue({ data: [], isFetchingFromCache: false }),
  useOptionalModDefinition: jest
    .fn()
    .mockReturnValue({ data: [], isFetchingFromCache: false }),
}));

const mods: Mod[] = [];

describe("ModsPageLayout", () => {
  const { env } = process;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    process.env = env;
    jest.runAllTimers();
    jest.useRealTimers();
  });

  test("renders", async () => {
    const { asFragment } = render(<ModsPageLayout mods={mods} />);
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
  });

  test("doesn't flash the 'Get Started' tab while loading", async () => {
    appApiMock.reset();

    const deferred = onDeferredGet("/api/onboarding/starter-blueprints/");

    render(<ModsPageLayout mods={mods} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();

    deferred.resolve([]);

    await waitForEffect();
    expect(
      screen.getByText("Welcome to the PixieBrix Extension Console")
    ).not.toBeNull();
    expect(screen.getByText("Get Started")).not.toBeNull();
  });

  test("get started tab is active by default", async () => {
    render(<ModsPageLayout mods={mods} />);
    await waitForEffect();
    expect(
      screen.getByText("Welcome to the PixieBrix Extension Console")
    ).not.toBeNull();
    expect(screen.getByText("Get Started")).not.toBeNull();
    expect(screen.getByTestId("get-started-mod-tab")).toHaveClass("active");
  });

  test("does not show 'Get Started' tab for enterprise users", async () => {
    mockCachedUser(
      userFactory({
        organization: userOrganizationFactory(),
      })
    );
    render(<ModsPageLayout mods={mods} />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console")
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
  });

  test("search query heading renders", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ModsPageLayout mods={mods} />);

    await waitForEffect();

    await user.type(
      screen.getByTestId("blueprints-search-input"),
      "hello world"
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByText('0 results for "hello world"')).not.toBeNull();

    await user.type(
      screen.getByTestId("blueprints-search-input"),
      " hello world again!"
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(
      screen.getByText('0 results for "hello world hello world again!"')
    ).not.toBeNull();
  });
});

describe("Serializable Data Test", () => {
  test("Pushes unserializable data to redux", async () => {
    const spy = jest.spyOn(console, "error");
    render(<ModsPageLayout mods={mods} />, {
      setupRedux(dispatch) {
        dispatch(
          modsPageSlice.actions.setSearchQuery((() => {}) as unknown as string)
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

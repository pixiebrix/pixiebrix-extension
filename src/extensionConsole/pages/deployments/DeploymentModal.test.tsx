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
import { render, screen } from "@testing-library/react";
import DeploymentModal from "@/extensionConsole/pages/deployments/DeploymentModal";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import settingsSlice, {
  initialSettingsState,
} from "@/store/settings/settingsSlice";
import MockDate from "mockdate";
import { type SettingsState } from "@/store/settings/settingsTypes";
import { authSlice } from "@/auth/authSlice";
import { useExtensionUpdateAvailable } from "@/extensionConsole/pages/UpdateBanner";
import { type AuthState } from "@/auth/authTypes";

jest.mock("@/extensionConsole/pages/UpdateBanner");

browser.runtime.reload = jest.fn();

const reloadMock = jest.mocked(browser.runtime.reload);
const useUpdateAvailableMock = jest.mocked(useExtensionUpdateAvailable);

beforeEach(() => {
  reloadMock.mockReset();
});

const renderModal = (
  { extensionUpdateRequired }: { extensionUpdateRequired: boolean },
  settings: Partial<SettingsState>,
  auth: Partial<AuthState>,
) => {
  const store = configureStore({
    reducer: {
      settings: settingsSlice.reducer,
      auth: authSlice.reducer,
    },
    preloadedState: {
      settings: { ...settingsSlice.getInitialState(), ...settings },
      auth: { ...authSlice.getInitialState(), ...auth },
    },
  });

  return render(
    <Provider store={store}>
      <DeploymentModal
        update={jest.fn()}
        extensionUpdateRequired={extensionUpdateRequired}
        updateExtension={jest.fn()}
      />
    </Provider>,
  );
};

describe("DeploymentModal", () => {
  it("should not render when snoozed", async () => {
    // Tonight I'm going to party like it's 1999
    const date = new Date("12/31/1998");
    MockDate.set(date);

    jest.mocked(useExtensionUpdateAvailable).mockReturnValue(true);

    renderModal(
      {
        extensionUpdateRequired: false,
      },
      {
        ...initialSettingsState,
        nextUpdate: date.getTime() + 1,
      },
      {},
    );

    expect(screen.queryAllByRole("dialog")).toHaveLength(0);
  });

  it("should render if snoozed if not shown to user yet", async () => {
    // Tonight I'm going to party like it's 1999
    const date = new Date("12/31/1998");
    MockDate.set(date);

    jest.mocked(useExtensionUpdateAvailable).mockReturnValue(true);

    renderModal(
      {
        extensionUpdateRequired: false,
      },
      {
        ...initialSettingsState,
        nextUpdate: date.getTime() + 1,
        updatePromptTimestamp: null,
      },
      {
        enforceUpdateMillis: 1,
      },
    );

    expect(screen.queryAllByRole("dialog")).toHaveLength(1);
  });

  it("should render modal when snooze expired", async () => {
    const nextUpdate = new Date("12/31/1998").getTime();
    MockDate.set(new Date(nextUpdate + 1));

    useUpdateAvailableMock.mockReturnValue(true);

    renderModal(
      {
        extensionUpdateRequired: false,
      },
      {
        ...initialSettingsState,
        nextUpdate,
      },
      {},
    );

    await expect(screen.findAllByRole("dialog")).resolves.toMatchSnapshot();
    expect(
      screen.getByText(
        "An update to the PixieBrix browser extension is available. After updating, you will need need to reload any pages where PixieBrix is running.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Remind Me Later")).not.toBeDisabled();
  });

  it("should render when is enforced", async () => {
    // Tonight I'm going to party like it's 1999
    const time = new Date("12/31/1998").getTime();
    MockDate.set(time);

    jest.mocked(useExtensionUpdateAvailable).mockReturnValue(true);

    renderModal(
      {
        extensionUpdateRequired: false,
      },
      {
        ...initialSettingsState,
        // It is snoozed
        nextUpdate: time + 1,
        // But enforcement window is now enforced
        updatePromptTimestamp: time - 3,
      },
      { enforceUpdateMillis: 1 },
    );

    expect(reloadMock).toHaveBeenCalledTimes(1);
    await expect(screen.findAllByRole("dialog")).resolves.toMatchSnapshot();
    expect(screen.getByText("Remind Me Later")).toBeDisabled();
  });

  it("should render deployment update if update is enforced", async () => {
    // Tonight I'm going to party like it's 1999
    const date = new Date("12/31/1998");
    MockDate.set(date);

    jest.mocked(useExtensionUpdateAvailable).mockReturnValue(false);

    renderModal(
      {
        extensionUpdateRequired: false,
      },
      {
        ...initialSettingsState,
        // It is snoozed
        nextUpdate: date.getTime() + 1,
        updatePromptTimestamp: new Date(date.getTime() - 2).getTime(),
      },
      { enforceUpdateMillis: 1 },
    );

    expect(reloadMock).toHaveBeenCalledTimes(0);
    await expect(screen.findAllByRole("dialog")).resolves.toMatchSnapshot();
    expect(screen.getByText("Remind Me Later")).toBeDisabled();
  });

  it("should reload browser extension if extension update required for deployment", async () => {
    // Tonight I'm going to party like it's 1999
    const date = new Date("12/31/1998");
    MockDate.set(date);

    jest.mocked(useExtensionUpdateAvailable).mockReturnValue(false);

    renderModal(
      {
        extensionUpdateRequired: true,
      },
      {
        ...initialSettingsState,
        // It is snoozed
        nextUpdate: date.getTime() + 1,
        updatePromptTimestamp: new Date(date.getTime() - 2).getTime(),
      },
      { enforceUpdateMillis: 1 },
    );

    expect(reloadMock).toHaveBeenCalledTimes(1);
    await expect(screen.findAllByRole("dialog")).resolves.toMatchSnapshot();
    expect(screen.getByText("Remind Me Later")).toBeDisabled();
  });
});

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
import { render, screen } from "@testing-library/react";
import DeploymentModal from "@/options/pages/deployments/DeploymentModal";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import settingsSlice, { initialSettingsState } from "@/store/settingsSlice";
import MockDate from "mockdate";
import { SettingsState } from "@/store/settingsTypes";
import { authSlice } from "@/auth/authSlice";
import { useUpdateAvailable } from "@/options/pages/UpdateBanner";
import { AuthState } from "@/auth/authTypes";

jest.mock("@/options/pages/UpdateBanner", () => ({
  useUpdateAvailable: jest.fn(),
}));

browser.runtime.reload = jest.fn();

const reloadMock = browser.runtime.reload as jest.Mock;
const useUpdateAvailableMock = useUpdateAvailable as jest.Mock;

beforeEach(() => {
  reloadMock.mockReset();
});

const renderModal = (
  { extensionUpdateRequired }: { extensionUpdateRequired: boolean },
  settings: Partial<SettingsState>,
  auth: Partial<AuthState>
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
    </Provider>
  );
};

describe("DeploymentModal", () => {
  it("should not render when snoozed", async () => {
    // Tonight I'm going to party like it's 1999
    const date = new Date("12/31/1998");
    MockDate.set(date);

    (useUpdateAvailable as jest.Mock).mockReturnValue(true);

    renderModal(
      {
        extensionUpdateRequired: false,
      },
      {
        ...initialSettingsState,
        nextUpdate: date.getTime() + 1,
      },
      {}
    );

    expect(screen.queryAllByRole("dialog")).toHaveLength(0);
  });

  it("should render modal when snooze expired", async () => {
    const snoozeDate = new Date("12/31/1998");
    MockDate.set(new Date(snoozeDate.getTime() + 1));

    useUpdateAvailableMock.mockReturnValue(true);

    renderModal(
      {
        extensionUpdateRequired: false,
      },
      {
        ...initialSettingsState,
        nextUpdate: snoozeDate.getTime(),
      },
      {}
    );

    expect(await screen.findAllByRole("dialog")).toMatchSnapshot();
    expect(
      screen.queryAllByText(
        "An update to the PixieBrix browser extension is available"
      )
    ).not.toBeNull();
    expect(screen.getByText("Remind Me Later")).not.toBeDisabled();
  });

  it("should render when is enforced", async () => {
    // Tonight I'm going to party like it's 1999
    const date = new Date("12/31/1998");
    MockDate.set(date);

    (useUpdateAvailable as jest.Mock).mockReturnValue(true);

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
      { enforceUpdateMillis: 1 }
    );

    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(await screen.findAllByRole("dialog")).toMatchSnapshot();
    expect(screen.getByText("Remind Me Later")).toBeDisabled();
  });

  it("should render deployment update if update is enforced", async () => {
    // Tonight I'm going to party like it's 1999
    const date = new Date("12/31/1998");
    MockDate.set(date);

    (useUpdateAvailable as jest.Mock).mockReturnValue(false);

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
      { enforceUpdateMillis: 1 }
    );

    expect(reloadMock).toHaveBeenCalledTimes(0);
    expect(await screen.findAllByRole("dialog")).toMatchSnapshot();
    expect(screen.getByText("Remind Me Later")).toBeDisabled();
  });

  it("should reload browser extension if extension update required for deployment", async () => {
    // Tonight I'm going to party like it's 1999
    const date = new Date("12/31/1998");
    MockDate.set(date);

    (useUpdateAvailable as jest.Mock).mockReturnValue(false);

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
      { enforceUpdateMillis: 1 }
    );

    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(await screen.findAllByRole("dialog")).toMatchSnapshot();
    expect(screen.getByText("Remind Me Later")).toBeDisabled();
  });
});

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
import { render } from "@testing-library/react";
import DeploymentModal from "@/options/pages/deployments/DeploymentModal";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import settingsSlice, { initialSettingsState } from "@/store/settingsSlice";
import MockDate from "mockdate";
import { SettingsState } from "@/store/settingsTypes";
import { authSlice } from "@/auth/authSlice";
import { useUpdateAvailable } from "@/options/pages/UpdateBanner";

jest.mock("@/options/pages/UpdateBanner", () => ({
  useUpdateAvailable: jest.fn(),
}));

const useUpdateAvailableMock = useUpdateAvailable as jest.Mock;

const renderModal = (
  { extensionUpdateRequired }: { extensionUpdateRequired: boolean },
  settings: SettingsState
) => {
  const store = configureStore({
    reducer: {
      settings: settingsSlice.reducer,
      auth: authSlice.reducer,
    },
    preloadedState: {
      settings,
      auth: authSlice.getInitialState(),
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

    const rendered = renderModal(
      {
        extensionUpdateRequired: false,
      },
      {
        ...initialSettingsState,
        nextUpdate: date.getTime() + 1,
      }
    );

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("should render modal when snooze expired", async () => {
    const snoozeDate = new Date("12/31/1998");
    MockDate.set(new Date(snoozeDate.getTime() + 1));

    useUpdateAvailableMock.mockReturnValue(true);

    const rendered = renderModal(
      {
        extensionUpdateRequired: false,
      },
      {
        ...initialSettingsState,
        nextUpdate: snoozeDate.getTime(),
      }
    );

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});

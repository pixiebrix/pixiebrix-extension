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

import { useInstallUrl } from "@/options/pages/onboarding/partner/PartnerSetupCard";
import { waitForEffect } from "@/testUtils/testHelpers";
import React from "react";
import { Provider } from "react-redux";
import { HashRouter } from "react-router-dom";
import { getBaseURL } from "@/services/baseService";
import { renderHook } from "@/options/testHelpers";

jest.mock("@/services/baseService", () => ({
  getBaseURL: jest.fn().mockResolvedValue("https://app.pixiebrix.com"),
}));

const getBaseURLMock = getBaseURL as jest.MockedFunction<typeof getBaseURL>;

describe("useInstallUrl", () => {
  it.each(["https://app.pixiebrix.com", "https://app.pixiebrix.com/"])(
    "should return the app install url: %s",
    async (baseURL) => {
      getBaseURLMock.mockResolvedValue(baseURL);

      const result = renderHook(
        () => {
          return useInstallUrl();
        },
        {
          renderWrapper:
            (store) =>
            ({ children }) =>
              (
                <Provider store={store}>
                  <HashRouter>{children}</HashRouter>
                </Provider>
              ),
        }
      );

      await waitForEffect();

      expect(result.result.current).toEqual({
        installURL:
          "https://app.pixiebrix.com/start?partner=automation-anywhere",
        isPending: false,
      });
    }
  );
});

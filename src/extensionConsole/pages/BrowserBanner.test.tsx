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
import { render } from "@/extensionConsole/testHelpers";
import BrowserBanner from "@/extensionConsole/pages/BrowserBanner";
import { waitForEffect } from "@/testUtils/testHelpers";
import { screen } from "@testing-library/react";
import { INTERNAL_reset } from "@/store/enterprise/managedStorage";
import { INTERNAL_reset as resetAsyncExternalStore } from "@/hooks/useAsyncExternalStore";

beforeEach(async () => {
  await INTERNAL_reset();
  resetAsyncExternalStore();
  await browser.storage.managed.clear();
});

describe("BrowserBanner", () => {
  it("renders warning for jest environment", async () => {
    await browser.storage.managed.set({ disableBrowserWarning: false });

    const { asFragment } = render(
      <div>
        <BrowserBanner />
      </div>,
    );

    await waitForEffect();

    expect(
      screen.getByText(
        "PixieBrix officially supports Google Chrome and Microsoft Edge.",
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });

  it("suppress with managed storage", async () => {
    await browser.storage.managed.set({ disableBrowserWarning: true });

    const { asFragment } = render(
      <div>
        <BrowserBanner />
      </div>,
    );

    await waitForEffect();

    expect(
      screen.queryByText(
        "PixieBrix officially supports Google Chrome and Microsoft Edge.",
        {
          exact: false,
        },
      ),
    ).not.toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });
});

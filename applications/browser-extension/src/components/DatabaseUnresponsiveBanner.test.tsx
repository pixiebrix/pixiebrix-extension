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
import { act, screen } from "@testing-library/react";
import { count } from "@/registry/packageRegistry";
import DatabaseUnresponsiveBanner from "@/components/DatabaseUnresponsiveBanner";
import pDefer from "p-defer";

jest.mock("@/registry/packageRegistry");

beforeEach(async () => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("BrowserBanner", () => {
  it("renders warning after timeout", async () => {
    const countMock = jest.mocked(count);
    const deferredPromise = pDefer<number>();
    countMock.mockImplementation(async () => deferredPromise.promise);

    render(
      <div>
        <DatabaseUnresponsiveBanner />
      </div>,
    );

    expect(
      screen.queryByText("trouble connecting", {
        exact: false,
      }),
    ).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(
      screen.getByText("trouble connecting", {
        exact: false,
      }),
    ).toBeInTheDocument();

    await act(async () => {
      deferredPromise.resolve(0);
    });

    // Removed after the promise resolves
    expect(
      screen.queryByText("trouble connecting", {
        exact: false,
      }),
    ).not.toBeInTheDocument();
  });
});

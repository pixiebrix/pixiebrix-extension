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

import WorkshopPage, {
  useEnrichPackageMetadata,
  useSearchOptions,
} from "@/extensionConsole/pages/workshop/WorkshopPage";
import { render, renderHook } from "@/extensionConsole/testHelpers";
import { editablePackageMetadataFactory } from "@/testUtils/factories/registryFactories";
import React from "react";
import { screen } from "@testing-library/react";
import { authStateFactory } from "@/testUtils/factories/authFactories";
import { waitForEffect } from "@/testUtils/testHelpers";
import { authSlice } from "@/auth/authSlice";
import { appApiMock } from "@/testUtils/appApiMock";
import { MemoryRouter } from "react-router";

describe("useSearchOptions", () => {
  it("consolidates reader and block options", () => {
    const packages = [
      editablePackageMetadataFactory({ kind: "Reader" }),
      editablePackageMetadataFactory({ kind: "Block" }),
    ];

    const { result } = renderHook(() => {
      const bricks = useEnrichPackageMetadata(packages);
      return useSearchOptions(bricks);
    });
    expect(result.current).toEqual({
      collectionOptions: [{ label: "test", value: "test" }],
      kindOptions: [{ label: "Brick", value: "Brick" }],
      scopeOptions: [{ label: "[No Scope]", value: undefined }],
    });
  });
});

describe("WorkshopPage", () => {
  it("require account alias", () => {
    const { asFragment } = render(<WorkshopPage />);

    expect(
      screen.getByText(
        "To use the Workshop, you must first set an account alias for your PixieBrix account",
      ),
    ).toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });

  it("renders empty workshop", async () => {
    appApiMock.reset();
    appApiMock.onGet("/api/bricks/").reply(200, []);

    const { asFragment } = render(
      <MemoryRouter>
        <WorkshopPage />
      </MemoryRouter>,
      {
        setupRedux(dispatch) {
          dispatch(
            authSlice.actions.setAuth(
              authStateFactory({
                scope: "workshopuser",
              }),
            ),
          );
        },
      },
    );

    await waitForEffect();

    expect(
      screen.queryByText(
        "To use the Workshop, you must first set an account alias for your PixieBrix account",
      ),
    ).not.toBeInTheDocument();

    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
    expect(screen.getByText("No records found.")).toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });
});

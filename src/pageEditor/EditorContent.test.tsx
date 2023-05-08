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

import { getCurrentURL } from "@/pageEditor/utils";
import { formStateFactory } from "@/testUtils/factories";
import { render, screen } from "@/pageEditor/testHelpers";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import React from "react";
import EditorContent from "@/pageEditor/EditorContent";
import { getInstalledExtensionPoints } from "@/contentScript/messenger/api";

jest.mock("@/services/api", () => {
  const originalModule = jest.requireActual("@/services/api");

  return {
    appApi: {
      ...originalModule.appApi,
      endpoints: {
        ...originalModule.appApi.endpoints,
        getMarketplaceListings: {
          useQueryState: jest.fn(),
        },
      },
    },
    useGetMarketplaceTagsQuery: jest.fn(),
    useGetMarketplaceListingsQuery: jest.fn(),
    useGetEditablePackagesQuery: jest.fn(),
    useCreateRecipeMutation: jest.fn(),
    useUpdateRecipeMutation: jest.fn(),
  };
});
jest.mock("@/components/asyncIcon", () => ({
  useAsyncIcon: jest.fn(),
}));
jest.mock("@/telemetry/events", () => ({
  reportEvent: jest.fn(),
}));
jest.mock("@/permissions/extensionPermissionsHelpers", () => ({
  collectExtensionPermissions: jest.fn().mockResolvedValue({}),
}));
jest.mock("@/background/messenger/api", () => ({
  containsPermissions: jest.fn().mockResolvedValue(true),
}));
// Mock to support hook usage in the subtree, not relevant to UI tests here
jest.mock("@/hooks/useRefreshRegistries");
jest.mock("@/hooks/useTheme", () => ({
  useGetTheme: jest.fn(),
}));

jest.mock("@/pageEditor/utils", () => {
  const actual = jest.requireActual("@/pageEditor/utils");
  return {
    ...actual,
    getCurrentURL: jest.fn(),
  };
});

jest.mock("@/pageEditor/hooks/useCurrentUrl");

jest.mock("@/contentScript/messenger/api", () => ({
  getInstalledExtensionPoints: jest.fn(),
}));

describe("error alerting in the UI", () => {
  test("shows error when checkAvailableDynamicElements fails", async () => {
    const message = "testing error";
    (getCurrentURL as jest.Mock).mockImplementation(() => {
      throw new Error(message);
    });

    const formState = formStateFactory();
    render(<EditorContent />, {
      async setupRedux(dispatch) {
        dispatch(editorActions.addElement(formState));
        dispatch(editorActions.selectElement(formState.uuid));
        await dispatch(editorActions.checkAvailableDynamicElements());
      },
    });

    await waitForEffect();

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  test("shows error when checkAvailableInstalledExtensions fails", async () => {
    const message = "testing error";
    (getInstalledExtensionPoints as jest.Mock).mockImplementation(() => {
      throw new Error(message);
    });

    const formState = formStateFactory();
    render(<EditorContent />, {
      async setupRedux(dispatch) {
        dispatch(editorActions.addElement(formState));
        dispatch(editorActions.selectElement(formState.uuid));
        await dispatch(editorActions.checkAvailableInstalledExtensions());
      },
    });

    await waitForEffect();

    expect(screen.getByText(message)).toBeInTheDocument();
  });
});

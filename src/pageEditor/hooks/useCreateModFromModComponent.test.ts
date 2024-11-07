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

import useCreateModFromModComponent from "@/pageEditor/hooks/useCreateModFromModComponent";
import { renderHook, waitFor } from "@/pageEditor/testHelpers";
import { appApiMock } from "@/testUtils/appApiMock";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { API_PATHS } from "@/data/service/urlPaths";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { act } from "@testing-library/react-hooks";

const reportEventMock = jest.mocked(reportEvent);

jest.mocked(browser.tabs.query).mockResolvedValue([]);

jest.mock("@/telemetry/trace");

jest.mock("@/pageEditor/hooks/useCompareModComponentCounts", () =>
  jest.fn().mockReturnValue(() => true),
);
jest.mock("@/pageEditor/hooks/useCheckModStarterBrickInvariants", () =>
  jest.fn().mockReturnValue(async () => true),
);

describe("useCreateModFromModComponent", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  it("creates mod with no dirty changes", async () => {
    const metadata = modMetadataFactory();
    const menuItemFormState = menuItemFormStateFactory({
      modMetadata: metadata,
    });

    appApiMock
      .onPost(API_PATHS.BRICKS)
      .reply(200, { updated_at: "2024-01-01T00:00:00Z" });

    appApiMock.onGet(API_PATHS.BRICKS).reply(200, []);

    const { result } = renderHook(() => useCreateModFromModComponent(), {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(menuItemFormState));
      },
    });

    await act(async () => {
      await result.current.createModFromComponent(menuItemFormState, metadata, {
        keepLocalCopy: true,
      });
    });

    expect(appApiMock.history.post).toHaveLength(1);

    await waitFor(() => {
      expect(reportEventMock).toHaveBeenCalledWith(
        Events.PAGE_EDITOR_MOD_CREATE,
        expect.any(Object),
      );
    });
  });

  it("errors moving last mod component in a mod", async () => {
    const metadata = modMetadataFactory();
    const menuItemFormState = menuItemFormStateFactory({
      modMetadata: metadata,
    });

    const { result } = renderHook(() => useCreateModFromModComponent(), {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(menuItemFormState));
      },
    });

    await expect(
      result.current.createModFromComponent(menuItemFormState, metadata, {
        keepLocalCopy: false,
      }),
    ).rejects.toThrow("Cannot move the last starter brick in a mod");

    expect(appApiMock.history.post).toHaveLength(0);
  });
});

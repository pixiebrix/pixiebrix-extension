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
import { hookAct, renderHook, waitFor } from "@/pageEditor/testHelpers";
import { appApiMock } from "@/testUtils/appApiMock";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { API_PATHS } from "@/data/service/urlPaths";

const reportEventMock = jest.mocked(reportEvent);
jest.mock("@/telemetry/trace");

describe("useCreateModFromModComponent", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  it("saves with no dirty changes", async () => {
    const metadata = modMetadataFactory();
    const menuItemFormState = menuItemFormStateFactory({
      modMetadata: metadata,
    });

    appApiMock
      .onPost(API_PATHS.BRICKS)
      .reply(200, { updated_at: "2024-01-01T00:00:00Z" });

    const { result } = renderHook(() =>
      useCreateModFromModComponent(menuItemFormState),
    );

    await hookAct(async () => {
      await result.current.createModFromComponent(menuItemFormState, metadata);
    });

    expect(appApiMock.history.post).toHaveLength(1);

    await waitFor(() => {
      expect(reportEventMock).toHaveBeenCalledWith(
        Events.PAGE_EDITOR_MOD_CREATE,
        expect.any(Object),
      );
    });
  });
});

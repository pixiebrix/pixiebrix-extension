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

import useCompareModComponentCounts from "@/pageEditor/hooks/useCompareModComponentCounts";
import useCreateModFromModComponent from "@/pageEditor/hooks/useCreateModFromModComponent";
import { hookAct, renderHook, waitFor } from "@/pageEditor/testHelpers";
import { appApiMock } from "@/testUtils/appApiMock";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import useCheckModStarterBrickInvariants from "@/pageEditor/hooks/useCheckModStarterBrickInvariants";

const reportEventMock = jest.mocked(reportEvent);
jest.mock("@/telemetry/trace");

jest.mock("@/pageEditor/hooks/useCompareModComponentCounts", () =>
  jest.fn().mockReturnValue(() => true),
);
jest.mock("@/pageEditor/hooks/useCheckModStarterBrickInvariants", () =>
  jest.fn().mockReturnValue(async () => true),
);

const compareModComponentCountsMock = jest.mocked(useCompareModComponentCounts);
const checkModStarterBrickInvariantsMock = jest.mocked(
  useCheckModStarterBrickInvariants,
);

describe("useCreateModFromModComponent", () => {
  beforeEach(() => {
    appApiMock.reset();
    compareModComponentCountsMock.mockClear();
  });

  it("saves with no dirty changes", async () => {
    const metadata = modMetadataFactory();
    const menuItemFormState = menuItemFormStateFactory({
      modMetadata: metadata,
    });

    appApiMock
      .onPost("/api/bricks/")
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

  it("does not throw an error if the mod fails the compareModComponentCounts check", async () => {
    compareModComponentCountsMock.mockReturnValue(() => false);
    const metadata = modMetadataFactory();
    const menuItemFormState = menuItemFormStateFactory({
      modMetadata: metadata,
    });

    appApiMock
      .onPost("/api/bricks/")
      .reply(200, { updated_at: "2024-01-01T00:00:00Z" });

    const { result } = renderHook(() =>
      useCreateModFromModComponent(menuItemFormState),
    );

    await hookAct(async () => {
      await result.current.createModFromComponent(menuItemFormState, metadata);
    });

    expect(appApiMock.history.post).toHaveLength(0);
  });

  it("does not throw an error if the mod fails the checkModStarterBrickInvariants check", async () => {
    checkModStarterBrickInvariantsMock.mockReturnValue(async () => false);
    const metadata = modMetadataFactory();
    const menuItemFormState = menuItemFormStateFactory({
      modMetadata: metadata,
    });

    appApiMock
      .onPost("/api/bricks/")
      .reply(200, { updated_at: "2024-01-01T00:00:00Z" });

    const { result } = renderHook(() =>
      useCreateModFromModComponent(menuItemFormState),
    );

    await hookAct(async () => {
      await result.current.createModFromComponent(menuItemFormState, metadata);
    });

    expect(appApiMock.history.post).toHaveLength(0);
  });
});

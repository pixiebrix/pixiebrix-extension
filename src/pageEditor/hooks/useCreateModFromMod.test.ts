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

import { appApiMock } from "@/testUtils/appApiMock";
import {
  modComponentDefinitionFactory,
  modDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { hookAct, renderHook, waitFor } from "@/pageEditor/testHelpers";
import useCreateModFromMod from "@/pageEditor/hooks/useCreateModFromMod";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { array } from "cooky-cutter";
import useCompareModComponentCounts from "@/pageEditor/hooks/useCompareModComponentCounts";
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

describe("useCreateModFromMod", () => {
  beforeEach(() => {
    appApiMock.reset();
    compareModComponentCountsMock.mockClear();
  });

  it("saves with no dirty changes", async () => {
    const metadata = modMetadataFactory();
    const definition = modDefinitionFactory({
      metadata,
    });

    appApiMock
      .onPost("/api/bricks/")
      .reply(200, { updated_at: "2024-01-01T00:00:00Z" });

    const { result } = renderHook(() => useCreateModFromMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentActions.activateMod({
            modDefinition: definition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await hookAct(async () => {
      await result.current.createModFromMod(definition, metadata);
    });

    expect(appApiMock.history.post).toHaveLength(1);
    await waitFor(() => {
      expect(reportEventMock).toHaveBeenCalledWith(
        Events.STARTER_BRICK_ACTIVATE,
        expect.any(Object),
      );
    });

    expect(reportEventMock).toHaveBeenCalledWith(
      Events.MOD_ACTIVATE,
      expect.any(Object),
    );
  });

  it("does not throw an error if the mod fails the compareModComponentCounts check", async () => {
    compareModComponentCountsMock.mockReturnValue(() => false);
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 2),
    });

    appApiMock
      .onPost("/api/bricks/")
      .reply(200, { updated_at: "2024-01-01T00:00:00Z" });

    const { result } = renderHook(() => useCreateModFromMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentActions.activateMod({
            modDefinition: activatedModDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await hookAct(async () => {
      await result.current.createModFromMod(
        activatedModDefinition,
        modMetadata,
      );
    });

    expect(appApiMock.history.post).toHaveLength(0);
  });

  it("does not throw an error if the mod fails the checkModStarterBrickInvariants check", async () => {
    checkModStarterBrickInvariantsMock.mockReturnValue(async () => false);
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 2),
    });

    appApiMock
      .onPost("/api/bricks/")
      .reply(200, { updated_at: "2024-01-01T00:00:00Z" });

    const { result } = renderHook(() => useCreateModFromMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentActions.activateMod({
            modDefinition: activatedModDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await hookAct(async () => {
      await result.current.createModFromMod(
        activatedModDefinition,
        modMetadata,
      );
    });

    expect(appApiMock.history.post).toHaveLength(0);
  });
});

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
import { renderHook } from "@/pageEditor/testHelpers";
import useCreateModFromMod from "@/pageEditor/hooks/useCreateModFromMod";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { array } from "cooky-cutter";
import useCompareModComponentCounts from "@/pageEditor/hooks/useCompareModComponentCounts";
import useCheckModStarterBrickInvariants from "@/pageEditor/hooks/useCheckModStarterBrickInvariants";
import { API_PATHS } from "@/data/service/urlPaths";
import { timestampFactory } from "@/testUtils/factories/stringFactories";
import { DataIntegrityError } from "@/pageEditor/hooks/useBuildAndValidateMod";
import { act } from "@testing-library/react";

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
    const sourceMetadata = modMetadataFactory();
    const sourceDefinition = modDefinitionFactory({
      metadata: sourceMetadata,
    });

    appApiMock
      .onPost(API_PATHS.BRICKS)
      .reply(200, { updated_at: timestampFactory() });

    const { result } = renderHook(() => useCreateModFromMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentActions.activateMod({
            modDefinition: sourceDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await act(async () => {
      await result.current.createModFromMod(
        sourceDefinition,
        modMetadataFactory(),
        { keepLocalCopy: false },
      );
    });

    expect(appApiMock.history.post).toHaveLength(1);

    expect(reportEventMock).toHaveBeenCalledWith(
      Events.MOD_ACTIVATE,
      expect.any(Object),
    );
  });

  it("throws DataIntegrityError if mod fails the compareModComponentCounts check", async () => {
    compareModComponentCountsMock.mockReturnValue(() => false);
    const sourceMetadata = modMetadataFactory();
    const sourceModDefinition = modDefinitionFactory({
      metadata: sourceMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 2),
    });

    appApiMock
      .onPost(API_PATHS.BRICKS)
      .reply(200, { updated_at: "2024-01-01T00:00:00Z" });

    const { result } = renderHook(() => useCreateModFromMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentActions.activateMod({
            modDefinition: sourceModDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await act(async () => {
      await expect(
        result.current.createModFromMod(
          sourceModDefinition,
          modMetadataFactory(),
          { keepLocalCopy: false },
        ),
      ).rejects.toThrow(DataIntegrityError);
    });

    expect(appApiMock.history.post).toHaveLength(0);
  });

  it("throws DataIntegrityError if mod fails the checkModStarterBrickInvariants check", async () => {
    checkModStarterBrickInvariantsMock.mockReturnValue(async () => false);
    const sourceModMetadata = modMetadataFactory();
    const sourceModDefinition = modDefinitionFactory({
      metadata: sourceModMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 2),
    });

    appApiMock
      .onPost(API_PATHS.BRICKS)
      .reply(200, { updated_at: "2024-01-01T00:00:00Z" });

    const { result } = renderHook(() => useCreateModFromMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentActions.activateMod({
            modDefinition: sourceModDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await act(async () => {
      await expect(
        result.current.createModFromMod(
          sourceModDefinition,
          modMetadataFactory(),
          { keepLocalCopy: false },
        ),
      ).rejects.toThrow(DataIntegrityError);
    });

    expect(appApiMock.history.post).toHaveLength(0);
  });
});

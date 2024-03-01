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
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { validateTimestamp } from "@/types/helpers";
import { renderHook, waitFor } from "@/pageEditor/testHelpers";
import { act } from "@testing-library/react-hooks";
import useCreateModFromMod from "@/pageEditor/hooks/useCreateModFromMod";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { actions as extensionsActions } from "@/store/extensionsSlice";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";

const reportEventMock = jest.mocked(reportEvent);

describe("useCreateModFromMod", () => {
  it("saves with no dirty changes", async () => {
    appApiMock.reset();

    const metadata = modMetadataFactory();
    const definition = modDefinitionFactory({
      metadata,
    });

    appApiMock.onPost("/api/bricks/").reply(200, {});

    const { result } = renderHook(() => useCreateModFromMod(), {
      setupRedux(dispatch) {
        dispatch(
          extensionsActions.installMod({
            modDefinition: definition,
            screen: "pageEditor",
            isReinstall: false,
          }),
        );
      },
    });

    await act(async () => {
      await result.current.createModFromMod(
        {
          ...definition,
          updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
        },
        metadata,
      );
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
});

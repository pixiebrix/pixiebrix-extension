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

import { renderHook } from "@/pageEditor/testHelpers";
import useUpsertModComponentFormState from "@/pageEditor/hooks/useUpsertModComponentFormState";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { type ModComponentState } from "@/store/extensionsTypes";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";

const axiosMock = new MockAdapter(axios);
const defaultOptions = {
  checkPermissions: false,
  notifySuccess: true,
  reactivateEveryTab: false,
};

describe("useUpsertModComponentFormState", () => {
  let expectedUpdateDate: Date;

  beforeAll(() => {
    expectedUpdateDate = new Date("2023-01-01");
    jest.useFakeTimers().setSystemTime(expectedUpdateDate);
  });

  beforeEach(() => {
    axiosMock.onGet("/api/bricks/").reply(200, []);
  });

  afterEach(() => {
    axiosMock.reset();
  });

  it("should save form state to redux", async () => {
    const modComponentFormState = formStateFactory();

    const { result, getReduxStore, waitForEffect } = renderHook(() =>
      useUpsertModComponentFormState(),
    );
    await waitForEffect();

    const upsertModComponentFormState = result.current;
    await upsertModComponentFormState({
      modComponentFormState,
      options: defaultOptions,
    });

    const modComponents = selectActivatedModComponents(
      getReduxStore().getState() as { options: ModComponentState },
    );

    expect(modComponents).toHaveLength(1);
    expect(modComponents[0]).toEqual(
      expect.objectContaining({
        id: modComponentFormState.uuid,
        extensionPointId: modComponentFormState.starterBrick.metadata.id,
        updateTimestamp: expectedUpdateDate.toISOString(),
      }),
    );
  });
});

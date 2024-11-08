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

import { type EditorState } from "../pageEditor/store/editor/pageEditorTypes";
import { editorSlice } from "../pageEditor/store/editor/editorSlice";
import {
  getEditorState,
  removeDraftModComponentsByModId,
  saveEditorState,
} from "./editorStorage";
import { modMetadataFactory } from "../testUtils/factories/modComponentFactories";
import { formStateFactory } from "../testUtils/factories/pageEditorFactories";
import { readReduxStorage, setReduxStorage } from "../utils/storageUtils";
import { getMaxMigrationsVersion } from "./migratePersistedState";
import { migrations } from "./editorMigrations";
import { registryIdFactory } from "../testUtils/factories/stringFactories";
import { range } from "lodash";
import type { Nullish } from "../utils/nullishUtils";

jest.mock("../utils/storageUtils", () => {
  const actual = jest.requireActual("@/utils/storageUtils");

  return {
    ...actual,
    readReduxStorage: jest.fn(),
    setReduxStorage: jest.fn(),
  };
});

const readReduxStorageMock = jest.mocked(readReduxStorage);
const setReduxStorageMock = jest.mocked(setReduxStorage);

const currentPersistenceVersion = getMaxMigrationsVersion(migrations);

describe("editorStorage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("removes mod but keeps other form states", async () => {
    const otherFormState = formStateFactory();

    const targetEditorState = editorSlice.reducer(
      undefined,
      editorSlice.actions.addModComponentFormState(otherFormState),
    );

    const modMetadata = modMetadataFactory();

    const modFormStates = range(2).map(() =>
      formStateFactory({
        formStateConfig: {
          modMetadata,
        },
      }),
    );

    let state = targetEditorState;
    for (const formState of modFormStates) {
      state = editorSlice.reducer(
        state,
        editorSlice.actions.addModComponentFormState(formState),
      );
    }

    readReduxStorageMock.mockResolvedValue(state);

    const actualModComponentIds = await removeDraftModComponentsByModId(
      modMetadata.id,
    );

    expect(new Set(actualModComponentIds)).toStrictEqual(
      new Set(modFormStates.map((x) => x.uuid)),
    );

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      {
        ...targetEditorState,
        // When the mod's form states are added, they become active. On remove the active/expanded props are reset
        activeModComponentId: null,
        expandedModId: null,
        selectionSeq: expect.toBeNumber(),
      },
      currentPersistenceVersion,
    );
  });
});

describe("draftModComponentStorage when no state is persisted", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("getEditorState returns undefined when readReduxStorage returns undefined", async () => {
    const state = await getEditorState();
    expect(state).toBeUndefined();
  });

  test.each([undefined, null])(
    "setEditorState is NOP for: %s",
    async (state: Nullish) => {
      await saveEditorState(state as unknown as EditorState);
      expect(setReduxStorageMock).not.toHaveBeenCalled();
    },
  );

  test("removeDraftModComponentsForMod doesn't crash when readReduxStorage returns undefined", async () => {
    await removeDraftModComponentsByModId(registryIdFactory());
    expect.pass("No crash");
  });
});

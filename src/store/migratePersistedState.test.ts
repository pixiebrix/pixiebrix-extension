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

import migratePersistedState from "@/store/migratePersistedState";
import { type MigrationManifest, type PersistedState } from "redux-persist";
import { omit, pick } from "lodash";

describe("migratePersistedState", () => {
  it("converts to persisted state for legacy state inputs", () => {
    const legacyState = {
      foo: "bar",
    };
    const newState = migratePersistedState(legacyState, {});
    expect(newState).toEqual({
      foo: "bar",
      _persist: {
        // Redux-persist defaults to version -1
        version: -1,
        rehydrated: true,
      },
    });
  });

  type OldName = { commonProp: number; oldProp: string };
  type NewName = { commonProp: number; newProp: string };

  const nameMigrations: MigrationManifest = {
    2: (state: OldName & PersistedState) => ({
      ...omit(state, "oldProp"),
      newProp: state.oldProp,
    }),
  };

  it("throws error if migration not provided for state version", () => {
    const oldPersistedState: OldName & PersistedState = {
      commonProp: 123,
      oldProp: "abc",
      _persist: {
        version: 0,
        rehydrated: false,
      },
    };
    expect(() =>
      migratePersistedState(oldPersistedState, nameMigrations),
    ).toThrow("Redux persistence migration not found for version: 0");
  });

  it("handles property name change migration with old state", () => {
    const oldPersistedState: OldName & PersistedState = {
      commonProp: 123,
      oldProp: "abc",
      _persist: {
        version: 1,
        rehydrated: false,
      },
    };
    const newState: NewName = migratePersistedState(
      oldPersistedState,
      nameMigrations,
    );
    expect(newState).toEqual({
      commonProp: 123,
      newProp: "abc",
      _persist: {
        version: 2,
        rehydrated: true,
      },
    });
  });

  it("handles property name change migration with new state", () => {
    const newPersistedState: NewName & PersistedState = {
      commonProp: 123,
      newProp: "abc",
      _persist: {
        version: 2,
        rehydrated: false,
      },
    };
    const newState: NewName = migratePersistedState(
      newPersistedState,
      nameMigrations,
    );
    expect(newState).toEqual({
      commonProp: 123,
      newProp: "abc",
      _persist: {
        version: 2,
        rehydrated: true,
      },
    });
  });

  type Foo = {
    foo: string;
    bar: number;
  };
  type StateV1 = {
    commonProp: number;
    changedProp: Foo[];
  };
  type StateV2 = {
    commonProp: number;
    changedProp: {
      foos: Record<string, number>;
      required: string[];
    };
  };
  type StateV3 = {
    commonProp: number;
    newCommonProp: string;
    newFooProp: {
      foos: Record<string, number>;
      required: string[];
    };
  };
  const migrations: MigrationManifest = {
    2: (state: StateV1 & PersistedState) => ({
      ...state,
      changedProp: {
        foos: Object.fromEntries(
          state.changedProp.map(({ foo, bar }) => [foo, bar]),
        ),
        required: state.changedProp.map(({ foo }) => foo),
      },
    }),
    3: (state: StateV2 & PersistedState) => ({
      ...omit(state, "changedProp"),
      newCommonProp: "defaultNewCommonPropValue",
      newFooProp: state.changedProp,
    }),
  };

  it("handles property structure change with old state", () => {
    const oldPersistedState: StateV1 & PersistedState = {
      commonProp: 123,
      changedProp: [
        { foo: "abc", bar: 456 },
        { foo: "def", bar: 789 },
      ],
      _persist: {
        version: 1,
        rehydrated: false,
      },
    };
    const newState: StateV2 = migratePersistedState(
      oldPersistedState,
      pick(migrations, [2]),
    );
    expect(newState).toEqual({
      commonProp: 123,
      changedProp: {
        foos: {
          abc: 456,
          def: 789,
        },
        required: ["abc", "def"],
      },
      _persist: {
        version: 2,
        rehydrated: true,
      },
    });
  });

  it("handles property structure change with new state", () => {
    const newPersistedState: StateV2 & PersistedState = {
      commonProp: 123,
      changedProp: {
        foos: {
          abc: 456,
          def: 789,
        },
        required: ["abc", "def"],
      },
      _persist: {
        version: 2,
        rehydrated: false,
      },
    };
    const newState: StateV2 = migratePersistedState(
      newPersistedState,
      pick(migrations, [2]),
    );
    expect(newState).toEqual({
      commonProp: 123,
      changedProp: {
        foos: {
          abc: 456,
          def: 789,
        },
        required: ["abc", "def"],
      },
      _persist: {
        version: 2,
        rehydrated: true,
      },
    });
  });

  it("handles property structure change with old state and multiple migrations", () => {
    const oldPersistedState: StateV1 & PersistedState = {
      commonProp: 123,
      changedProp: [
        { foo: "abc", bar: 456 },
        { foo: "def", bar: 789 },
      ],
      _persist: {
        version: 1,
        rehydrated: false,
      },
    };
    const newState: StateV3 = migratePersistedState(
      oldPersistedState,
      migrations,
    );
    expect(newState).toEqual({
      commonProp: 123,
      newCommonProp: "defaultNewCommonPropValue",
      newFooProp: {
        foos: {
          abc: 456,
          def: 789,
        },
        required: ["abc", "def"],
      },
      _persist: {
        version: 3,
        rehydrated: true,
      },
    });
  });

  it("handles property structure change with new state and multiple migrations", () => {
    const newPersistedState: StateV3 & PersistedState = {
      commonProp: 123,
      newCommonProp: "myNewCommonPropValue",
      newFooProp: {
        foos: {
          abc: 456,
          def: 789,
        },
        required: ["abc", "def"],
      },
      _persist: {
        version: 3,
        rehydrated: false,
      },
    };
    const newState: StateV3 = migratePersistedState(
      newPersistedState,
      migrations,
    );
    expect(newState).toEqual({
      ...newPersistedState,
      _persist: {
        version: 3,
        rehydrated: true,
      },
    });
  });

  function inferPersistedVersion(
    state: StateV1 | StateV2 | StateV3,
  ): 1 | 2 | 3 {
    if ("newCommonProp" in state && "newFooProp" in state) {
      return 3;
    }

    if (Array.isArray(state.changedProp)) {
      return 1;
    }

    return 2;
  }

  it("handles property structure change with v1 state and multiple migrations, with inferred versions", () => {
    const v1State: StateV1 = {
      commonProp: 123,
      changedProp: [
        { foo: "abc", bar: 456 },
        { foo: "def", bar: 789 },
      ],
    };
    const newState: StateV3 & PersistedState = migratePersistedState(
      v1State,
      migrations,
      inferPersistedVersion,
    );
    expect(newState).toEqual({
      commonProp: 123,
      newCommonProp: "defaultNewCommonPropValue",
      newFooProp: {
        foos: {
          abc: 456,
          def: 789,
        },
        required: ["abc", "def"],
      },
      _persist: {
        version: 3,
        rehydrated: true,
      },
    });
  });

  it("handles property structure change with v2 state and multiple migrations, with inferred versions", () => {
    const v2State: StateV2 = {
      commonProp: 123,
      changedProp: {
        foos: {
          abc: 456,
          def: 789,
        },
        required: ["abc", "def"],
      },
    };
    const newState: StateV3 & PersistedState = migratePersistedState(
      v2State,
      migrations,
      inferPersistedVersion,
    );
    expect(newState).toEqual({
      commonProp: 123,
      newCommonProp: "defaultNewCommonPropValue",
      newFooProp: {
        foos: {
          abc: 456,
          def: 789,
        },
        required: ["abc", "def"],
      },
      _persist: {
        version: 3,
        rehydrated: true,
      },
    });
  });

  it("handles property structure change with v3 state and multiple migrations, with inferred versions", () => {
    const v3State: StateV3 = {
      commonProp: 123,
      newCommonProp: "myNewCommonPropValue",
      newFooProp: {
        foos: {
          abc: 456,
          def: 789,
        },
        required: ["abc", "def"],
      },
    };
    const newState: StateV3 & PersistedState = migratePersistedState(
      v3State,
      migrations,
      inferPersistedVersion,
    );
    expect(newState).toEqual({
      ...v3State,
      _persist: {
        version: 3,
        rehydrated: true,
      },
    });
  });

  it("handles state with default version -1", () => {
    const state = {
      foo: "bar",
      _persist: {
        version: -1,
        rehydrated: false,
      },
    };
    const newState = migratePersistedState(state, {});
    expect(newState).toEqual({
      foo: "bar",
      _persist: {
        version: -1,
        rehydrated: true,
      },
    });
  });
});

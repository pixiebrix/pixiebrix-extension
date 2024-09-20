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

import {
  createMigrationsManifest,
  createModMetadataForStandaloneComponent,
  inferModComponentStateVersion,
  migrateStandaloneComponentsToMods,
} from "@/store/modComponents/modComponentMigrations";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import {
  autoUUIDSequence,
  timestampFactory,
} from "@/testUtils/factories/stringFactories";
import { omit, toLower } from "lodash";
import {
  type ModComponentStateV0,
  type ModComponentStateV1,
  type ModComponentStateV2,
  type ModComponentStateV3,
  type ModComponentStateV4,
  type ModComponentStateV5,
  type ModComponentStateVersions,
} from "@/store/modComponents/modComponentTypes";
import { type MigrationManifest, type PersistedState } from "redux-persist";
import {
  type ActivatedModComponent,
  type ActivatedModComponentV1,
  type ActivatedModComponentV2,
  type SerializedModComponentV1,
} from "@/types/modComponentTypes";
import { produce } from "immer";
import type {
  IntegrationDependencyV1,
  IntegrationDependencyV2,
} from "@/integrations/integrationTypes";
import type { FactoryConfig } from "cooky-cutter/dist/define";

const testUserScope = "@test-user";

jest.mock("@/auth/authUtils", () => {
  const actual = jest.requireActual("@/auth/authUtils");
  return {
    ...actual,
    getUserScope: jest.fn(() => testUserScope),
  };
});

describe("createModMetadataForStandaloneComponent", () => {
  it("creates correct metadata", () => {
    const componentId = autoUUIDSequence();
    const componentLabel = "My Test Mod Component";
    const componentUpdateTimestamp = timestampFactory();
    const component = activatedModComponentFactory({
      id: componentId,
      label: componentLabel,
      updateTimestamp: componentUpdateTimestamp,
    });
    expect(
      createModMetadataForStandaloneComponent(component, testUserScope),
    ).toEqual({
      ...component,
      _recipe: {
        id: `${testUserScope}/converted/${toLower(componentId)}`,
        name: componentLabel,
        version: "1.0.0",
        description: "Page Editor mod automatically converted to a package",
        sharing: {
          public: false,
          organizations: [],
        },
        updated_at: componentUpdateTimestamp,
      },
    });
  });
});

describe("migrateStandaloneComponentsToMods", () => {
  it("does not throw error when extensions is empty", () => {
    expect(migrateStandaloneComponentsToMods([], testUserScope)).toEqual([]);
  });

  it("returns mod components when there are no standalone components", () => {
    const modMetadata = modMetadataFactory();
    const modComponents = [
      activatedModComponentFactory({
        _recipe: modMetadata,
      }),
      activatedModComponentFactory({
        _recipe: modMetadata,
      }),
      activatedModComponentFactory({
        _recipe: modMetadata,
      }),
    ];

    expect(
      migrateStandaloneComponentsToMods(modComponents, testUserScope),
    ).toEqual(modComponents);
  });

  it("returns only mod components when userScope is null", () => {
    const modMetadata = modMetadataFactory();
    const modComponents = [
      activatedModComponentFactory({
        _recipe: modMetadata,
      }),
      activatedModComponentFactory({
        _recipe: modMetadata,
      }),
      activatedModComponentFactory({
        _recipe: modMetadata,
      }),
    ];
    const standaloneComponents = [
      activatedModComponentFactory(),
      activatedModComponentFactory(),
    ];

    expect(
      migrateStandaloneComponentsToMods(
        [...modComponents, ...standaloneComponents],
        null,
      ),
    ).toEqual(modComponents);
  });

  it("converts standalone components correctly", () => {
    const modMetadata = modMetadataFactory();
    const modComponents = [
      activatedModComponentFactory({
        _recipe: modMetadata,
      }),
      activatedModComponentFactory({
        _recipe: modMetadata,
      }),
      activatedModComponentFactory({
        _recipe: modMetadata,
      }),
    ];
    const standaloneComponents = [
      activatedModComponentFactory(),
      activatedModComponentFactory(),
    ];
    const migratedStandaloneComponents = standaloneComponents.map((component) =>
      createModMetadataForStandaloneComponent(component, testUserScope),
    );

    expect(
      migrateStandaloneComponentsToMods(
        [...modComponents, ...standaloneComponents],
        testUserScope,
      ),
    ).toEqual([...modComponents, ...migratedStandaloneComponents]);
  });
});

const initialStateV0: ModComponentStateV0 & PersistedState = {
  extensions: {},
  _persist: {
    version: 0,
    rehydrated: false,
  },
};
const initialStateV1: ModComponentStateV1 & PersistedState = {
  extensions: [],
  // Functions under test do not handle updating the persistence object, this
  // is handled by redux-persist. We are only including this to make TS happy.
  _persist: {
    version: 0,
    rehydrated: false,
  },
};
const initialStateV2: ModComponentStateV2 & PersistedState = {
  extensions: [],
  // Functions under test do not handle updating the persistence object, this
  // is handled by redux-persist. We are only including this to make TS happy.
  _persist: {
    version: 0,
    rehydrated: false,
  },
};
const initialStateV3: ModComponentStateV3 & PersistedState = {
  extensions: [],
  // Functions under test do not handle updating the persistence object, this
  // is handled by redux-persist. We are only including this to make TS happy.
  _persist: {
    version: 0,
    rehydrated: false,
  },
};
const initialStateV4: ModComponentStateV4 & PersistedState = {
  extensions: [],
  // Functions under test do not handle updating the persistence object, this
  // is handled by redux-persist. We are only including this to make TS happy.
  _persist: {
    version: 0,
    rehydrated: false,
  },
};
const initialStateV5: ModComponentStateV5 & PersistedState = {
  activatedModComponents: [],
  deletedModComponentsByModId: {},
  // Functions under test do not handle updating the persistence object, this
  // is handled by redux-persist. We are only including this to make TS happy.
  _persist: {
    version: 0,
    rehydrated: false,
  },
};

function unmigrateStateV5toV4(
  state: ModComponentStateV5 & PersistedState,
): ModComponentStateV4 & PersistedState {
  return {
    ...omit(state, "activatedModComponents"),
    extensions: state.activatedModComponents,
  };
}

// Convert back from mods to standalone components
function unmigrateStateV4toV3(
  state: ModComponentStateV4 & PersistedState,
): ModComponentStateV3 & PersistedState {
  return {
    ...state,
    extensions: state.extensions.map((extension) => {
      if (extension._recipe?.id?.startsWith(`${testUserScope}/converted/`)) {
        return produce(extension, (draft) => {
          draft._recipe = undefined;
        });
      }

      return extension;
    }),
  };
}

function unmigrateServices(
  integrationDependencies: IntegrationDependencyV2[] = [],
): IntegrationDependencyV1[] {
  return integrationDependencies.map(
    ({ integrationId, outputKey, configId, isOptional, apiVersion }) => ({
      id: integrationId,
      outputKey,
      config: configId,
      isOptional,
      apiVersion,
    }),
  );
}

function unmigrateActivatedV2ToActivatedV1(
  activated: ActivatedModComponentV2,
): ActivatedModComponentV1 {
  return {
    ...omit(activated, "integrationDependencies"),
    services: unmigrateServices(activated.integrationDependencies),
  };
}

// Convert integrationDependencies field on each extension back to services field
function unmigrateStateV3toV2(
  state: ModComponentStateV3 & PersistedState,
): ModComponentStateV2 & PersistedState {
  return {
    ...state,
    extensions: state.extensions.map((extension) =>
      unmigrateActivatedV2ToActivatedV1(extension),
    ),
  };
}

function unmigrateActivatedV1ToSerializedV1(
  activated: ActivatedModComponentV1,
): SerializedModComponentV1 {
  return omit(activated, "createTimestamp", "updateTimestamp", "active");
}

function unmigrateStateV2toV1(
  state: ModComponentStateV2 & PersistedState,
): ModComponentStateV1 & PersistedState {
  return {
    ...state,
    extensions: state.extensions.map((extension) =>
      unmigrateActivatedV1ToSerializedV1(extension),
    ),
  };
}

function unmigrateStateV1toV0(
  state: ModComponentStateV1 & PersistedState,
): ModComponentStateV0 & PersistedState {
  const unmigratedExtensions: Record<
    string,
    Record<string, SerializedModComponentV1>
  > = {};

  for (const extension of state.extensions) {
    const extensionPointRecord =
      unmigratedExtensions[extension.extensionPointId] || {};
    extensionPointRecord[extension.id] = extension;
    unmigratedExtensions[extension.extensionPointId] = extensionPointRecord;
  }

  return {
    ...state,
    extensions: unmigratedExtensions,
  };
}

const activatedFactoryV2 = activatedModComponentFactory;

const activatedFactoryV1 = (
  override?: FactoryConfig<ActivatedModComponent>,
) => {
  const activatedV2 = activatedFactoryV2(override);
  return unmigrateActivatedV2ToActivatedV1(activatedV2);
};

const serializedFactoryV1 = (
  override?: FactoryConfig<ActivatedModComponent>,
) => {
  const activatedV1 = activatedFactoryV1(override);
  return unmigrateActivatedV1ToSerializedV1(activatedV1);
};

describe("inferModComponentStateVersion", () => {
  const serialized1 = serializedFactoryV1();
  const serialized2 = serializedFactoryV1({
    extensionPointId: serialized1.extensionPointId,
  });
  const serialized3 = serializedFactoryV1();

  it("infers version 0 correctly", () => {
    const state: ModComponentStateV0 = {
      extensions: {
        [serialized1.extensionPointId]: {
          [serialized1.id]: serialized1,
          [serialized2.id]: serialized2,
        },
        [serialized3.extensionPointId]: {
          [serialized3.id]: serialized3,
        },
      },
    };

    expect(inferModComponentStateVersion(state)).toBe(0);
  });

  it("infers version 1 correctly", () => {
    const state: ModComponentStateV1 = {
      extensions: [serialized1, serialized2, serialized3],
    };

    expect(inferModComponentStateVersion(state)).toBe(1);
  });

  it("infers version 2 correctly", () => {
    const state: ModComponentStateV2 = {
      extensions: [
        activatedFactoryV1(),
        activatedFactoryV1(),
        activatedFactoryV1(),
      ],
    };

    expect(inferModComponentStateVersion(state)).toBe(2);
  });

  it("infers version 3 correctly", () => {
    const sharedModMetadata = modMetadataFactory();
    // V3 state should have "extensions" field with ActivatedModComponentV2[]
    // type, and have at least one "standalone" mod component present (no _recipe).
    const state: ModComponentStateV3 = {
      extensions: [
        activatedFactoryV2(),
        activatedFactoryV2(),
        activatedFactoryV2({
          _recipe: modMetadataFactory(),
        }),
        activatedFactoryV2({
          _recipe: sharedModMetadata,
        }),
        activatedFactoryV2({
          _recipe: sharedModMetadata,
        }),
      ],
    };

    expect(inferModComponentStateVersion(state)).toBe(3);
  });

  it("infers version 4 correctly", () => {
    const sharedModMetadata = modMetadataFactory();
    // V4 state should have "extensions" field with ActivatedModComponentV2[]
    // type, and all components should have a _recipe present.
    const state: ModComponentStateV4 = {
      extensions: [
        activatedFactoryV2({
          _recipe: modMetadataFactory(),
        }),
        activatedFactoryV2({
          _recipe: sharedModMetadata,
        }),
        activatedFactoryV2({
          _recipe: sharedModMetadata,
        }),
      ],
    };

    expect(inferModComponentStateVersion(state)).toBe(4);
  });

  it("infers version 5 correctly", () => {
    const sharedModMetadata = modMetadataFactory();
    // V4 state should have "extensions" field with ActivatedModComponentV2[]
    // type, and all components should have a _recipe present.
    const state: ModComponentStateV5 = {
      activatedModComponents: [
        activatedFactoryV2({
          _recipe: modMetadataFactory(),
        }),
        activatedFactoryV2({
          _recipe: sharedModMetadata,
        }),
        activatedFactoryV2({
          _recipe: sharedModMetadata,
        }),
      ],
      deletedModComponentsByModId: {},
    };

    expect(inferModComponentStateVersion(state)).toBe(5);
  });

  it("throws an error for unknown version", () => {
    const state = {
      newField: "foo",
    } as unknown as ModComponentStateVersions;

    expect(() => inferModComponentStateVersion(state)).toThrow();
  });
});

describe("mod component state migrations", () => {
  let migrationsManifest: MigrationManifest | undefined;
  let migrateModComponentStateV0ToV1:
    | ((state: PersistedState) => PersistedState)
    | undefined;
  let migrateModComponentStateV1ToV2:
    | ((state: PersistedState) => PersistedState)
    | undefined;
  let migrateModComponentStateV2toV3:
    | ((state: PersistedState) => PersistedState)
    | undefined;
  let migrateModComponentStateV3toV4:
    | ((state: PersistedState) => PersistedState)
    | undefined;
  let migrateModComponentStateV4toV5:
    | ((state: PersistedState) => PersistedState)
    | undefined;

  const serialized1 = serializedFactoryV1();
  const serialized2 = serializedFactoryV1({
    extensionPointId: serialized1.extensionPointId,
  });
  const serialized3 = serializedFactoryV1();

  beforeAll(async () => {
    // Migrations for mod component state are created dynamically, so we
    // need to instantiate everything here in an async beforeAll. Describe
    // block does not accept promises.
    migrationsManifest = await createMigrationsManifest();

    migrateModComponentStateV0ToV1 = migrationsManifest[1];
    migrateModComponentStateV1ToV2 = migrationsManifest[2];
    migrateModComponentStateV2toV3 = migrationsManifest[3];
    migrateModComponentStateV3toV4 = migrationsManifest[4];
    migrateModComponentStateV4toV5 = migrationsManifest[5];
  });

  describe("migrateModComponentState V0 to V1", () => {
    const expectedStateV1: ModComponentStateV1 & PersistedState = {
      ...initialStateV1,
      extensions: [serialized1, serialized2, serialized3],
    };

    it("migrates initial state", () => {
      expect(migrateModComponentStateV0ToV1!(initialStateV0)).toStrictEqual(
        initialStateV1,
      );
    });

    it("migrates state with components", () => {
      const unmigrated = unmigrateStateV1toV0(expectedStateV1);
      expect(migrateModComponentStateV0ToV1!(unmigrated)).toStrictEqual(
        expectedStateV1,
      );
    });

    it("does not migrate or throw with wrong version", () => {
      expect(migrateModComponentStateV0ToV1!(expectedStateV1)).toStrictEqual(
        expectedStateV1,
      );
    });
  });

  describe("migrateModComponentState V1 to V2", () => {
    const activated1 = activatedFactoryV1();
    const sharedModMetadata = modMetadataFactory();
    const activated2 = activatedFactoryV1({
      _recipe: sharedModMetadata,
    });
    const activated3 = activatedFactoryV1({
      _recipe: sharedModMetadata,
    });

    const expectedStateV2: ModComponentStateV2 & PersistedState = {
      ...initialStateV2,
      extensions: [activated1, activated2, activated3],
    };

    it("migrates initial state", () => {
      expect(migrateModComponentStateV1ToV2!(initialStateV1)).toStrictEqual(
        initialStateV2,
      );
    });

    it("migrates state with components", () => {
      const unmigrated = unmigrateStateV2toV1(expectedStateV2);
      // Timestamps on the components won't match, so we need to omit them (createTimestamp, updateTimestamp)
      expect(migrateModComponentStateV1ToV2!(unmigrated)).toEqual(
        expect.objectContaining({
          extensions: expect.arrayContaining([
            expect.objectContaining(
              omit(activated1, "createTimestamp", "updateTimestamp"),
            ),
            expect.objectContaining(
              omit(activated2, "createTimestamp", "updateTimestamp"),
            ),
            expect.objectContaining(
              omit(activated3, "createTimestamp", "updateTimestamp"),
            ),
          ]),
        }),
      );
    });

    it("does not migrate or throw with wrong version", () => {
      expect(migrateModComponentStateV1ToV2!(expectedStateV2)).toStrictEqual(
        expectedStateV2,
      );
    });
  });

  describe("migrateModComponentState V2 to V3", () => {
    const activated1 = activatedFactoryV2();
    const activated2 = activatedFactoryV2();
    const sharedModMetadata = modMetadataFactory();
    const activated3 = activatedFactoryV2({
      _recipe: sharedModMetadata,
    });
    const activated4 = activatedFactoryV2({
      _recipe: sharedModMetadata,
    });

    const expectedStateV3: ModComponentStateV3 & PersistedState = {
      ...initialStateV3,
      extensions: [activated1, activated2, activated3, activated4],
    };

    it("migrates initial state", () => {
      expect(migrateModComponentStateV2toV3!(initialStateV2)).toStrictEqual(
        initialStateV3,
      );
    });

    it("migrates state with components", () => {
      const unmigrated = unmigrateStateV3toV2(expectedStateV3);
      expect(migrateModComponentStateV2toV3!(unmigrated)).toStrictEqual(
        expectedStateV3,
      );
    });

    it("does not migrate or throw with wrong version", () => {
      expect(migrateModComponentStateV2toV3!(expectedStateV3)).toStrictEqual(
        expectedStateV3,
      );
    });
  });

  describe("migrateModComponentState V3 to V4", () => {
    // Simulate a migrated standalone component
    const activated1 = createModMetadataForStandaloneComponent(
      activatedFactoryV2(),
      testUserScope,
    );

    // Create two regular mod components of a mod
    const sharedModMetadata = modMetadataFactory();
    const activated2 = activatedFactoryV2({
      _recipe: sharedModMetadata,
    });
    const activated3 = activatedFactoryV2({
      _recipe: sharedModMetadata,
    });

    const expectedStateV4: ModComponentStateV4 & PersistedState = {
      ...initialStateV4,
      extensions: [activated1, activated2, activated3],
    };

    it("migrates initial state", () => {
      expect(migrateModComponentStateV3toV4!(initialStateV3)).toStrictEqual(
        initialStateV4,
      );
    });

    it("migrates state with components", () => {
      const unmigrated = unmigrateStateV4toV3(expectedStateV4);
      expect(migrateModComponentStateV3toV4!(unmigrated)).toStrictEqual(
        expectedStateV4,
      );
    });

    it("does not migrate or throw with wrong version", () => {
      expect(migrateModComponentStateV3toV4!(expectedStateV4)).toStrictEqual(
        expectedStateV4,
      );
    });
  });

  describe("migrateModComponentState V4 to V5", () => {
    // Simulate a migrated standalone component
    const activated1 = createModMetadataForStandaloneComponent(
      activatedFactoryV2(),
      testUserScope,
    );

    // Create two regular mod components of a mod
    const sharedModMetadata = modMetadataFactory();
    const activated2 = activatedFactoryV2({
      _recipe: sharedModMetadata,
    });
    const activated3 = activatedFactoryV2({
      _recipe: sharedModMetadata,
    });

    const expectedStateV5: ModComponentStateV5 & PersistedState = {
      ...initialStateV5,
      activatedModComponents: [activated1, activated2, activated3],
    };

    it("migrates initial state", () => {
      expect(migrateModComponentStateV4toV5!(initialStateV4)).toStrictEqual(
        initialStateV5,
      );
    });

    it("migrates state with components", () => {
      const unmigrated = unmigrateStateV5toV4(expectedStateV5);
      expect(migrateModComponentStateV4toV5!(unmigrated)).toStrictEqual(
        expectedStateV5,
      );
    });

    it("does not migrate or throw with wrong version", () => {
      expect(migrateModComponentStateV4toV5!(expectedStateV5)).toStrictEqual(
        expectedStateV5,
      );
    });
  });
});

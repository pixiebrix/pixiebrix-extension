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
  createModMetadataForStandaloneComponent,
  migrateStandaloneComponentsToMods,
} from "@/store/extensionsMigrations";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import {
  autoUUIDSequence,
  timestampFactory,
} from "@/testUtils/factories/stringFactories";
import { toLower } from "lodash";

const testUserScope = "@test-user";

describe("createModMetadataForStandaloneComponent", () => {
  it("creates mod metadata for standalone component", () => {
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

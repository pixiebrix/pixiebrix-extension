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

import buildModsList from "@/extensionConsole/pages/mods/utils/buildModsList";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { validateRegistryId } from "@/types/helpers";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { modInstanceFactory } from "@/testUtils/factories/modInstanceFactories";
import { type ModInstance } from "@/types/modInstanceTypes";
import { mapActivatedModComponentsToModInstance } from "@/store/modComponents/modInstanceUtils";
import { array } from "cooky-cutter";
import { omit } from "lodash";
import {
  teamSharingDefinitionFactory,
  publicSharingDefinitionFactory,
} from "@/testUtils/factories/registryFactories";

const userScope = "my-test-user";

describe("buildModsList", () => {
  it("returns an empty array when inputs are empty", () => {
    expect(buildModsList(userScope, new Map(), [])).toEqual([]);
  });

  it("filters known personal and team mod definitions correctly", () => {
    // Personal, inactive (i.e., no mod instance)
    const inactivePersonalModDefinition = modDefinitionFactory({
      metadata: modMetadataFactory({
        id: validateRegistryId(`${userScope}/personal-inactive`),
      }),
    });

    // Personal, active
    const personalModInstance = modInstanceFactory({
      definition: modDefinitionFactory({
        metadata: modMetadataFactory({
          id: validateRegistryId(`${userScope}/personal-active`),
        }),
      }),
    });

    // Team shared, inactive
    const inactiveSharedModDefinition = modDefinitionFactory({
      sharing: teamSharingDefinitionFactory(),
    });

    // Team shared, active
    const sharedModInstance = modInstanceFactory({
      definition: modDefinitionFactory({
        sharing: teamSharingDefinitionFactory(),
      }),
    });

    // Public mod, inactive -- should be filtered out
    const inactivePublicModDefinition = modDefinitionFactory({
      sharing: publicSharingDefinitionFactory(),
    });

    // Public mod, active
    const publicModInstance = modInstanceFactory({
      definition: modDefinitionFactory({
        sharing: publicSharingDefinitionFactory(),
      }),
    });

    const modInstances: ModInstance[] = [
      personalModInstance,
      sharedModInstance,
      publicModInstance,
    ];

    const allModDefinitions: ModDefinition[] = [
      inactivePersonalModDefinition,
      inactiveSharedModDefinition,
      inactivePublicModDefinition,
      ...modInstances.map((modInstance) => modInstance.definition),
    ];

    const result = buildModsList(
      userScope,
      new Map(modInstances.map((x) => [x.definition.metadata.id, x])),
      allModDefinitions,
    );

    expect(result).toStrictEqual([
      // Public mods that are not activated should be filtered out. So inactivePublicModDefinition won't be present
      expect.objectContaining({
        metadata: inactivePersonalModDefinition.metadata,
      }),
      expect.objectContaining({
        metadata: inactiveSharedModDefinition.metadata,
      }),
      expect.objectContaining({
        metadata: personalModInstance.definition.metadata,
      }),
      expect.objectContaining({
        metadata: sharedModInstance.definition.metadata,
      }),
      expect.objectContaining({
        metadata: publicModInstance.definition.metadata,
      }),
    ]);
  });

  it("handles unavailable mods correctly", () => {
    // Not activated
    const personalModMetadata = modMetadataFactory({
      id: validateRegistryId(`${userScope}/my-test-mod`),
    });
    const activatedModMetadata = modMetadataFactory();

    const allModDefinitions = [
      modDefinitionFactory({
        metadata: personalModMetadata,
      }),
      modDefinitionFactory({
        metadata: activatedModMetadata,
      }),
    ];

    // Has activated mod components, but no available mod definition
    const unavailableModMetadata = modMetadataFactory();

    const modInstances = (
      [
        [personalModMetadata, 1],
        [activatedModMetadata, 3],
        [unavailableModMetadata, 2],
      ] as const
    ).map(([metadata, count]) =>
      mapActivatedModComponentsToModInstance(
        array(
          activatedModComponentFactory,
          count,
        )({
          _recipe: metadata,
        }),
      ),
    );

    const result = buildModsList(
      userScope,
      new Map(modInstances.map((x) => [x.definition.metadata.id, x])),
      allModDefinitions,
    );

    expect(result).toStrictEqual([
      expect.objectContaining({ metadata: personalModMetadata }),
      expect.objectContaining({ metadata: activatedModMetadata }),
      expect.objectContaining({
        metadata: omit(unavailableModMetadata, ["updated_at", "sharing"]),
        isStub: true,
      }),
    ]);
  });

  it("shows one unavailable mod correctly", () => {
    const modInstance = modInstanceFactory();

    const result = buildModsList(
      userScope,
      new Map([modInstance].map((x) => [x.definition.metadata.id, x])),
      [],
    );

    expect(result).toStrictEqual([
      expect.objectContaining({
        metadata: modInstance.definition.metadata,
        isStub: true,
      }),
    ]);
  });
});

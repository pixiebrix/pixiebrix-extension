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
import type { ActivatedModComponent } from "@/types/modComponentTypes";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { validateRegistryId } from "@/types/helpers";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";

const userScope = "my-test-user";

describe("buildModsList", () => {
  it("returns an empty array when inputs are empty", () => {
    expect(buildModsList(userScope, [], [], new Set())).toEqual([]);
  });

  it("filters known personal and team mod definitions correctly", () => {
    const allModDefinitions: ModDefinition[] = [];
    const activatedModComponents: ActivatedModComponent[] = [];

    // Personal, inactive
    const inactivePersonalModMetadata = modMetadataFactory({
      id: validateRegistryId(`${userScope}/my-inactive-test-mod`),
    });
    allModDefinitions.push(
      modDefinitionFactory({
        metadata: inactivePersonalModMetadata,
      }),
    );

    // Personal, active
    const activePersonalModMetadata = modMetadataFactory({
      id: validateRegistryId(`${userScope}/my-inactive-test-mod`),
    });
    allModDefinitions.push(
      modDefinitionFactory({
        metadata: activePersonalModMetadata,
      }),
    );
    activatedModComponents.push(
      activatedModComponentFactory({
        _recipe: activePersonalModMetadata,
      }),
    );

    // Team shared, inactive
    const inactiveSharedModMetadata = modMetadataFactory();
    allModDefinitions.push(
      modDefinitionFactory({
        metadata: inactiveSharedModMetadata,
        sharing: {
          public: true,
          organizations: [autoUUIDSequence()],
        },
      }),
    );

    // Team shared, active
    const activeSharedModMetadata = modMetadataFactory();
    allModDefinitions.push(
      modDefinitionFactory({
        metadata: activeSharedModMetadata,
        sharing: {
          public: true,
          organizations: [autoUUIDSequence()],
        },
      }),
    );
    activatedModComponents.push(
      activatedModComponentFactory({
        _recipe: activeSharedModMetadata,
      }),
      activatedModComponentFactory({
        _recipe: activeSharedModMetadata,
      }),
      activatedModComponentFactory({
        _recipe: activeSharedModMetadata,
      }),
      activatedModComponentFactory({
        _recipe: activeSharedModMetadata,
      }),
    );

    // Public mod, inactive -- should be filtered out
    const inactivePublicModMetadata = modMetadataFactory();
    allModDefinitions.push(
      modDefinitionFactory({
        metadata: inactivePublicModMetadata,
        sharing: {
          public: true,
          organizations: [],
        },
      }),
    );

    // Public mod, active
    const activePublicModMetadata = modMetadataFactory();
    allModDefinitions.push(
      modDefinitionFactory({
        metadata: activePublicModMetadata,
        sharing: {
          public: true,
          organizations: [],
        },
      }),
    );
    activatedModComponents.push(
      activatedModComponentFactory({
        _recipe: activePublicModMetadata,
      }),
      activatedModComponentFactory({
        _recipe: activePublicModMetadata,
      }),
    );

    const result = buildModsList(
      userScope,
      activatedModComponents,
      allModDefinitions,
      new Set(activatedModComponents.map(({ _recipe }) => _recipe!.id)),
    );

    expect(result).toStrictEqual([
      expect.objectContaining({ metadata: inactivePersonalModMetadata }),
      expect.objectContaining({ metadata: activePersonalModMetadata }),
      expect.objectContaining({ metadata: inactiveSharedModMetadata }),
      expect.objectContaining({ metadata: activeSharedModMetadata }),
      // Public mods that are not activated should be filtered out
      // expect.objectContaining({ metadata: inactivePublicModMetadata }),
      expect.objectContaining({ metadata: activePublicModMetadata }),
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

    const activatedModComponents = [
      activatedModComponentFactory({
        _recipe: personalModMetadata,
      }),
      activatedModComponentFactory({
        _recipe: activatedModMetadata,
      }),
      activatedModComponentFactory({
        _recipe: activatedModMetadata,
      }),
      activatedModComponentFactory({
        _recipe: activatedModMetadata,
      }),
      activatedModComponentFactory({
        _recipe: unavailableModMetadata,
      }),
      activatedModComponentFactory({
        _recipe: unavailableModMetadata,
      }),
    ];

    const result = buildModsList(
      userScope,
      activatedModComponents,
      allModDefinitions,
      new Set(activatedModComponents.map(({ _recipe }) => _recipe!.id)),
    );

    expect(result).toStrictEqual([
      expect.objectContaining({ metadata: personalModMetadata }),
      expect.objectContaining({ metadata: activatedModMetadata }),
      expect.objectContaining({
        metadata: unavailableModMetadata,
        isStub: true,
      }),
    ]);
  });

  it("shows one unavailable mod correctly", () => {
    // Has activated mod components, but no available mod definition
    const unavailableModMetadata = modMetadataFactory();

    const activatedModComponents = [
      activatedModComponentFactory({
        _recipe: unavailableModMetadata,
      }),
    ];

    const result = buildModsList(
      userScope,
      activatedModComponents,
      [],
      new Set(activatedModComponents.map(({ _recipe }) => _recipe!.id)),
    );

    expect(result).toStrictEqual([
      expect.objectContaining({
        metadata: unavailableModMetadata,
        isStub: true,
      }),
    ]);
  });
});

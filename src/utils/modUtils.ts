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
  type ModDefinition,
  type ModOptionsDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import * as semver from "semver";
import { type Organization } from "@/types/contract";
import {
  type Mod,
  type SharingSource,
  type SharingType,
  type UnavailableMod,
} from "@/types/modTypes";
import { createSelector } from "@reduxjs/toolkit";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import {
  type HydratedModComponent,
  type ModComponentBase,
  type ModComponentRef,
  type SerializedModComponent,
} from "@/types/modComponentTypes";
import { DefinitionKinds, type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { InvalidTypeError } from "@/errors/genericErrors";
import { assertNotNullish, type Nullishable } from "./nullishUtils";
import {
  minimalSchemaFactory,
  minimalUiSchemaFactory,
  propertiesToSchema,
} from "@/utils/schemaUtils";
import { cloneDeep, mapValues, sortBy } from "lodash";
import { isNullOrBlank } from "@/utils/stringUtils";
import {
  type Schema,
  type SchemaProperties,
  type UiSchema,
} from "@/types/schemaTypes";
import { produce } from "immer";
import { isStarterBrickDefinitionLike } from "@/starterBricks/types";
import { normalizeStarterBrickDefinitionProp } from "@/starterBricks/starterBrickUtils";
import { type MessageContext } from "@/types/loggerTypes";

/**
 * Returns the ModComponentRef for a given mod component.
 * @see mapMessageContextToModComponentRef
 */
export function getModComponentRef(
  modComponent: HydratedModComponent,
): ModComponentRef {
  return {
    extensionId: modComponent.id,
    blueprintId: modComponent._recipe?.id,
    extensionPointId: modComponent.extensionPointId,
  };
}

/**
 * Returns the MessageContext associated with `modComponent`.
 * @see mapMessageContextToModComponentRef
 */
export function mapModComponentToMessageContext(
  modComponent: HydratedModComponent,
): MessageContext {
  return {
    // The step label will be re-assigned later in reducePipeline
    label: modComponent.label ?? undefined,
    extensionLabel: modComponent.label ?? undefined,
    extensionId: modComponent.id,
    extensionPointId: modComponent.extensionPointId,
    deploymentId: modComponent._deployment?.id,
    blueprintId: modComponent._recipe?.id,
    blueprintVersion: modComponent._recipe?.version,
  };
}

/**
 * Returns the message context for a ModComponentRef. For use with passing to reportEvent
 * @see selectEventData
 */
export function mapModComponentRefToMessageContext(
  modComponentRef: ModComponentRef,
): MessageContext {
  // Fields are currently named the same. In the future, the fields might temporarily diverge.
  return {
    extensionId: modComponentRef.extensionId,
    extensionPointId: modComponentRef.extensionPointId,
    // MessageContext expects undefined instead of null/undefined
    blueprintId: modComponentRef.blueprintId ?? undefined,
  };
}

/**
 * Returns the ModComponentRef for a given Logger MessageContext. Only call from running bricks with an associated
 * mod component and starter brick in the context.
 *
 * @see getModComponentRef
 * @see mapModComponentToMessageContext
 * @throws TypeError if the extensionId or extensionPointId is missing
 */
export function mapMessageContextToModComponentRef(
  context: MessageContext,
): ModComponentRef {
  assertNotNullish(
    context.extensionId,
    "extensionId is required for ModComponentRef",
  );
  assertNotNullish(
    context.extensionPointId,
    "extensionPointId is required for ModComponentRef",
  );

  return {
    extensionId: context.extensionId,
    blueprintId: context.blueprintId,
    extensionPointId: context.extensionPointId,
  };
}

/**
 * Returns true if the mod is an UnavailableMod, i.e., a mod the user no longer has access to.
 * @see UnavailableMod
 */
export function isUnavailableMod(mod: Mod): mod is UnavailableMod {
  return "isStub" in mod && mod.isStub;
}

/**
 * Returns true if the mod is a standalone HydratedModComponent, instead of a mod definition.
 */
export function isStandaloneModComponent(
  mod: Mod,
): mod is HydratedModComponent {
  return "extensionPointId" in mod;
}

/**
 * Return true if the mod is an ModComponentBase that originated from a mod.
 */
export function isModComponentFromMod(mod: Mod): boolean {
  return isStandaloneModComponent(mod) && Boolean(mod._recipe);
}

/**
 * Return true if the mod is a ModDefinition or UnavailableMod
 */
export function isModDefinition(
  mod: Mod,
): mod is ModDefinition | UnavailableMod {
  return (
    mod && "kind" in mod && mod.kind === DefinitionKinds.MOD && "sharing" in mod
  );
}

/**
 * Returns a unique id for the mod. Suitable for use as a React key
 */
export function getUniqueId(mod: Mod): UUID | RegistryId {
  return isStandaloneModComponent(mod) ? mod.id : mod.metadata.id;
}

/**
 * Returns the human-readable label for the mod
 */
export function getLabel(mod: Mod): string {
  return isStandaloneModComponent(mod) ? mod.label : mod.metadata.name;
}

/**
 * Returns the description for the mod
 */
export const getDescription = (mod: Mod): string => {
  if (isStandaloneModComponent(mod)) {
    return mod._recipe?.description ?? "Created in the Page Editor";
  }

  return mod.metadata.description ?? "No description";
};

/**
 * Return the registry id associated with a mod, or undefined
 */
export function getPackageId(mod: Mod): RegistryId | undefined {
  return isStandaloneModComponent(mod) ? mod._recipe?.id : mod.metadata.id;
}

/**
 * Returns the timestamp for the time the mod was last updated (edited)
 */
export function getUpdatedAt(mod: Mod): string | null {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- See TODO below
  return isStandaloneModComponent(mod)
    ? // @ts-expect-error -- TODO: need to figure out why updateTimestamp isn't included on ModComponentBase here
      mod._recipe?.updated_at ?? mod.updateTimestamp
    : mod.updated_at;
}

function isPublic(mod: Mod): boolean {
  return isStandaloneModComponent(mod)
    ? mod._recipe?.sharing?.public ?? false
    : mod.sharing.public;
}

function isPersonalModComponent(modComponent: ModComponentBase): boolean {
  return !modComponent._recipe && !modComponent._deployment;
}

/**
 * Returns true if the source of the mod component has the given scope
 */
function hasSourceModWithScope(
  modComponent: ModComponentBase,
  scope: string,
): boolean {
  return Boolean(scope && modComponent._recipe?.id.startsWith(scope + "/"));
}

/**
 * Returns true if the mod has the given scope
 */
function hasRegistryScope(
  modDefinition: ModDefinition | UnavailableMod,
  scope: string,
): boolean {
  return Boolean(modDefinition.metadata?.id.startsWith(scope + "/"));
}

/**
 * Returns true if the user directly owns the mod
 * @param mod the mod
 * @param userScope the user's scope, or null if it's not set
 */
function isPersonal(mod: Mod, userScope: Nullishable<string>): boolean {
  if (isStandaloneModComponent(mod)) {
    return (
      isPersonalModComponent(mod) ||
      Boolean(userScope && hasSourceModWithScope(mod, userScope))
    );
  }

  return Boolean(userScope && hasRegistryScope(mod, userScope));
}

export function getInstalledVersionNumber(
  installedExtensions: SerializedModComponent[],
  mod: Mod,
): string | undefined {
  if (isStandaloneModComponent(mod)) {
    return mod._recipe?.version;
  }

  const installedExtension = installedExtensions.find(
    (extension: SerializedModComponent) =>
      extension._recipe?.id === mod.metadata.id,
  );

  return installedExtension?._recipe?.version;
}

export function isDeployment(
  mod: Mod,
  installedComponents: SerializedModComponent[],
): boolean {
  if (isStandaloneModComponent(mod)) {
    return Boolean(mod._deployment);
  }

  const modId = mod.metadata.id;
  return installedComponents.some(
    (component) => component._recipe?.id === modId && component?._deployment,
  );
}

export function getSharingSource({
  mod,
  organizations,
  scope,
  installedExtensions,
}: {
  mod: Mod;
  organizations: Organization[];
  scope: Nullishable<string>;
  installedExtensions: SerializedModComponent[];
}): SharingSource {
  let sharingType: SharingType | null = null;
  const organization = getOrganization(mod, organizations);

  if (!isModDefinition(mod) && !isStandaloneModComponent(mod)) {
    const error = new InvalidTypeError(
      "Mod is not a ModDefinition or ResolvedModComponent",
      { mod, organization, scope, installedExtensions },
    );

    throw error;
  }

  let label: string;
  if (isPersonal(mod, scope)) {
    sharingType = "Personal";
  } else if (isDeployment(mod, installedExtensions)) {
    sharingType = "Deployment";
    // There's a corner case for team deployments of marketplace bricks. The organization will come through as
    // nullish here.
    if (organization?.name) {
      label = organization.name;
    }
  } else if (organization) {
    sharingType = "Team";
    label = organization.name;
  } else if (isPublic(mod)) {
    sharingType = "Public";
  } else {
    sharingType = "Unknown";
  }

  label ??= sharingType;

  return {
    type: sharingType,
    label,
    organization,
  };
}

export function updateAvailable(
  availableMods: Map<RegistryId, ModDefinition>,
  activatedMods: Map<RegistryId, SerializedModComponent>,
  mod: Mod,
): boolean {
  if (isUnavailableMod(mod)) {
    // Unavailable mods are never update-able
    return false;
  }

  const activatedMod = isModDefinition(mod)
    ? activatedMods.get(mod.metadata.id)
    : mod;

  if (!activatedMod?._recipe) {
    return false;
  }

  const availableMod = availableMods.get(activatedMod._recipe.id);

  if (!availableMod) {
    return false;
  }

  // TODO: Drop assertions once the types are tighter
  // https://github.com/pixiebrix/pixiebrix-extension/pull/7010#discussion_r1410080332
  assertNotNullish(
    activatedMod._recipe.version,
    "The requested mod doesn't have a version",
  );
  assertNotNullish(
    availableMod.metadata.version,
    "The mod component's mod doesn't have a version",
  );

  if (semver.gt(availableMod.metadata.version, activatedMod._recipe.version)) {
    return true;
  }

  if (semver.eq(availableMod.metadata.version, activatedMod._recipe.version)) {
    // Check the updated_at timestamp
    if (activatedMod._recipe?.updated_at == null) {
      // Extension was installed prior to us adding updated_at to RecipeMetadata
      return false;
    }

    const availableDate = new Date(availableMod.updated_at);
    const installedDate = new Date(activatedMod._recipe.updated_at);

    return availableDate > installedDate;
  }

  return false;
}

function getOrganization(
  mod: Mod,
  organizations: Organization[],
): Organization | undefined {
  const sharing = isStandaloneModComponent(mod)
    ? mod._recipe?.sharing
    : mod.sharing;

  if (!sharing || sharing.organizations.length === 0) {
    return undefined;
  }

  // If more than one sharing organization, use the first.
  // This is an uncommon scenario.
  return organizations.find(
    (org) => org.id && sharing.organizations.includes(org.id),
  );
}

/**
 * Select ActivatedModComponents currently activated from the mod.
 */
export const selectComponentsFromMod = createSelector(
  [selectActivatedModComponents, (_state: unknown, mod: Mod) => mod],
  (activeModComponents, mod) =>
    isModDefinition(mod)
      ? activeModComponents.filter(
          (extension) => extension._recipe?.id === mod.metadata.id,
        )
      : activeModComponents.filter((x) => x.id === mod.id),
);

/**
 * Returns a minimal mod options definition in a normalized format.
 */
export function emptyModOptionsDefinitionFactory(): Required<ModOptionsDefinition> {
  return {
    schema: minimalSchemaFactory(),
    uiSchema: minimalUiSchemaFactory(),
  };
}

/**
 * Normalize the `options` section of a mod definition, ensuring that it has a schema and uiSchema.
 * @since 1.8.5
 */
export function normalizeModOptionsDefinition(
  optionsDefinition: ModDefinition["options"] | null,
): Required<ModDefinition["options"]> {
  if (!optionsDefinition) {
    return emptyModOptionsDefinitionFactory();
  }

  const modDefinitionSchema = optionsDefinition.schema ?? {};
  const schema: Schema =
    "type" in modDefinitionSchema &&
    modDefinitionSchema.type === "object" &&
    "properties" in modDefinitionSchema
      ? modDefinitionSchema
      : // Handle case where schema is just the properties. That's the old format. Technically, this isn't possible
        // given the type signature. But be defensive because this method processes user-defined mod definitions.
        propertiesToSchema(
          modDefinitionSchema as SchemaProperties,
          Object.keys(modDefinitionSchema as SchemaProperties),
        );

  const uiSchema: UiSchema = cloneDeep(optionsDefinition.uiSchema ?? {});

  uiSchema["ui:order"] ??= [
    ...sortBy(Object.keys(schema.properties ?? {})),
    "*",
  ];

  return {
    schema,
    uiSchema,
  };
}

/**
 * Return the activation instructions for a mod as markdown, or null if there are none.
 */
export function getModActivationInstructions(
  modDefinition: ModDefinition,
): string | null {
  const description: string | undefined =
    // Be defensive -- technically schema is required if options exists
    modDefinition.options?.schema?.description;

  if (!description) {
    return null;
  }

  return isNullOrBlank(description) ? null : description.trim();
}

/**
 * Normalize the shape of a mod definition (e.g., for roundtrip test assertions).
 */
export function normalizeModDefinition<
  T extends UnsavedModDefinition = UnsavedModDefinition,
>(definition: T): T {
  return produce(definition, (draft) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type error due to nested readonly string array
    draft.options = normalizeModOptionsDefinition(draft.options) as any;
    draft.definitions = mapValues(
      draft.definitions ?? {},
      (innerDefinition) => {
        if (isStarterBrickDefinitionLike(innerDefinition)) {
          return {
            ...innerDefinition,
            definition: normalizeStarterBrickDefinitionProp(
              innerDefinition.definition,
            ),
          };
        }

        return innerDefinition;
      },
    );
  });
}

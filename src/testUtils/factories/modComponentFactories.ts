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

import { define, derive, extend } from "cooky-cutter";
import {
  type ActivatedModComponent,
  type ModComponentBase,
  type ModComponentRef,
  type ModMetadata,
} from "@/types/modComponentTypes";
import {
  autoUUIDSequence,
  registryIdFactory,
  timestampFactory,
  uuidSequence,
} from "@/testUtils/factories/stringFactories";
import { type ApiVersion } from "@/types/runtimeTypes";
import { validateRegistryId } from "@/types/helpers";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import {
  DefinitionKinds,
  type Metadata,
  type RegistryId,
} from "@/types/registryTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { getStandaloneModComponentRuntimeModId } from "@/utils/modUtils";
import { validateTimestamp } from "@/utils/timeUtils";
import { minimalSchemaFactory } from "@/utils/schemaUtils";

export const modComponentRefFactory = define<ModComponentRef>({
  // Don't repeat UUIDs across contexts
  modComponentId: () => autoUUIDSequence(),
  modId: registryIdFactory,
  starterBrickId: registryIdFactory,
});

/**
 * Factory for a mod component ref from a standalone mod component.
 * @deprecated standalone mod components are deprecated
 * @since 2.0.6 provides a internal mod id instead of `undefined`
 */
export const standaloneModComponentRefFactory = define<ModComponentRef>({
  // Don't repeat UUIDs across contexts
  modComponentId: () => autoUUIDSequence(),
  modId: derive<ModComponentRef, RegistryId>((ref) => {
    assertNotNullish(
      ref.modComponentId,
      "modComponentId is required to derive modId",
    );
    return getStandaloneModComponentRuntimeModId(ref.modComponentId);
  }, "modComponentId"),
  starterBrickId: registryIdFactory,
});

export const modMetadataFactory = extend<Metadata, ModMetadata>(
  metadataFactory,
  {
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
    sharing: sharingDefinitionFactory,
  },
);

const modComponentConfigFactory = define<ModComponentBase["config"]>({
  apiVersion: "v3" as ApiVersion,
  kind: DefinitionKinds.BRICK,
  metadata: (n: number) =>
    metadataFactory({
      id: validateRegistryId(`test/component-${n}`),
      name: "Test config",
    }),
  inputSchema() {
    return {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {},
      required: [] as string[],
    };
  },

  // `action` is the pipeline prop for the button starter brick
  action() {
    return [
      {
        id: "@pixiebrix/browser/open-tab",
        config: {
          url: "http://www.amazon.com/s",
          params: {
            url: "search-alias={{{department}}}{{^department}}all{{/department}}&field-keywords={{{query}}}",
          },
        },
      },
    ];
  },
});

export const modComponentFactory = define<ModComponentBase>({
  id: uuidSequence,
  apiVersion: "v3" as ApiVersion,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: undefined,
  _deployment: undefined,
  label: "Test label",
  integrationDependencies(): IntegrationDependency[] {
    return [];
  },
  config: modComponentConfigFactory,
  variables: () => ({
    schema: minimalSchemaFactory(),
  }),
  active: true,
});

export const activatedModComponentFactory = extend<
  ModComponentBase,
  ActivatedModComponent
>(modComponentFactory, {
  createTimestamp: timestampFactory,
  updateTimestamp: timestampFactory,
  active: true,
  _serializedModComponentBrand: undefined as never,
});

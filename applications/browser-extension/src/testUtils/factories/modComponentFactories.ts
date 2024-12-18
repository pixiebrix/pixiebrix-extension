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

import { define, extend } from "cooky-cutter";
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
import { validateRegistryId } from "@/types/helpers";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { personalSharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import { type Metadata } from "@/types/registryTypes";
import { validateTimestamp } from "@/utils/timeUtils";
import { minimalSchemaFactory } from "@/utils/schemaUtils";

export const modComponentRefFactory = define<ModComponentRef>({
  // Don't repeat UUIDs across contexts
  modComponentId: () => autoUUIDSequence(),
  modId: registryIdFactory,
  starterBrickId: registryIdFactory,
});

export const modMetadataFactory = extend<Metadata, ModMetadata>(
  metadataFactory,
  {
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
    sharing: personalSharingDefinitionFactory,
  },
);

export const modComponentConfigFactory = define<ModComponentBase["config"]>({
  apiVersion: "v3",
  metadata: (n: number) =>
    metadataFactory({
      id: validateRegistryId(`test/component-${n}`),
      name: "Test config",
    }),

  inputSchema: minimalSchemaFactory,

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
  apiVersion: "v3",
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  // @since 2.1.5 includes mod metadata
  modMetadata: modMetadataFactory,
  deploymentMetadata: undefined,
  label: "Test label",
  integrationDependencies(): IntegrationDependency[] {
    return [];
  },
  config: modComponentConfigFactory,
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

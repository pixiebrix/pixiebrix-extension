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

import { define, derive, type FactoryConfig } from "cooky-cutter";
import { type Brick } from "@/types/brickTypes";
import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import { type UUID } from "@/types/stringTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { minimalSchemaFactory } from "@/utils/schemaUtils";
import type { BrickDefinition } from "@/bricks/transformers/brickFactory";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import type { PackageConfigDetail } from "@/types/contract";
import type { ModDefinition } from "@/types/modDefinitionTypes";

export const brickFactory = define<Brick>({
  id: (i: number) => validateRegistryId(`testing/block-${i}`),
  name: derive<Brick, string>((x: Brick) => `Block ${x.id}`, "id"),
  inputSchema: null as Schema,
  permissions: emptyPermissionsFactory(),
  run: jest.fn(),
  isPure: jest.fn(),
  isRootAware: jest.fn(),
  getRequiredCapabilities: jest.fn().mockResolvedValue([]),
});

export const brickConfigFactory = define<BrickConfig>({
  instanceId: uuidSequence,
  id: (i: number) => validateRegistryId(`testing/block-${i}`),
  config: () => ({}),
});

export const pipelineFactory: (
  blockConfigOverride?: FactoryConfig<BrickConfig>,
) => BrickPipeline = (blockConfigProps) => {
  const brickConfig1 = brickConfigFactory(blockConfigProps);
  const brickConfig2 = brickConfigFactory(blockConfigProps);

  return [brickConfig1, brickConfig2] as BrickPipeline;
};

/**
 * User-defined brick definition factory.
 * @see BrickConfig
 */
export const brickDefinitionFactory = define<BrickDefinition>({
  metadata: metadataFactory,
  kind: "component",
  inputSchema: minimalSchemaFactory,
  pipeline: pipelineFactory,
});

export function packageConfigDetailFactory({
  modDefinition,
  packageVersionUUID,
}: {
  modDefinition: ModDefinition;
  packageVersionUUID?: UUID;
}): PackageConfigDetail {
  const { sharing, updated_at, ...config } = modDefinition;
  return {
    id: packageVersionUUID || uuidSequence(0),
    name: modDefinition.metadata.id,
    verbose_name: modDefinition.metadata.name,
    kind: modDefinition.kind,
    config,
    sharing,
    updated_at,
  };
}

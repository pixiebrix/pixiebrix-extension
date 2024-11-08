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

import { define, derive, extend, type FactoryConfig } from "cooky-cutter";
import { type Brick } from "../../types/brickTypes";
import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import { type UUID } from "../../types/stringTypes";
import { registryIdSequence, uuidSequence } from "./stringFactories";
import { normalizeSemVerString } from "../../types/helpers";
import { emptyPermissionsFactory } from "../../permissions/permissionsUtils";
import { minimalSchemaFactory } from "../../utils/schemaUtils";
import type { BrickDefinition } from "@/bricks/transformers/brickFactory";
import { metadataFactory } from "./metadataFactory";
import type { Reader } from "../../types/bricks/readerTypes";
import type { PackageConfigDetail } from "../../types/contract";
import type { ModDefinition } from "../../types/modDefinitionTypes";
import { DefinitionKinds } from "../../types/registryTypes";

export const brickFactory = define<Brick>({
  id: registryIdSequence,
  name: derive<Brick, string>((x: Brick) => `Brick ${x.id}`, "id"),
  version: normalizeSemVerString("1.0.0"),
  inputSchema: minimalSchemaFactory,
  permissions: emptyPermissionsFactory,
  run: jest.fn(),
  isPure: jest.fn(),
  isRootAware: jest.fn(),
  isPageStateAware: jest.fn(),
  getRequiredCapabilities: jest.fn().mockResolvedValue([]),
  defaultOutputKey: null,
});

export const readerBrickFactory = extend<Brick, Reader>(brickFactory, {
  isAvailable: jest.fn().mockResolvedValue(true),
  read: jest.fn().mockResolvedValue({}),
});

/**
 * Factory for the configuration of a brick in a pipeline.
 * @see pipelineFactory
 */
export const brickConfigFactory = define<BrickConfig>({
  // XXX: consider dropping instanceId from the primary factory because it's only set in Page Editor
  instanceId: uuidSequence,
  id: registryIdSequence,
  config: () => ({}),
});

export const pipelineFactory: (
  brickConfigOverride?: FactoryConfig<BrickConfig>,
) => BrickPipeline = (brickConfigOverride) => {
  const brickConfig1 = brickConfigFactory(brickConfigOverride);
  const brickConfig2 = brickConfigFactory(brickConfigOverride);

  return [brickConfig1, brickConfig2] as BrickPipeline;
};

/**
 * User-defined brick definition factory.
 * @see BrickConfig
 */
export const brickDefinitionFactory = define<BrickDefinition>({
  metadata: metadataFactory,
  kind: DefinitionKinds.BRICK,
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

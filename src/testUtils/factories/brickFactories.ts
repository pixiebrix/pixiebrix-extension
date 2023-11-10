/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";

export const brickFactory = define<Brick>({
  id: (i: number) => validateRegistryId(`testing/block-${i}`),
  name: derive<Brick, string>((x: Brick) => `Block ${x.id}`, "id"),
  inputSchema: null as Schema,
  permissions: emptyPermissionsFactory(),
  run: jest.fn(),
  isPure: jest.fn(),
  isRootAware: jest.fn(),
});

export const brickConfigFactory = define<BrickConfig>({
  instanceId: uuidSequence,
  id: (i: number) => validateRegistryId(`testing/block-${i}`),
  config: () => ({}),
});

export const pipelineFactory: (
  blockConfigOverride?: FactoryConfig<BrickConfig>
) => BrickPipeline = (blockConfigProps) => {
  const brickConfig1 = brickConfigFactory(blockConfigProps);
  const brickConfig2 = brickConfigFactory(blockConfigProps);

  return [brickConfig1, brickConfig2] as BrickPipeline;
};

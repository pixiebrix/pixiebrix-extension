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

import brickRegistry from "@/bricks/registry";
import { featureFlagBrick, simpleInput } from "./testHelpers";
import { reducePipeline } from "../reducePipeline";
import { reduceOptionsFactory } from "../../testUtils/factories/runtimeFactories";
import { TEST_overrideFeatureFlags } from "@/auth/featureFlagStorage";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([featureFlagBrick]);
});

describe("flagged brick", () => {
  test("throws for flagged brick", async () => {
    await TEST_overrideFeatureFlags([]);

    const pipeline = [
      {
        id: featureFlagBrick.id,
        config: {},
      },
    ];

    await expect(
      reducePipeline(pipeline, simpleInput({}), reduceOptionsFactory("v3")),
    ).rejects.toThrow("Brick not available");
  });

  test("allows flagged brick if flag present", async () => {
    await TEST_overrideFeatureFlags([featureFlagBrick.featureFlag]);

    const pipeline = [
      {
        id: featureFlagBrick.id,
        config: {},
      },
    ];

    await expect(
      reducePipeline(pipeline, simpleInput({}), reduceOptionsFactory("v3")),
    ).resolves.toStrictEqual({});
  });
});

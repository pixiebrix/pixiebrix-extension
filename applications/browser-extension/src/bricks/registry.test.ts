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

import bricksRegistry from "./registry";
import { registry as backgroundRegistry } from "@/background/messenger/api";
import { echoBrick } from "../runtime/pipelineTests/testHelpers";
import { type PackageVersion, parsePackage } from "../registry/packageRegistry";
import {
  brickDefinitionFactory,
  readerBrickFactory,
} from "../testUtils/factories/brickFactories";
import { array } from "cooky-cutter";
import type { BrickDefinition } from "./transformers/brickFactory";
import type { RegistryId } from "@/types/registryTypes";

const backgroundGetByKindsMock = jest.mocked(backgroundRegistry.getByKinds);
const backgroundFindMock = jest.mocked(backgroundRegistry.find);

function mapDefinitionToPackageVersion(
  definition: BrickDefinition,
): PackageVersion {
  return {
    // Cast to any due to Metadata index-signature mismatch
    ...parsePackage(definition as any),
    timestamp: new Date(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  backgroundGetByKindsMock.mockResolvedValue([]);

  bricksRegistry.TEST_reset();
});

describe("bricksMap", () => {
  test("can add and read a brick", async () => {
    const brick = readerBrickFactory();
    bricksRegistry.register([brick]);
    const typedBricks = await bricksRegistry.allTyped();
    const typedBrick = typedBricks.get(brick.id);

    expect(typedBrick!.type).toBe("reader");
    expect(typedBrick!.block).toBe(brick);
  });

  test("returns bricks of multiple registrations", async () => {
    const bricks = array(readerBrickFactory, 2)();

    bricksRegistry.register(bricks);
    const enrichedBlocks = await bricksRegistry.allTyped();

    for (const brick of bricks) {
      expect(enrichedBlocks.get(brick.id)!.type).toBe("reader");
      expect(enrichedBlocks.get(brick.id)!.block).toBe(brick);
    }
  });

  test("caches the typed bricks", async () => {
    backgroundGetByKindsMock.mockResolvedValueOnce([
      mapDefinitionToPackageVersion(brickDefinitionFactory()),
      mapDefinitionToPackageVersion(brickDefinitionFactory()),
    ]);

    jest.spyOn(bricksRegistry, "all");

    // First call loads the blocks
    let blocks = await bricksRegistry.allTyped();

    expect(bricksRegistry.all).toHaveBeenCalledTimes(1);
    expect(blocks.size).toBe(2);

    // Second call uses the cache
    blocks = await bricksRegistry.allTyped();

    expect(bricksRegistry.all).toHaveBeenCalledTimes(1);
    expect(blocks.size).toBe(2);
  });
});

describe("bricksRegistry", () => {
  test("reads single JS block", async () => {
    bricksRegistry.register([echoBrick]);
    await expect(bricksRegistry.all()).resolves.toEqual([echoBrick]);
    expect(bricksRegistry.cached).toEqual([echoBrick]);
  });

  test("does not register invalid brick", async () => {
    const validBrick = mapDefinitionToPackageVersion(brickDefinitionFactory());
    const invalidBrick = mapDefinitionToPackageVersion(
      brickDefinitionFactory(),
    );
    // No pipeline makes the brick invalid
    delete invalidBrick.config.pipeline;

    backgroundGetByKindsMock.mockResolvedValueOnce([validBrick, invalidBrick]);

    const bricks = await bricksRegistry.all();
    expect(bricks.map((x) => x.id)).toEqual([validBrick.id]);
  });

  test("preserves JS bricks on clear", async () => {
    bricksRegistry.register([echoBrick]);
    bricksRegistry.clear();
    await expect(bricksRegistry.all()).resolves.toEqual([echoBrick]);
    expect(bricksRegistry.cached).toEqual([echoBrick]);

    bricksRegistry.clear();
    await expect(bricksRegistry.lookup(echoBrick.id)).resolves.toEqual(
      echoBrick,
    );
  });

  test("cached getter throws on uninitialized cache", async () => {
    bricksRegistry.register([echoBrick]);
    bricksRegistry.clear();
    expect(bricksRegistry.isCachedInitialized).toBe(false);
    expect(() => bricksRegistry.cached).toThrow("Cache not initialized");
  });

  test("cache uninitialized until all()", async () => {
    const brickDefinition = brickDefinitionFactory();
    const brick = mapDefinitionToPackageVersion(brickDefinition);

    backgroundGetByKindsMock.mockResolvedValueOnce([brick]);
    backgroundFindMock.mockImplementation(async (id: RegistryId) => {
      if (id === brick.id) {
        return brick;
      }
    });

    bricksRegistry.register([echoBrick]);

    await expect(
      bricksRegistry.lookup(brickDefinition.metadata.id),
    ).resolves.not.toThrow();

    expect(bricksRegistry.isCachedInitialized).toBe(false);

    await bricksRegistry.allTyped();
    expect(bricksRegistry.isCachedInitialized).toBe(true);
  });
});

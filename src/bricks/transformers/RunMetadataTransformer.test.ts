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

import RunMetadataTransformer from "@/bricks/transformers/RunMetadataTransformer";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import {
  brickOptionsFactory,
  runMetadataFactory,
} from "@/testUtils/factories/runtimeFactories";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import ConsoleLogger from "@/utils/ConsoleLogger";
import type { SemVerString } from "@/types/registryTypes";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import { mapModComponentRefToMessageContext } from "@/utils/modUtils";

const brick = new RunMetadataTransformer();

describe("RunMetadataTransformer", () => {
  it("returns packaged mod metadata", async () => {
    const modComponentRef = modComponentRefFactory();

    const logger = new ConsoleLogger({
      ...mapModComponentRefToMessageContext(modComponentRef),
      modVersion: "1.0.0" as SemVerString,
    });

    const result = await brick.run(
      unsafeAssumeValidArg({}),
      brickOptionsFactory({
        meta: runMetadataFactory({ modComponentRef }),
        logger,
      }),
    );

    expect(result).toEqual({
      modComponentId: modComponentRef.modComponentId,
      deploymentId: null,
      mod: {
        id: modComponentRef.modId,
        version: "1.0.0",
      },
      runId: null,
    });
  });

  it("returns deployed mod metadata", async () => {
    const deploymentId = autoUUIDSequence();

    const brickOptions = brickOptionsFactory();
    brickOptions.logger = brickOptions.logger.childLogger({
      modVersion: "1.0.0" as SemVerString,
      deploymentId,
    });

    const {
      modComponentRef: { modComponentId, modId },
      runId,
    } = brickOptions.meta;

    const result = await brick.run(unsafeAssumeValidArg({}), brickOptions);

    expect(result).toEqual({
      runId,
      modComponentId,
      deploymentId,
      mod: {
        id: modId,
        version: "1.0.0",
      },
    });
  });
});

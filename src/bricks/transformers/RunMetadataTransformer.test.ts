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

import RunMetadataTransformer from "@/bricks/transformers/RunMetadataTransformer";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import {
  autoUUIDSequence,
  registryIdFactory,
} from "@/testUtils/factories/stringFactories";
import ConsoleLogger from "@/utils/ConsoleLogger";
import type { SemVerString } from "@/types/registryTypes";

const brick = new RunMetadataTransformer();

describe("RunMetadataTransformer", () => {
  it("returns standalone mod metadata", async () => {
    const extensionId = autoUUIDSequence();
    const logger = new ConsoleLogger({
      extensionId,
    });

    const result = await brick.run(
      unsafeAssumeValidArg({}),
      brickOptionsFactory({
        logger,
      }),
    );

    expect(result).toEqual({
      componentId: extensionId,
      deploymentId: null,
      mod: null,
      runId: null,
    });
  });

  it("returns packaged mod metadata", async () => {
    const extensionId = autoUUIDSequence();
    const registryId = registryIdFactory();
    const logger = new ConsoleLogger({
      extensionId,
      blueprintId: registryId,
      blueprintVersion: "1.0.0" as SemVerString,
    });

    const result = await brick.run(
      unsafeAssumeValidArg({}),
      brickOptionsFactory({
        logger,
      }),
    );

    expect(result).toEqual({
      componentId: extensionId,
      deploymentId: null,
      mod: {
        id: registryId,
        version: "1.0.0",
      },
      runId: null,
    });
  });
});

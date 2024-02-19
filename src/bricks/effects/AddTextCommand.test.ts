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

import { commandRegistry } from "@/contentScript/commandPopover/commandController";
import AddTextCommand from "@/bricks/effects/AddTextCommand";
import blockRegistry from "@/bricks/registry";
import {
  simpleInput,
  testOptions,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { toExpression } from "@/utils/expressionUtils";
import { reducePipeline } from "@/runtime/reducePipeline";
import { uuidv4 } from "@/types/helpers";
import ConsoleLogger from "@/utils/ConsoleLogger";
import IdentityTransformer from "@/bricks/transformers/IdentityTransformer";

const brick = new AddTextCommand();
const identity = new IdentityTransformer();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register([brick, identity]);
});

afterEach(() => {
  commandRegistry.clear();
});

describe("AddTextCommand", () => {
  it("registers command", async () => {
    const extensionId = uuidv4();
    const logger = new ConsoleLogger({ extensionId });

    const pipeline = {
      id: brick.id,
      config: {
        shortcut: "/echo",
        title: "Echo",
        generate: toExpression("pipeline", [
          { id: identity.id, config: toExpression("var", "@body") },
        ]),
      },
    };

    await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      extensionId,
      logger,
    });

    expect(commandRegistry.commands).toStrictEqual([
      {
        // Leading slash is dropped
        shortcut: "echo",
        title: "Echo",
        handler: expect.toBeFunction(),
        componentId: extensionId,
      },
    ]);

    await expect(
      commandRegistry.commands[0].handler("current text"),
    ).resolves.toBe("current text");
  });
});

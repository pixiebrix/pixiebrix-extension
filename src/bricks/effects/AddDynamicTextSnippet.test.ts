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

import { snippetRegistry } from "@/contentScript/snippetShortcutMenu/snippetShortcutMenuController";
import AddDynamicTextSnippet from "@/bricks/effects/AddDynamicTextSnippet";
import blockRegistry from "@/bricks/registry";
import {
  simpleInput,
  testOptions,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { toExpression } from "@/utils/expressionUtils";
import { reducePipeline } from "@/runtime/reducePipeline";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import ConsoleLogger from "@/utils/ConsoleLogger";
import IdentityTransformer from "@/bricks/transformers/IdentityTransformer";
import { getExampleBrickConfig } from "@/bricks/exampleBrickConfigs";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";

const brick = new AddDynamicTextSnippet();
const identity = new IdentityTransformer();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register([brick, identity]);
});

afterEach(() => {
  snippetRegistry.clear();
});

describe("AddDynamicTextSnippet", () => {
  it.each(["/echo", "echo", "\\echo"])(
    "registers snippet: %s",
    async (shortcut) => {
      const extensionId = uuidv4();
      const logger = new ConsoleLogger({
        modComponentId: extensionId,
        modId: registryIdFactory(),
      });

      const pipeline = {
        id: brick.id,
        config: {
          shortcut,
          title: "Echo",
          generate: toExpression("pipeline", [
            { id: identity.id, config: toExpression("var", "@currentText") },
          ]),
        },
      };

      await reducePipeline(pipeline, simpleInput({}), {
        ...testOptions("v3"),
        extensionId,
        logger,
      });

      expect(snippetRegistry.snippetShortcuts).toStrictEqual([
        {
          // Any leading slash is dropped
          shortcut: "echo",
          title: "Echo",
          // Preview is optional
          preview: undefined,
          handler: expect.toBeFunction(),
          componentId: extensionId,
          context: {
            ...logger.context,
            brickId: brick.id,
            brickVersion: expect.toBeString(),
            label: brick.name,
          },
        },
      ]);

      await expect(
        snippetRegistry.snippetShortcuts[0].handler("current text"),
      ).resolves.toBe("current text");
    },
  );

  it.each(["preview text", undefined])(
    "passes preview directly: %s",
    async (preview) => {
      const extensionId = uuidv4();
      const logger = new ConsoleLogger({ modComponentId: extensionId });

      const pipeline = {
        id: brick.id,
        config: {
          shortcut: "echo",
          preview,
          title: "Echo",
          generate: toExpression("pipeline", [
            { id: identity.id, config: toExpression("var", "@currentText") },
          ]),
        },
      };

      await reducePipeline(pipeline, simpleInput({}), {
        ...testOptions("v3"),
        extensionId,
        logger,
      });

      expect(snippetRegistry.snippetShortcuts).toStrictEqual([
        {
          shortcut: "echo",
          title: "Echo",
          preview,
          handler: expect.toBeFunction(),
          componentId: extensionId,
          context: {
            ...logger.context,
            brickId: brick.id,
            brickVersion: expect.toBeString(),
            label: brick.name,
          },
        },
      ]);

      await expect(
        snippetRegistry.snippetShortcuts[0].handler("current text"),
      ).resolves.toBe("current text");
    },
  );

  it("provides an example config", () => {
    expect(getExampleBrickConfig(AddDynamicTextSnippet.BRICK_ID)).toStrictEqual(
      {
        generate: toExpression("pipeline", [
          {
            config: toExpression("nunjucks", ""),
            id: validateRegistryId("@pixiebrix/identity"),
            instanceId: expect.any(String),
            outputKey: validateOutputKey("generatedText"),
            rootMode: "document",
          },
        ]),
        shortcut: "command",
        title: "Example Dynamic Snippet",
      },
    );
  });
});

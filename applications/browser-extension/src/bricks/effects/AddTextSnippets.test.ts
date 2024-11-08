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

import AddTextSnippets from "./AddTextSnippets";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";
import { snippetRegistry } from "../../contentScript/snippetShortcutMenu/snippetShortcutMenuController";
import { getExampleBrickConfig } from "../exampleBrickConfigs";

const brick = new AddTextSnippets();

afterEach(() => {
  snippetRegistry.clear();
});

describe("AddTextSnippets", () => {
  it.each(["test", String.raw`\test`, "/test"])(
    "add registers snippets: %s",
    async (shortcut) => {
      const options = brickOptionsFactory();

      await brick.run(
        unsafeAssumeValidArg({
          snippets: [
            {
              shortcut,
              title: "Test",
              text: "test text",
            },
          ],
        }),
        options,
      );

      expect(snippetRegistry.snippetShortcuts).toStrictEqual([
        {
          // Leading command key is dropped
          shortcut: "test",
          title: "Test",
          preview: "test text",
          handler: expect.toBeFunction(),
          componentId: options.logger.context.modComponentId,
          context: options.logger.context,
        },
      ]);

      await expect(
        snippetRegistry.snippetShortcuts[0]!.handler(""),
      ).resolves.toBe("test text");
    },
  );

  it("provides an example config", () => {
    expect(getExampleBrickConfig(AddTextSnippets.BRICK_ID)).toStrictEqual({
      snippets: [
        {
          shortcut: "example",
          text: "Example snippet text",
          title: "Example Snippet",
        },
      ],
    });
  });
});

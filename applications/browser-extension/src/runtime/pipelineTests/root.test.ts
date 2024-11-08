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
import { echoBrick, simpleInput } from "./testHelpers";
import { reducePipeline } from "../reducePipeline";
import { getReferenceForElement } from "@/contentScript/elementReference";
import { ReaderABC } from "../../types/bricks/readerTypes";
import {
  type ApiVersion,
  type BrickArgs,
  type BrickOptions,
  type SelectorRoot,
} from "../../types/runtimeTypes";
import { BrickABC } from "../../types/brickTypes";
import { toExpression } from "../../utils/expressionUtils";
import { propertiesToSchema } from "../../utils/schemaUtils";
import { reduceOptionsFactory } from "../../testUtils/factories/runtimeFactories";

class RootAwareBlock extends BrickABC {
  constructor() {
    super("block/root-aware", "Root Aware Brick");
  }

  inputSchema = propertiesToSchema({}, []);

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async run(arg: BrickArgs, { root }: BrickOptions) {
    return {
      isDocument: root === document,
      tagName: (root as HTMLElement)?.tagName,
    };
  }
}

class RootAwareReader extends ReaderABC {
  constructor() {
    super("reader/root-aware", "Root Aware Reader");
  }

  override inputSchema = propertiesToSchema({}, []);

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async read(root: SelectorRoot) {
    return {
      isDocument: root === document,
      tagName: (root as HTMLElement)?.tagName,
    };
  }
}

const rootBlock = new RootAwareBlock();
const rootReader = new RootAwareReader();

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([rootBlock, rootReader, echoBrick]);
  // https://stackoverflow.com/questions/42805128/does-jest-reset-the-jsdom-document-after-every-suite-or-test
  document.querySelectorAll("html")[0]!.innerHTML = "";
});

describe.each([["v1"], ["v2"], ["v3"]])(
  "apiVersion: %s",
  (apiVersion: ApiVersion) => {
    test.each([[undefined], ["inherit"]])(
      "reader in pipeline (rootMode: %s)",
      async () => {
        const element = document.createElement("IMG");

        const result = await reducePipeline(
          { id: rootReader.id, config: {} },
          { ...simpleInput({}), optionsArgs: {}, root: element },
          reduceOptionsFactory(apiVersion),
        );

        expect(result).toStrictEqual({ isDocument: false, tagName: "IMG" });
      },
    );

    test.each([[undefined], ["inherit"]])(
      "root-aware block in pipeline (rootMode: %s)",
      async () => {
        const element = document.createElement("IMG");

        const result = await reducePipeline(
          { id: rootBlock.id, config: {} },
          { ...simpleInput({}), optionsArgs: {}, root: element },
          reduceOptionsFactory(apiVersion),
        );

        expect(result).toStrictEqual({ isDocument: false, tagName: "IMG" });
      },
    );

    test("root-aware block in pipeline", async () => {
      const element = document.createElement("IMG");

      const result = await reducePipeline(
        { id: rootBlock.id, config: {}, rootMode: "document" },
        { ...simpleInput({}), optionsArgs: {}, root: element },
        reduceOptionsFactory(apiVersion),
      );

      expect(result).toStrictEqual({ isDocument: true, tagName: undefined });
    });

    test.each([rootBlock.id, rootReader.id])(
      "custom root via selector for: %s",
      async (blockId) => {
        const element = document.createElement("IMG");
        document.body.append(element);

        const result = await reducePipeline(
          { id: blockId, config: {}, rootMode: "document", root: "img" },
          { ...simpleInput({}), optionsArgs: {}, root: document },
          reduceOptionsFactory(apiVersion),
        );

        expect(result).toStrictEqual({ isDocument: false, tagName: "IMG" });
      },
    );

    test.each([rootBlock.id, rootReader.id])(
      "custom inherited root for: %s",
      async (blockId) => {
        const div = document.createElement("DIV");
        const element = document.createElement("IMG");
        div.append(element);

        document.body.append(div);
        // Create another IMG that would conflict if the document were the root
        document.body.append(document.createElement("IMG"));

        const result = await reducePipeline(
          { id: blockId, config: {}, rootMode: "inherit", root: "img" },
          { ...simpleInput({}), optionsArgs: {}, root: div },
          reduceOptionsFactory(apiVersion),
        );

        expect(result).toStrictEqual({ isDocument: false, tagName: "IMG" });
      },
    );

    test.each([rootBlock.id, rootReader.id])(
      "throw on multiple custom root matches: %s",
      async (blockId) => {
        const div = document.createElement("DIV");
        const element = document.createElement("IMG");
        div.append(element);

        document.body.append(div);
        document.body.append(document.createElement("IMG"));

        await expect(
          reducePipeline(
            // Force document as starting point for the selector
            { id: blockId, config: {}, rootMode: "document", root: "img" },
            { ...simpleInput({}), optionsArgs: {}, root: div },
            reduceOptionsFactory(apiVersion),
          ),
        ).rejects.toThrow(/Multiple roots found/);
      },
    );

    test.each([rootBlock.id, rootReader.id])(
      "throw on no custom root matches: %s",
      async (blockId) => {
        await expect(
          reducePipeline(
            // Force document as starting point for the selector
            { id: blockId, config: {}, rootMode: "document", root: "a" },
            { ...simpleInput({}), optionsArgs: {} },
            reduceOptionsFactory(apiVersion),
          ),
        ).rejects.toThrow(/No roots found/);
      },
    );

    test("pass hard-coded root reference", async () => {
      const div = document.createElement("DIV");
      document.body.append(div);

      const ref = getReferenceForElement(div);

      await expect(
        reducePipeline(
          // Force document as starting point for the selector
          { id: rootBlock.id, config: {}, rootMode: "element", root: ref },
          { ...simpleInput({}), optionsArgs: {}, root: document },
          reduceOptionsFactory(apiVersion),
        ),
      ).resolves.toStrictEqual({ isDocument: false, tagName: "DIV" });
    });
  },
);

describe.each([["v3"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("pass templated root reference", async () => {
    const div = document.createElement("DIV");
    document.body.append(div);

    const ref = getReferenceForElement(div);

    await expect(
      reducePipeline(
        // Force document as starting point for the selector
        {
          id: rootBlock.id,
          config: {},
          rootMode: "element",
          root: toExpression("var", "@options.element"),
        },
        { ...simpleInput({}), optionsArgs: { element: ref }, root: document },
        reduceOptionsFactory(apiVersion),
      ),
    ).resolves.toStrictEqual({ isDocument: false, tagName: "DIV" });
  });
});

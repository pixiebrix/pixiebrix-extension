/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Block, Reader } from "@/types";
import { propertiesToSchema } from "@/validators/generic";
import { ApiVersion, BlockArg, BlockOptions, ReaderRoot } from "@/core";
import blockRegistry from "@/blocks/registry";

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/logging";
import {
  echoBlock,
  simpleInput,
  testOptions,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
jest.mock("@/background/trace");
(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

class RootAwareBlock extends Block {
  constructor() {
    super("block/root-aware", "Root Aware Block");
  }

  inputSchema = propertiesToSchema({});

  async isRootAware(): Promise<boolean> {
    return true;
  }

  async run(arg: BlockArg, { root }: BlockOptions) {
    return {
      isDocument: root === document,
      tagName: (root as HTMLElement)?.tagName,
    };
  }
}

class RootAwareReader extends Reader {
  constructor() {
    super("reader/root-aware", "Root Aware Reader");
  }

  inputSchema = propertiesToSchema({});

  async isRootAware(): Promise<boolean> {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async read(root: ReaderRoot) {
    return {
      isDocument: root === document,
      tagName: (root as HTMLElement)?.tagName,
    };
  }
}

const rootBlock = new RootAwareBlock();
const rootReader = new RootAwareReader();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(rootBlock, rootReader, echoBlock);
});

describe.each([["v1"], ["v2"], ["v3"]])(
  "apiVersion: %s",
  (apiVersion: ApiVersion) => {
    test.each([[undefined], ["inherit"]])(
      "reader in pipeline (root: %s)",
      async () => {
        const element = document.createElement("IMG");

        const result = await reducePipeline(
          { id: rootReader.id, config: {} },
          { ...simpleInput({}), optionsArgs: {}, root: element },
          testOptions(apiVersion)
        );

        expect(result).toStrictEqual({ isDocument: false, tagName: "IMG" });
      }
    );

    test.each([[undefined], ["inherit"]])(
      "root-aware block in pipeline (root: %s)",
      async () => {
        const element = document.createElement("IMG");

        const result = await reducePipeline(
          { id: rootBlock.id, config: {} },
          { ...simpleInput({}), optionsArgs: {}, root: element },
          testOptions(apiVersion)
        );

        expect(result).toStrictEqual({ isDocument: false, tagName: "IMG" });
      }
    );

    test("root-aware block in pipeline", async () => {
      const element = document.createElement("IMG");

      const result = await reducePipeline(
        { id: rootBlock.id, config: {}, rootMode: "document" },
        { ...simpleInput({}), optionsArgs: {}, root: element },
        testOptions(apiVersion)
      );

      expect(result).toStrictEqual({ isDocument: true, tagName: undefined });
    });
  }
);

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
import { echoBrick, simpleInput } from "@/runtime/pipelineTests/testHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import ForEachElement from "./ForEachElement";
import { getReferenceForElement } from "@/contentScript/elementReference";
import { toExpression } from "@/utils/expressionUtils";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";

const forEachBlock = new ForEachElement();

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, forEachBlock]);
});

describe("ForEachElement", () => {
  test("no matches returns undefined", async () => {
    const pipeline = {
      id: forEachBlock.id,
      config: {
        selector: "table",
        body: toExpression("pipeline", [
          {
            id: echoBrick.id,
            config: {
              message: "This is a message",
            },
          },
        ]),
      },
    };

    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );

    expect(result).toBeUndefined();
  });

  test("loop smoke test", async () => {
    const pipeline = {
      id: forEachBlock.id,
      config: {
        // The jsdom has one body tag
        selector: "body",
        body: toExpression("pipeline", [
          {
            id: echoBrick.id,
            config: {
              message: "This is a message",
            },
          },
        ]),
      },
    };

    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );

    expect(result).toStrictEqual({ message: "This is a message" });
  });

  test("pass element key if provided", async () => {
    const pipeline = {
      id: forEachBlock.id,
      config: {
        // The jsdom has one body tag
        selector: "body",
        elementKey: "element",
        body: toExpression("pipeline", [
          {
            id: echoBrick.id,
            config: {
              message: toExpression("nunjucks", "Got reference: {{@element}}"),
            },
          },
        ]),
      },
    };

    const ref = getReferenceForElement(document.body);

    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );

    expect(result).toStrictEqual({ message: `Got reference: ${ref}` });
  });

  test("don't pass element key if not provided", async () => {
    const pipeline = {
      id: forEachBlock.id,
      config: {
        // The jsdom has one body tag
        selector: "body",
        // Don't pass elementKey
        // elementKey: "element",
        body: toExpression("pipeline", [
          {
            id: echoBrick.id,
            config: {
              message: toExpression("nunjucks", "Got reference: {{@element}}"),
            },
          },
        ]),
      },
    };

    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );

    expect(result).toStrictEqual({ message: "Got reference: " });
  });
});

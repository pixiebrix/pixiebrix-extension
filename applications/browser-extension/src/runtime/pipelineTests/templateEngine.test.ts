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
import { reducePipeline } from "@/runtime/reducePipeline";
import { type BrickConfig } from "@/bricks/types";
import { contextBrick, echoBrick, simpleInput } from "./testHelpers";
import { selectSpecificError } from "@/errors/errorHelpers";
import { BusinessError } from "@/errors/businessErrors";
import { toExpression } from "@/utils/expressionUtils";
import { type TemplateEngine } from "@/types/runtimeTypes";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, contextBrick]);
});

describe.each([["mustache"], ["handlebars"], ["nunjucks"]])(
  "apiVersion: v1, templateEngine: %s",
  (templateEngine) => {
    test("render template with templateEngine", async () => {
      const pipeline = {
        id: echoBrick.id,
        // All of the engines accept the same {{ template for standard strings
        config: { message: "{{inputArg}}" },
        templateEngine,
      };
      const result = await reducePipeline(
        pipeline as BrickConfig,
        simpleInput({ inputArg: "hello" }),
        reduceOptionsFactory("v1"),
      );
      expect(result).toStrictEqual({ message: "hello" });
    });
  },
);

describe("apiVersion: v1", () => {
  test("default to mustache", async () => {
    const pipeline = {
      id: echoBrick.id,
      config: { message: "{{inputArg}}" },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      reduceOptionsFactory("v1"),
    );
    expect(result).toStrictEqual({ message: "hello" });
  });

  test("use nunjucks filter", async () => {
    const pipeline = {
      id: echoBrick.id,
      config: { message: "{{inputArg | upper}}" },
      templateEngine: "nunjucks",
    };
    const result = await reducePipeline(
      pipeline as BrickConfig,
      simpleInput({ inputArg: "hello" }),
      reduceOptionsFactory("v1"),
    );
    expect(result).toStrictEqual({ message: "HELLO" });
  });
});

describe("apiVersion: v3", () => {
  test("ignore implicit mustache template", async () => {
    const pipeline = {
      id: echoBrick.id,
      config: { message: "{{@input.inputArg}}" },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      reduceOptionsFactory("v3"),
    );
    expect(result).toStrictEqual({ message: "{{@input.inputArg}}" });
  });

  describe.each([
    // NOTE: Handlebars doesn't work with @-prefixed variable because it uses @ to denote data variables
    // see: https://handlebarsjs.com/api-reference/data-variables.html
    ["mustache"],
    ["nunjucks"],
  ])("apply explicit %s template", (templateEngine: TemplateEngine) => {
    test("apply explicit template with property path", async () => {
      const pipeline = {
        id: echoBrick.id,
        config: {
          message: toExpression(templateEngine, "{{@input.inputArg}}"),
        },
      };
      const result = await reducePipeline(
        pipeline,
        simpleInput({ inputArg: "hello" }),
        reduceOptionsFactory("v3"),
      );
      expect(result).toStrictEqual({ message: "hello" });
    });
  });

  // NOTE: Handlebars doesn't work with @-prefixed variable because it uses @ to denote data variables
  // see: https://handlebarsjs.com/api-reference/data-variables.html
  test("handlebars can't reference @-prefixed variables", async () => {
    const pipeline = {
      id: echoBrick.id,
      config: {
        message: toExpression("handlebars", "{{@input.inputArg}}"),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      reduceOptionsFactory("v3"),
    );
    expect(result).toStrictEqual({ message: "" });
  });

  test("ignore templateEngine property", async () => {
    const pipeline = {
      id: echoBrick.id,
      config: {
        message: toExpression("nunjucks", "{{@input.inputArg | upper}}"),
      },
      templateEngine: "mustache",
    };
    const result = await reducePipeline(
      pipeline as BrickConfig,
      simpleInput({ inputArg: "hello" }),
      reduceOptionsFactory("v3"),
    );
    expect(result).toStrictEqual({ message: "HELLO" });
  });

  test("apply var", async () => {
    const pipeline = {
      id: echoBrick.id,
      config: {
        message: toExpression("var", "@input.inputArg"),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ inputArg: "hello" }),
      reduceOptionsFactory("v3"),
    );
    expect(result).toStrictEqual({ message: "hello" });
  });
});

describe("Error handling", () => {
  test("throws InvalidTemplateError on malformed template", async () => {
    const pipeline = {
      id: echoBrick.id,
      config: {
        message: toExpression("nunjucks", "  {{@input   }   "),
      },
    };
    try {
      await reducePipeline(
        pipeline as BrickConfig,
        simpleInput({ inputArg: "hello" }),
        reduceOptionsFactory("v3"),
      );
      throw new Error("reducePipeline should have thrown");
    } catch (error: any) {
      expect(selectSpecificError(error, BusinessError)).toBeInstanceOf(
        BusinessError,
      );
      expect(error.message).toBe(
        `Invalid template: (unknown path) [Line 1, Column 14]
  expected variable end. Template: "{{@input }"`,
      );
    }
  });
});

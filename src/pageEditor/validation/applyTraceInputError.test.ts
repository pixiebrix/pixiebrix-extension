/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { traceErrorFactory } from "@/testUtils/factories";
import applyTraceInputError from "./applyTraceInputError";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { get } from "lodash";

test("ignores non input errors", () => {
  const pipelineErrors: FormikErrorTree = {};
  const errorTraceEntry = traceErrorFactory();

  applyTraceInputError(pipelineErrors, errorTraceEntry, "0");

  expect(pipelineErrors).toEqual({});
});

// Test root pipeline and sub pipeline (path corresponds to storage config of a Custom Form in a Document)
test.each(["0", "0.config.body.1.config.pipeline.__value__.0.config.recordId"])(
  "figures required property error",
  (blockPath) => {
    const pipelineErrors: FormikErrorTree = {};
    const property = "testProp";
    const traceError = {
      schema: {},
      errors: [
        {
          error: `Instance does not have required property "${property}".`,
        },
      ],
    };
    const errorTraceEntry = traceErrorFactory({
      error: traceError,
    });

    applyTraceInputError(pipelineErrors, errorTraceEntry, blockPath);

    // @ts-expect-error -- block error has 'config'
    expect(get(pipelineErrors, blockPath).config[property]).toEqual(
      "Error from the last run: This field is required."
    );
  }
);

test("applies input validation error", () => {
  const pipelineErrors: FormikErrorTree = {};
  const property = "testProp";
  const traceError = {
    name: "InputValidationError",
    schema: {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {
        message: {
          type: ["string", "number", "boolean"],
          description: "The text/value you want to display in the alert",
        },
        type: {
          type: "string",
          description:
            "The alert type/style. 'window' uses the browser's native window alert dialog, which the user must dismiss",
          enum: ["window", "info", "success", "error"],
          default: "info",
        },
        duration: {
          type: "number",
          description:
            "Duration to show the alert, in milliseconds. Ignored for 'window' alerts",
          default: 2500,
        },
      },
      required: ["message"],
    },
    input: {
      type: "info",
      duration: 2500,
      message: {
        "@input": {
          description:
            "Habr is the largest resource for IT professionals in Europe. People visit Habr to discuss industry news and share own experience.",
          icon: "https://assets.habr.com/habr-web/img/favicons/apple-touch-icon-76.png",
          image: "https://habr.com/img/habr_en.png",
          title: "All posts in a row / Habr",
          language: "en",
          type: "website",
          url: "https://habr.com/en/all/",
          provider: "Habr",
        },
        "@options": {},
      },
    },
    errors: [
      {
        instanceLocation: "#",
        keyword: "properties",
        keywordLocation: "#/properties",
        error: 'Property "message" does not match schema.',
      },
      {
        instanceLocation: `#/${property}`,
        keyword: "type",
        keywordLocation: `#/properties/${property}/type`,
        error:
          'Instance type "object" is invalid. Expected "string", "number", "boolean".',
      },
    ],
    message: "Invalid inputs for block",
    stack:
      "InputValidationError: Invalid inputs for block\n    at throwIfInvalidInput (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:56223:15)\n    at async runBlock (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:55809:9)\n    at async blockReducer (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:55879:20)\n    at async reducePipeline (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:55989:26)\n    at async HTMLAnchorElement.<anonymous> (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:51535:17)",
  };

  const errorTraceEntry = traceErrorFactory({
    error: traceError,
  });

  applyTraceInputError(pipelineErrors, errorTraceEntry, "0");

  // @ts-expect-error -- pipelineErrors["0"] has 'config'
  expect(pipelineErrors["0"].config[property]).toEqual(
    'Instance type "object" is invalid. Expected "string", "number", "boolean".'
  );
});

test("sets unknown input error on the block level", () => {
  const pipelineErrors: FormikErrorTree = {};
  const errorMessage = "This is an unknown input validation error";
  const traceError = {
    schema: {},
    errors: [
      {
        error: errorMessage,
      },
    ],
  };
  const errorTraceEntry = traceErrorFactory({
    error: traceError,
  });

  applyTraceInputError(pipelineErrors, errorTraceEntry, "0");

  expect(pipelineErrors["0"]).toEqual(errorMessage);
});

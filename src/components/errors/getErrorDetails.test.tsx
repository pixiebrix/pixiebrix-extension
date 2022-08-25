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

import { render } from "@testing-library/react";
import { waitForEffect } from "@/testUtils/testHelpers";
import getErrorDetails from "./getErrorDetails";

test("Template render error", () => {
  const error = {
    name: "Template render error",
    message:
      "(unknown path) [Line 1, Column 3]\n  parseAggregate: expected colon after dict key",
    stack:
      "Template render error: (unknown path) [Line 1, Column 3]\n  parseAggregate: expected colon after dict key\n    at Object._prettifyError (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/bundles/nunjucks.bundle.js:121:11)\n    at Template.render (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/bundles/nunjucks.bundle.js:3489:21)\n    at Environment.renderString (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/bundles/nunjucks.bundle.js:3331:17)\n    at Object.renderString (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/bundles/nunjucks.bundle.js:5652:14)\n    at default (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:56066:33)\n    at renderExplicit (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:55472:16)\n    at async Promise.all (index 1)\n    at async asyncMapValues (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:58604:20)\n    at async renderExplicit (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:55484:33)\n    at async Promise.all (index 0)",
  };

  const { title, detailsElement } = getErrorDetails(error);
  expect(title).toBe("Error");
  expect(render(detailsElement).asFragment()).toMatchSnapshot();
});

test("Input validation error", () => {
  const error = {
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
        instanceLocation: "#/message",
        keyword: "type",
        keywordLocation: "#/properties/message/type",
        error:
          'Instance type "object" is invalid. Expected "string", "number", "boolean".',
      },
    ],
    message: "Invalid inputs for block",
    stack:
      "InputValidationError: Invalid inputs for block\n    at throwIfInvalidInput (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:56223:15)\n    at async runBlock (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:55809:9)\n    at async blockReducer (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:55879:20)\n    at async reducePipeline (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:55989:26)\n    at async HTMLAnchorElement.<anonymous> (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/contentScript.js:51535:17)",
  };

  const { title, detailsElement } = getErrorDetails(error);
  expect(title).toBe("Invalid inputs for block");
  expect(render(detailsElement).asFragment()).toMatchSnapshot();
});

test("Network error", async () => {
  const error = {
    cause: {
      config: {
        transitional: {
          silentJSONParsing: true,
          forcedJSONParsing: true,
          clarifyTimeoutError: false,
        },
        // @ts-expect-error -- the value actually received from HTTP GET brick
        transformRequest: [],
        // @ts-expect-error -- the value actually received from HTTP GET brick
        transformResponse: [],
        timeout: 0,
        xsrfCookieName: "XSRF-TOKEN",
        xsrfHeaderName: "X-XSRF-TOKEN",
        maxContentLength: -1,
        maxBodyLength: -1,
        headers: {
          Accept: "application/json, text/plain, */*",
        },
        url: "https://fail.com",
        method: "get",
      },
      request: {},
      isAxiosError: true,
      name: "Error",
      message: "Network Error",
      stack:
        "Error: Network Error\n    at createError (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:11801:15)\n    at _callee$ (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:10915:126)\n    at tryCatch (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:34316:40)\n    at Generator.invoke [as _invoke] (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:34547:22)\n    at Generator.throw (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:34372:21)\n    at asyncGeneratorStep (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:10798:24)\n    at _throw (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:10824:9)",
    },
    name: "ClientNetworkError",
    message: "Network error. No response received.",
    stack:
      "ClientNetworkError: No response received. Your browser may have blocked the request. See https://docs.pixiebrix.com/network-errors for troubleshooting information\n    at enrichBusinessRequestError (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:54834:12)\n    at async serializableAxiosRequest (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:43429:15)\n    at async handleMessage (chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/background.js:67712:22)",
  };

  const { title, detailsElement } = getErrorDetails(error);
  expect(title).toBe("Network error. No response received.");
  const rendered = render(detailsElement);
  await waitForEffect();
  expect(rendered.asFragment()).toMatchSnapshot();
});

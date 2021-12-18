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

import {
  ApiVersion,
  SanitizedServiceConfiguration,
  ServiceDependency,
} from "@/core";
import blockRegistry from "@/blocks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import {
  contextBlock,
  echoBlock,
  identityBlock,
  simpleInput,
  testOptions,
} from "./pipelineTestHelpers";
import { makeServiceContext } from "@/services/serviceUtils";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { pixieServiceFactory } from "@/services/locator";

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/messenger/api";
import { services } from "@/background/messenger/api";
import { uuidv4, validateRegistryId } from "@/types/helpers";

(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, contextBlock, identityBlock);
});

describe.each([["v1"], ["v2"], ["v3"]])(
  "apiVersion: %s",
  (apiVersion: ApiVersion) => {
    test("pass services in context with __service", async () => {
      (services.locate as any) = jest
        .fn()
        .mockResolvedValue(pixieServiceFactory());

      const dependencies: ServiceDependency[] = [
        { id: PIXIEBRIX_SERVICE_ID, outputKey: validateOutputKey("pixiebrix") },
      ];

      const result = await reducePipeline(
        {
          id: contextBlock.id,
          config: {},
        },
        {
          ...simpleInput({}),
          serviceContext: await makeServiceContext(dependencies),
        },
        testOptions(apiVersion)
      );
      expect(result).toStrictEqual({
        "@input": {},
        "@pixiebrix": {
          __service: await pixieServiceFactory(),
        },
        "@options": {},
      });
    });
  }
);

describe.each([["v1"], ["v2"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("pass services for var without __service", async () => {
    (services.locate as any) = jest
      .fn()
      .mockResolvedValue(pixieServiceFactory());

    const dependencies: ServiceDependency[] = [
      { id: PIXIEBRIX_SERVICE_ID, outputKey: validateOutputKey("pixiebrix") },
    ];

    const result = await reducePipeline(
      {
        id: identityBlock.id,
        config: { data: "@pixiebrix" },
      },
      {
        ...simpleInput({}),
        serviceContext: await makeServiceContext(dependencies),
      },
      testOptions(apiVersion)
    );
    expect(result).toStrictEqual({
      data: await pixieServiceFactory(),
    });
  });

  test("reference sanitized configuration variable", async () => {
    const authId = uuidv4();
    const serviceId = validateRegistryId("test/api");

    (services.locate as any) = jest.fn().mockResolvedValue(({
      id: authId,
      serviceId,
      proxy: false,
      config: {
        prop: "abc123",
      },
    } as unknown) as SanitizedServiceConfiguration);

    const dependencies: ServiceDependency[] = [
      { id: serviceId, outputKey: validateOutputKey("service") },
    ];

    const result = await reducePipeline(
      {
        id: identityBlock.id,
        config: { data: "@service.prop" },
      },
      {
        ...simpleInput({}),
        serviceContext: await makeServiceContext(dependencies),
      },
      testOptions(apiVersion)
    );
    expect(result).toStrictEqual({
      data: "abc123",
    });
  });
});

describe.each([["v3"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("pass services for var without __service", async () => {
    (services.locate as any) = jest
      .fn()
      .mockResolvedValue(pixieServiceFactory());

    const dependencies: ServiceDependency[] = [
      { id: PIXIEBRIX_SERVICE_ID, outputKey: validateOutputKey("pixiebrix") },
    ];

    const result = await reducePipeline(
      {
        id: identityBlock.id,
        config: {
          data: {
            __type__: "var",
            __value__: "@pixiebrix",
          },
        },
      },
      {
        ...simpleInput({}),
        serviceContext: await makeServiceContext(dependencies),
      },
      testOptions(apiVersion)
    );
    expect(result).toStrictEqual({
      data: await pixieServiceFactory(),
    });
  });

  test("reference sanitized configuration variable", async () => {
    const authId = uuidv4();
    const serviceId = validateRegistryId("test/api");

    (services.locate as any) = jest.fn().mockResolvedValue(({
      id: authId,
      serviceId,
      proxy: false,
      config: {
        prop: "abc123",
      },
    } as unknown) as SanitizedServiceConfiguration);

    const dependencies: ServiceDependency[] = [
      { id: serviceId, outputKey: validateOutputKey("service") },
    ];

    const result = await reducePipeline(
      {
        id: identityBlock.id,
        config: {
          data: {
            __type__: "var",
            __value__: "@service.prop",
          },
        },
      },
      {
        ...simpleInput({}),
        serviceContext: await makeServiceContext(dependencies),
      },
      testOptions(apiVersion)
    );
    expect(result).toStrictEqual({
      data: "abc123",
    });
  });

  describe.each([
    // NOTE: Handlebars doesn't work with @-prefixed variable because it uses @ to denote data variables
    // see: https://handlebarsjs.com/api-reference/data-variables.html
    ["mustache"],
    ["nunjucks"],
  ])("templateEngine: %s", (templateEngine) => {
    test("reference sanitized configuration variable via template", async () => {
      const authId = uuidv4();
      const serviceId = validateRegistryId("test/api");

      (services.locate as any) = jest.fn().mockResolvedValue(({
        id: authId,
        serviceId,
        proxy: false,
        config: {
          prop: "abc123",
        },
      } as unknown) as SanitizedServiceConfiguration);

      const dependencies: ServiceDependency[] = [
        { id: serviceId, outputKey: validateOutputKey("service") },
      ];

      const result = await reducePipeline(
        {
          id: identityBlock.id,
          config: {
            data: {
              __type__: templateEngine,
              __value__: "{{ @service.prop }}",
            },
          },
        },
        {
          ...simpleInput({}),
          serviceContext: await makeServiceContext(dependencies),
        },
        testOptions(apiVersion)
      );
      expect(result).toStrictEqual({
        data: "abc123",
      });
    });
  });
});

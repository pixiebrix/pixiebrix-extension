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

import brickRegistry from "../../bricks/registry";
import { reducePipeline } from "../reducePipeline";
import {
  contextBrick,
  echoBrick,
  identityBrick,
  simpleInput,
} from "./testHelpers";
import { validateOutputKey } from "../runtimeTypes";
import { integrationConfigLocator } from "../../background/messenger/api";
import { uuidv4, validateRegistryId } from "../../types/helpers";
import { type ApiVersion, type TemplateEngine } from "../../types/runtimeTypes";
import {
  type IntegrationDependency,
  type SanitizedConfig,
} from "../../integrations/integrationTypes";
import { extraEmptyModStateContext } from "../extendModVariableContext";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "../../testUtils/factories/integrationFactories";
import {
  PIXIEBRIX_INTEGRATION_ID,
  PIXIEBRIX_OUTPUT_KEY,
} from "../../integrations/constants";
import makeIntegrationContextFromDependencies from "../../integrations/util/makeIntegrationContextFromDependencies";
import { toExpression } from "../../utils/expressionUtils";
import { pixiebrixConfigurationFactory } from "../../integrations/util/pixiebrixConfigurationFactory";
import { autoUUIDSequence } from "../../testUtils/factories/stringFactories";
import pixiebrixIntegrationDependencyFactory from "../../integrations/util/pixiebrixIntegrationDependencyFactory";
import { reduceOptionsFactory } from "../../testUtils/factories/runtimeFactories";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, contextBrick, identityBrick]);
});

const findSanitizedIntegrationConfigMock = jest.mocked(
  integrationConfigLocator.findSanitizedIntegrationConfig,
);

describe.each([["v1"], ["v2"], ["v3"]])(
  "apiVersion: %s",
  (apiVersion: ApiVersion) => {
    test("pass legacy pixiebrix integration config (id === undefined) in context on __service property", async () => {
      const dependencies: IntegrationDependency[] = [
        integrationDependencyFactory({
          integrationId: PIXIEBRIX_INTEGRATION_ID,
          outputKey: PIXIEBRIX_OUTPUT_KEY,
        }),
      ];

      const integrationContext =
        await makeIntegrationContextFromDependencies(dependencies);

      const result = await reducePipeline(
        {
          id: contextBrick.id,
          config: {},
        },
        {
          ...simpleInput({}),
          integrationContext,
        },
        reduceOptionsFactory(apiVersion),
      );

      expect(result).toStrictEqual({
        "@input": {},
        [`@${PIXIEBRIX_OUTPUT_KEY}`]: {
          __service: pixiebrixConfigurationFactory(),
        },
        "@options": {},
        ...extraEmptyModStateContext(apiVersion),
      });
    });

    test("pass integration dependencies in context on __service property", async () => {
      const authId1 = autoUUIDSequence();
      const authId2 = autoUUIDSequence();
      const dependency1 = integrationDependencyFactory({
        configId: authId1,
      });
      const dependency2 = integrationDependencyFactory({
        configId: authId2,
      });
      const config1 = sanitizedIntegrationConfigFactory({
        id: authId1,
        serviceId: dependency1.integrationId,
        config: {
          _sanitizedConfigBrand: null,
          foo: "FOO_VALUE",
          bar: "BAR_VALUE",
        },
      });
      const config2 = sanitizedIntegrationConfigFactory({
        id: authId2,
        serviceId: dependency2.integrationId,
        config: {
          _sanitizedConfigBrand: null,
          baz: "BAZ_VALUE",
          qux: "QUX_VALUE",
        },
      });
      findSanitizedIntegrationConfigMock.mockImplementation(
        async (integrationId, configId) => {
          if (configId === authId1) {
            return config1;
          }

          if (configId === authId2) {
            return config2;
          }

          throw new Error(`Unexpected configId: ${configId}`);
        },
      );

      const dependencies: IntegrationDependency[] = [dependency1, dependency2];
      const integrationContext =
        await makeIntegrationContextFromDependencies(dependencies);

      const result = await reducePipeline(
        {
          id: contextBrick.id,
          config: {},
        },
        {
          ...simpleInput({}),
          integrationContext,
        },
        reduceOptionsFactory(apiVersion),
      );

      expect(result).toStrictEqual({
        "@input": {},
        "@options": {},
        [`@${dependency1.outputKey}`]: {
          __service: config1,
          foo: "FOO_VALUE",
          bar: "BAR_VALUE",
        },
        [`@${dependency2.outputKey}`]: {
          __service: config2,
          baz: "BAZ_VALUE",
          qux: "QUX_VALUE",
        },
        ...extraEmptyModStateContext(apiVersion),
      });
    });
  },
);

describe.each([["v1"], ["v2"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("pass services for var without __service", async () => {
    const dependencies: IntegrationDependency[] = [
      pixiebrixIntegrationDependencyFactory(),
    ];

    const integrationContext =
      await makeIntegrationContextFromDependencies(dependencies);

    const result = await reducePipeline(
      {
        id: identityBrick.id,
        config: { data: "@pixiebrix" },
      },
      {
        ...simpleInput({}),
        integrationContext,
      },
      reduceOptionsFactory(apiVersion),
    );
    expect(result).toStrictEqual({
      data: pixiebrixConfigurationFactory(),
    });
  });

  test("reference sanitized configuration variable", async () => {
    const authId = uuidv4();
    const serviceId = validateRegistryId("test/api");

    findSanitizedIntegrationConfigMock.mockResolvedValue(
      sanitizedIntegrationConfigFactory({
        id: authId,
        serviceId,
        proxy: false,
        config: {
          prop: "abc123",
        } as unknown as SanitizedConfig,
      }),
    );

    const dependencies: IntegrationDependency[] = [
      integrationDependencyFactory({
        integrationId: serviceId,
        outputKey: validateOutputKey("integration"),
        configId: authId,
      }),
    ];

    const integrationContext =
      await makeIntegrationContextFromDependencies(dependencies);

    const result = await reducePipeline(
      {
        id: identityBrick.id,
        config: { data: "@integration.prop" },
      },
      {
        ...simpleInput({}),
        integrationContext,
      },
      reduceOptionsFactory(apiVersion),
    );
    expect(result).toStrictEqual({
      data: "abc123",
    });
  });
});

describe.each([["v3"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("pass services for var without __service", async () => {
    const dependencies: IntegrationDependency[] = [
      pixiebrixIntegrationDependencyFactory(),
    ];

    const integrationContext =
      await makeIntegrationContextFromDependencies(dependencies);

    const result = await reducePipeline(
      {
        id: identityBrick.id,
        config: {
          data: toExpression("var", "@pixiebrix"),
        },
      },
      {
        ...simpleInput({}),
        integrationContext,
      },
      reduceOptionsFactory(apiVersion),
    );
    expect(result).toStrictEqual({
      data: pixiebrixConfigurationFactory(),
    });
  });

  test("reference sanitized configuration variable", async () => {
    const authId = uuidv4();
    const serviceId = validateRegistryId("test/api");

    findSanitizedIntegrationConfigMock.mockResolvedValue(
      sanitizedIntegrationConfigFactory({
        id: authId,
        serviceId,
        proxy: false,
        config: {
          prop: "abc123",
        } as unknown as SanitizedConfig,
      }),
    );

    const dependency = integrationDependencyFactory({
      integrationId: serviceId,
      outputKey: validateOutputKey("service"),
      configId: authId,
    });

    const integrationContext = await makeIntegrationContextFromDependencies([
      dependency,
    ]);

    const result = await reducePipeline(
      {
        id: identityBrick.id,
        config: {
          data: toExpression("var", "@service.prop"),
        },
      },
      {
        ...simpleInput({}),
        integrationContext,
      },
      reduceOptionsFactory(apiVersion),
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
  ])("templateEngine: %s", (templateEngine: TemplateEngine) => {
    test("reference sanitized configuration variable via template", async () => {
      const authId = uuidv4();
      const serviceId = validateRegistryId("test/api");

      findSanitizedIntegrationConfigMock.mockResolvedValue(
        sanitizedIntegrationConfigFactory({
          id: authId,
          serviceId,
          proxy: false,
          config: {
            prop: "abc123",
          } as unknown as SanitizedConfig,
        }),
      );

      const dependencies: IntegrationDependency[] = [
        integrationDependencyFactory({
          integrationId: serviceId,
          outputKey: validateOutputKey("integration"),
          configId: authId,
        }),
      ];

      const integrationContext =
        await makeIntegrationContextFromDependencies(dependencies);

      const result = await reducePipeline(
        {
          id: identityBrick.id,
          config: {
            data: toExpression(templateEngine, "{{ @integration.prop }}"),
          },
        },
        {
          ...simpleInput({}),
          integrationContext,
        },
        reduceOptionsFactory(apiVersion),
      );
      expect(result).toStrictEqual({
        data: "abc123",
      });
    });
  });
});

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

import { define } from "cooky-cutter";
import {
  type IntegrationConfig,
  type IntegrationDefinition,
  type IntegrationDependency,
  type KeyAuthenticationDefinition,
  type SanitizedConfig,
  type SanitizedIntegrationConfig,
  type SecretsConfig,
} from "../../integrations/integrationTypes";
import { uuidSequence } from "./stringFactories";
import { validateRegistryId } from "../../types/helpers";
import { type RemoteIntegrationConfig } from "../../types/contract";
import { validateOutputKey } from "../../runtime/runtimeTypes";
import { type Schema } from "../../types/schemaTypes";
import { metadataFactory } from "./metadataFactory";
import { type DefinitionKind, DefinitionKinds } from "../../types/registryTypes";

export const sanitizedIntegrationConfigFactory =
  define<SanitizedIntegrationConfig>({
    id: uuidSequence,
    proxy: false,
    serviceId: (n: number) => validateRegistryId(`test/integration-${n}`),
    // The typing of _sanitizedConfigBrand is actually null, not never
    config: () => ({ _sanitizedConfigBrand: null }) as SanitizedConfig,
    label: "",
    _sanitizedIntegrationConfigBrand: undefined as never,
  });

export const secretsConfigFactory = define<SecretsConfig>({} as SecretsConfig);

export const integrationConfigFactory = define<IntegrationConfig>({
  id: uuidSequence,
  integrationId: (n: number) => validateRegistryId(`test/integration-${n}`),
  label: (n: number) => `Integration ${n}`,
  config: secretsConfigFactory,
  // Nominal brand without casting
  _rawIntegrationConfigBrand: undefined as never,
});

export const remoteIntegrationServiceFactory = define<
  RemoteIntegrationConfig["service"]
>({
  config: (n: number) => ({
    metadata: {
      id: validateRegistryId(`@test/integration-${n}`),
      name: `Test Integration ${n}`,
    },
    schema: {
      properties: {},
    },
  }),
  name: (n: number) => validateRegistryId(`@test/integration-${n}`),
});

export const remoteIntegrationConfigurationFactory =
  define<RemoteIntegrationConfig>({
    id: uuidSequence,
    organization: null as unknown as RemoteIntegrationConfig["organization"],
    label: (n: number) => `Configuration ${n}`,
    config: () =>
      ({
        _sanitizedConfigBrand: null,
      }) as SanitizedConfig,
    service: remoteIntegrationServiceFactory,
  });

export const integrationDependencyFactory = define<IntegrationDependency>({
  integrationId(n: number) {
    return validateRegistryId(`@test/integration${n}`);
  },
  outputKey(n: number) {
    return validateOutputKey(`testIntegration${n}`);
  },
  isOptional: false,
  apiVersion: "v1",
});

export const keyAuthIntegrationDefinitionFactory = define<
  IntegrationDefinition<KeyAuthenticationDefinition>
>({
  metadata: metadataFactory,
  inputSchema(): Schema {
    return {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {
        apiKey: {
          $ref: "https://app.pixiebrix.com/schemas/key#",
          title: "API Key",
        },
      },
      required: ["apiKey"],
    };
  },
  authentication(): KeyAuthenticationDefinition {
    return {
      baseURL: "https://api.test.com",
      headers: {
        Accept: "application/json",
        Authorization: "Token {{{ apiKey }}}",
      },
    };
  },
});

export function generateIntegrationAndRemoteConfig(): {
  remoteConfig: RemoteIntegrationConfig;
  integrationDefinition: IntegrationDefinition & { kind: DefinitionKind };
} {
  const remoteConfig = remoteIntegrationConfigurationFactory();

  const integrationDefinition: IntegrationDefinition & {
    kind: DefinitionKind;
  } = {
    ...keyAuthIntegrationDefinitionFactory({
      metadata: metadataFactory({
        id: remoteConfig.service.config.metadata.id,
      }),
    }),
    kind: DefinitionKinds.INTEGRATION,
  };

  return {
    remoteConfig,
    integrationDefinition,
  };
}

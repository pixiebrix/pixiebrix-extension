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

import {
  collectConfiguredIntegrationDependencies,
  collectModOptions,
} from "@/store/modComponents/modComponentUtils";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";

import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";

describe("collectModOptions", () => {
  it("returns first option", () => {
    expect(collectModOptions([{ optionsArgs: { foo: 42 } }])).toStrictEqual({
      foo: 42,
    });
  });

  it("return blank object if not set", () => {
    expect(collectModOptions([{ optionsArgs: undefined }])).toStrictEqual({});
  });
});

describe("collectConfiguredIntegrationDependencies", () => {
  it("handles undefined integrationDependencies", () => {
    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: undefined },
      ]),
    ).toStrictEqual([]);
  });

  it("handles duplicate integration", () => {
    const integrationId = validateRegistryId("foo/bar");
    const configId = uuidv4();
    const integrationDependency = integrationDependencyFactory({
      integrationId,
      outputKey: validateOutputKey("foo"),
      configId,
    });

    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: [integrationDependency] },
        { integrationDependencies: [integrationDependency] },
      ]),
    ).toStrictEqual([integrationDependency]);
  });

  it("handles unconfigured (optional) integrations", () => {
    // Factory does not add a configId by default
    const unconfigured = integrationDependencyFactory();
    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: [unconfigured] },
      ]),
    ).toBeEmpty();
  });

  it("does NOT filter out the pixiebrix integration", () => {
    const pixiebrix = integrationDependencyFactory({
      integrationId: PIXIEBRIX_INTEGRATION_ID,
    });
    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: [pixiebrix] },
      ]),
    ).toStrictEqual([pixiebrix]);
  });

  it("handles multiple pixiebrix integrations and others", () => {
    const pixiebrix = integrationDependencyFactory({
      integrationId: PIXIEBRIX_INTEGRATION_ID,
    });
    const optional = integrationDependencyFactory({
      isOptional: true,
    });
    const configured = integrationDependencyFactory({
      configId: uuidv4(),
    });
    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: [pixiebrix, pixiebrix] },
        { integrationDependencies: [pixiebrix, optional] },
        { integrationDependencies: [configured, pixiebrix, optional] },
        { integrationDependencies: [configured, optional] },
      ]),
    ).toStrictEqual([pixiebrix, configured]);
  });
});

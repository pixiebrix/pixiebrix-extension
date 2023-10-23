/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
  inferConfiguredModIntegrations,
  inferRecipeOptions,
} from "@/store/extensionsUtils";
import { type IntegrationDependency } from "@/types/integrationTypes";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { PIXIEBRIX_INTEGRATION_ID } from "@/services/constants";

describe("inferRecipeOptions", () => {
  it("returns first option", () => {
    expect(inferRecipeOptions([{ optionsArgs: { foo: 42 } }])).toStrictEqual({
      foo: 42,
    });
  });

  it("return blank object if not set", () => {
    expect(inferRecipeOptions([{ optionsArgs: undefined }])).toStrictEqual({});
  });
});

describe("inferConfiguredModIntegrations", () => {
  it("handles undefined integrationDependencies", () => {
    expect(
      inferConfiguredModIntegrations([{ integrationDependencies: undefined }])
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
      inferConfiguredModIntegrations([
        { integrationDependencies: [integrationDependency] },
        { integrationDependencies: [integrationDependency] },
      ])
    ).toStrictEqual([integrationDependency]);
  });

  it("throw on mismatched configId", () => {
    const integrationId = validateRegistryId("foo/bar");
    const configId = uuidv4();
    const integrationDependency = integrationDependencyFactory({
      integrationId,
      outputKey: validateOutputKey("foo"),
      configId,
    });

    expect(() =>
      inferConfiguredModIntegrations([
        { integrationDependencies: [integrationDependency] },
        {
          integrationDependencies: [
            { ...integrationDependency, configId: uuidv4() },
          ],
        },
      ])
    ).toThrow(/has multiple configurations/);
  });

  it("throw on missing configId", () => {
    const integrationId = validateRegistryId("foo/bar");
    const unconfiguredDependency: IntegrationDependency = {
      integrationId,
      outputKey: validateOutputKey("foo"),
    };

    expect(() =>
      inferConfiguredModIntegrations([
        { integrationDependencies: [unconfiguredDependency] },
      ])
    ).toThrow(/is not configured/);
  });

  it("handles unconfigured (optional) integrations", () => {
    // Factory does not add a configId by default
    const unconfigured = integrationDependencyFactory();
    expect(
      inferConfiguredModIntegrations(
        [{ integrationDependencies: [unconfigured] }],
        {
          optional: true,
        }
      )
    ).toBeEmpty();
  });

  it("does NOT filter out the pixiebrix integration", () => {
    const pixiebrix = integrationDependencyFactory({
      integrationId: PIXIEBRIX_INTEGRATION_ID,
    });
    expect(
      inferConfiguredModIntegrations([{ integrationDependencies: [pixiebrix] }])
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
      inferConfiguredModIntegrations(
        [
          { integrationDependencies: [pixiebrix, pixiebrix] },
          { integrationDependencies: [pixiebrix, optional] },
          { integrationDependencies: [configured, pixiebrix, optional] },
          { integrationDependencies: [configured, optional] },
        ],
        { optional: true }
      )
    ).toStrictEqual([pixiebrix, configured]);
  });
});

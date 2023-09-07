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

describe("inferModIntegrations", () => {
  it("handles undefined services", () => {
    expect(
      inferConfiguredModIntegrations([{ services: undefined }])
    ).toStrictEqual([]);
  });

  it("handles same service", () => {
    const service = validateRegistryId("foo/bar");
    const config = uuidv4();
    const dependency: IntegrationDependency = {
      id: service,
      outputKey: validateOutputKey("foo"),
      config,
    };

    expect(
      inferConfiguredModIntegrations([
        { services: [dependency] },
        { services: [dependency] },
      ])
    ).toStrictEqual([dependency]);
  });

  it("throw on mismatch", () => {
    const service = validateRegistryId("foo/bar");
    const config = uuidv4();
    const dependency: IntegrationDependency = {
      id: service,
      outputKey: validateOutputKey("foo"),
      config,
    };

    expect(() =>
      inferConfiguredModIntegrations([
        { services: [dependency] },
        { services: [{ ...dependency, config: uuidv4() }] },
      ])
    ).toThrow(/has multiple configurations/);
  });

  it("throw on missing config", () => {
    const service = validateRegistryId("foo/bar");
    const dependency: IntegrationDependency = {
      id: service,
      outputKey: validateOutputKey("foo"),
    };

    expect(() =>
      inferConfiguredModIntegrations([{ services: [dependency] }])
    ).toThrow(/is not configured/);
  });

  it("handles unconfigured (optional) integrations", () => {
    const unconfigured = integrationDependencyFactory();
    delete unconfigured.config;
    expect(
      inferConfiguredModIntegrations([{ services: [unconfigured] }], {
        optional: true,
      })
    ).toBeEmpty();
  });

  it("handles unconfigured integrations when the id is the default", () => {
    const unconfigured = integrationDependencyFactory();
    delete unconfigured.config;
    unconfigured.id = validateRegistryId(PIXIEBRIX_INTEGRATION_ID);
    expect(
      inferConfiguredModIntegrations([{ services: [unconfigured] }])
    ).toBeEmpty();
  });
});

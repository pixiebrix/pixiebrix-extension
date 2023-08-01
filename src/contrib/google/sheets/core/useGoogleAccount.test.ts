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

import { services } from "@/background/messenger/api";
import { findGoogleAccountIntegrationConfig } from "@/contrib/google/sheets/core/useGoogleAccount";
import { type IntegrationDependency } from "@/types/integrationTypes";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { validateRegistryId } from "@/types/helpers";
import { uuidSequence } from "@/testUtils/factories/stringFactories";

const servicesLocateMock = jest.mocked(services.locate);

const GOOGLE_PKCE_SERVICE_ID = validateRegistryId("google/oauth2-pkce");
const GOOGLE_PKCE_AUTH_CONFIG = uuidSequence(1);

const googlePKCEIntegrationDependency: IntegrationDependency = {
  id: GOOGLE_PKCE_SERVICE_ID,
  outputKey: validateOutputKey("google"),
  config: GOOGLE_PKCE_AUTH_CONFIG,
};

const integrationDependency2: IntegrationDependency = {
  id: validateRegistryId("test/service2"),
  outputKey: validateOutputKey("test2"),
  config: uuidSequence(2),
};

const integrationDependency3: IntegrationDependency = {
  id: validateRegistryId("test/service3"),
  outputKey: validateOutputKey("test3"),
  config: uuidSequence(3),
};

describe("findGoogleAccountIntegrationConfig", () => {
  beforeEach(() => {
    servicesLocateMock.mockReset();
  });

  test("when called with valid services value and undefined googleAccount, returns null", async () => {
    const result = await findGoogleAccountIntegrationConfig(
      [
        googlePKCEIntegrationDependency,
        integrationDependency2,
        integrationDependency3,
      ],
      undefined
    );
    expect(servicesLocateMock).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test("when called with valid services value and googleAccount expression, calls locate with correct args", async () => {
    await findGoogleAccountIntegrationConfig(
      [
        googlePKCEIntegrationDependency,
        integrationDependency2,
        integrationDependency3,
      ],
      {
        __type__: "var",
        __value__: "@google",
      }
    );
    expect(servicesLocateMock).toHaveBeenCalledWith(
      GOOGLE_PKCE_SERVICE_ID,
      GOOGLE_PKCE_AUTH_CONFIG
    );
  });

  test("when called with valid services value and invalid googleAccount expression, throws error", async () => {
    await expect(
      findGoogleAccountIntegrationConfig(
        [
          googlePKCEIntegrationDependency,
          integrationDependency2,
          integrationDependency3,
        ],
        {
          __type__: "var",
          __value__: "@test",
        }
      )
    ).rejects.toThrow(
      "Could not find integration configuration with output key test"
    );
  });

  test("when called with empty services value and googleAccount expression, throws error", async () => {
    await expect(
      findGoogleAccountIntegrationConfig([], {
        __type__: "var",
        __value__: "@google",
      })
    ).rejects.toThrow(
      "Could not find integration configuration with output key google"
    );
  });
});

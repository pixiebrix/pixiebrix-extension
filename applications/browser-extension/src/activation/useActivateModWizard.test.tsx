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

import useActivateModWizard, {
  wizardStateFactory,
} from "./useActivateModWizard";
import useDatabaseOptions from "../hooks/useDatabaseOptions";
import { valueToAsyncState } from "../utils/asyncStateUtils";
import * as Yup from "yup";

import {
  autoUUIDSequence,
  uuidSequence,
} from "../testUtils/factories/stringFactories";
import { defaultModDefinitionFactory } from "../testUtils/factories/modDefinitionFactories";
import { propertiesToSchema } from "../utils/schemaUtils";
import { makeDatabasePreviewName } from "./modOptionsHelpers";
import {
  FeatureFlags,
  mapRestrictedFeatureToFeatureFlag,
  RestrictedFeatures,
} from "../auth/featureFlags";
import { publicSharingDefinitionFactory } from "../testUtils/factories/registryFactories";
import { BusinessError } from "../errors/businessErrors";
import { type RegistryId } from "@/types/registryTypes";
import { appApiMock } from "../testUtils/appApiMock";
import { renderHook } from "../extensionConsole/testHelpers";
import { waitFor } from "@testing-library/react";
import { API_PATHS } from "../data/service/urlPaths";
import { type WizardStep } from "./wizardTypes";

jest.mock("../components/integrations/AuthWidget", () => {});

jest.mock("../hooks/useDatabaseOptions", () => ({
  __esModule: true,
  default: jest.fn(() => valueToAsyncState([])),
}));

const useDatabaseOptionsMock = jest.mocked(useDatabaseOptions);

jest.mock("../hooks/useAsyncModOptionsValidationSchema", () => ({
  __esModule: true,
  default: jest.fn(() => valueToAsyncState({})),
}));

describe("useActivateModWizard", () => {
  beforeEach(() => {
    appApiMock.reset();
    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, []);
  });

  test("show personalized tab", async () => {
    const { result } = renderHook(() =>
      useActivateModWizard(
        defaultModDefinitionFactory({
          // Page Editor produces normalized form
          options: {
            schema: propertiesToSchema(
              {
                foo: { type: "string" },
              },
              ["foo"],
            ),
          },
        }),
      ),
    );

    await waitFor(() => {
      const { data: { wizardSteps } = {} } = result.current;
      expect(wizardSteps).toHaveLength(2);
    });
  });

  test("hide personalized tab for empty schema", async () => {
    const { result } = renderHook(() =>
      useActivateModWizard(defaultModDefinitionFactory()),
    );

    await waitFor(() => {
      const { data: { wizardSteps } = {} } = result.current;
      expect(wizardSteps).toHaveLength(1);
    });
  });

  test("hide personalized tab for empty shorthand schema", async () => {
    const { result } = renderHook(() =>
      useActivateModWizard(defaultModDefinitionFactory()),
    );

    await waitFor(() => {
      const { data: { wizardSteps } = {} } = result.current;
      expect(wizardSteps).toHaveLength(1);
    });
  });

  test("show synchronize tab when MOD_PERSONAL_SYNC flag is on", async () => {
    appApiMock
      .onGet(API_PATHS.FEATURE_FLAGS)
      .reply(200, { flags: [FeatureFlags.MOD_PERSONAL_SYNC] });

    const { result } = renderHook(() =>
      useActivateModWizard(defaultModDefinitionFactory()),
    );
    let wizardSteps: WizardStep[] | undefined;
    await waitFor(() => {
      wizardSteps = result.current.data?.wizardSteps;
      expect(wizardSteps).toHaveLength(2);
    });
    expect(wizardSteps?.[0]?.key).toBe("synchronize");
  });

  test("sets database preview initial value", async () => {
    const name = "Database";
    const optionSchema = propertiesToSchema(
      {
        [name]: {
          $ref: "https://app.pixiebrix.com/schemas/database#",
          title: "Database",
          format: "preview",
        },
      },
      [name],
    );
    const modDefinition = defaultModDefinitionFactory({
      options: {
        schema: optionSchema,
      },
    });
    useDatabaseOptionsMock.mockReturnValue(
      valueToAsyncState([{ label: "Database2", value: uuidSequence(2) }]),
    );
    const { result } = renderHook(() => useActivateModWizard(modDefinition));

    await waitFor(() => {
      expect(result.current.data!.initialValues.optionsArgs).toEqual({
        [name]: makeDatabasePreviewName(modDefinition, optionSchema, name),
      });
    });
  });

  test("selects existing preview database", async () => {
    const name = "Database";
    const optionSchema = propertiesToSchema(
      {
        [name]: {
          $ref: "https://app.pixiebrix.com/schemas/database#",
          title: "Database",
          format: "preview",
        },
      },
      [name],
    );
    const modDefinition = defaultModDefinitionFactory({
      options: {
        schema: optionSchema,
      },
    });
    const databaseId = uuidSequence(1);
    useDatabaseOptionsMock.mockReturnValue(
      valueToAsyncState([
        {
          label: `${makeDatabasePreviewName(
            modDefinition,
            optionSchema,
            name,
          )} - Private`,
          value: databaseId,
        },
        { label: "Database2", value: uuidSequence(2) },
      ]),
    );
    const { result } = renderHook(() => useActivateModWizard(modDefinition));

    await waitFor(() => {
      expect(result.current.data!.initialValues.optionsArgs).toEqual({
        [name]: databaseId,
      });
    });
  });

  test("reject public marketplace activations", async () => {
    const modDefinition = defaultModDefinitionFactory({
      sharing: publicSharingDefinitionFactory(),
    });

    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
      flags: [
        mapRestrictedFeatureToFeatureFlag(RestrictedFeatures.MARKETPLACE),
      ],
    });

    const { result } = renderHook(() => useActivateModWizard(modDefinition));

    let currentResult: ReturnType<typeof useActivateModWizard> | undefined;
    await waitFor(() => {
      currentResult = result.current;
      expect(currentResult.isError).toBe(true);
    });
    expect(currentResult?.error).toBeInstanceOf(BusinessError);
    expect((currentResult?.error as BusinessError).message).toBe(
      "Your team's policy does not permit you to activate this mod. Contact your team admin for assistance",
    );
  });

  test("validation schema rejects personal deployment with local integrations", () => {
    const testAuthConfigId = autoUUIDSequence();
    const { validationSchema } = wizardStateFactory({
      flagOn: () => true,
      modDefinition: defaultModDefinitionFactory(),
      authOptions: [
        {
          value: testAuthConfigId,
          label: "Local Config",
          local: true,
          serviceId: "test-integration" as RegistryId,
          sharingType: "private",
        },
      ],
      defaultAuthOptions: {},
      databaseOptions: [],
      modInstance: undefined,
      optionsValidationSchema: Yup.object(),
      initialModOptions: {},
    });

    const testValues = {
      modComponents: {},
      integrationDependencies: [
        {
          integrationId: "test-integration",
          configId: testAuthConfigId,
          serviceId: "test-integration" as RegistryId,
          sharingType: "private",
        },
      ],
      optionsArgs: {},
      personalDeployment: true,
    };

    expect(() => validationSchema.validateSync(testValues)).toThrow(
      'Local integrations are not supported for mods with "Sync across devices" enabled',
    );
  });
});

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

import * as redux from "react-redux";
import useActivateModWizard from "@/activation/useActivateModWizard";
import { renderHook } from "@testing-library/react-hooks";
import useDatabaseOptions from "@/hooks/useDatabaseOptions";
import { valueToAsyncState } from "@/utils/asyncStateUtils";

import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { makeDatabasePreviewName } from "@/activation/modOptionsHelpers";
import { useGetFeatureFlagsQuery } from "@/data/service/api";
import {
  mapRestrictedFeatureToFeatureFlag,
  RestrictedFeatures,
} from "@/auth/featureFlags";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import { BusinessError } from "@/errors/businessErrors";

jest.mock("@/components/integrations/AuthWidget", () => {});
jest.mock("react-redux");
jest.mock("@/data/service/api", () => ({
  useGetFeatureFlagsQuery: jest.fn(() => valueToAsyncState([])),
  useGetIntegrationAuthsQuery: jest.fn(() => valueToAsyncState([])),
}));

jest.mock("@/hooks/useDatabaseOptions", () => ({
  __esModule: true,
  default: jest.fn(() => valueToAsyncState([])),
}));

const useDatabaseOptionsMock = jest.mocked(useDatabaseOptions);

jest.mock("@/hooks/useAsyncModOptionsValidationSchema", () => ({
  __esModule: true,
  default: jest.fn(() => valueToAsyncState({})),
}));

describe("useActivateModWizard", () => {
  test("show personalized tab", () => {
    const spy = jest.spyOn(redux, "useSelector");
    spy.mockReturnValue([]);

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

    const { data: { wizardSteps } = {} } = result.current;
    expect(wizardSteps).toHaveLength(2);
  });

  test("hide personalized tab for empty schema", () => {
    const spy = jest.spyOn(redux, "useSelector");
    spy.mockReturnValue([]);

    const { result } = renderHook(() =>
      useActivateModWizard(defaultModDefinitionFactory()),
    );

    const { data: { wizardSteps } = {} } = result.current;
    expect(wizardSteps).toHaveLength(1);
  });

  test("hide personalized tab for empty shorthand schema", () => {
    const spy = jest.spyOn(redux, "useSelector");
    spy.mockReturnValue([]);

    const { result } = renderHook(() =>
      useActivateModWizard(defaultModDefinitionFactory()),
    );

    const { data: { wizardSteps } = {} } = result.current;
    expect(wizardSteps).toHaveLength(1);
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

    expect(result.current.data!.initialValues.optionsArgs).toEqual({
      [name]: makeDatabasePreviewName(modDefinition, optionSchema, name),
    });
  });

  test("selects existing preview database", () => {
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

    expect(result.current.data!.initialValues.optionsArgs).toEqual({
      [name]: databaseId,
    });
  });

  test("reject public marketplace activations", () => {
    const modDefinition = defaultModDefinitionFactory({
      sharing: sharingDefinitionFactory({
        public: true,
      }),
    });

    jest
      .mocked(useGetFeatureFlagsQuery)
      .mockReturnValue(
        valueToAsyncState([
          mapRestrictedFeatureToFeatureFlag(RestrictedFeatures.MARKETPLACE),
        ]) as any,
      );

    const { result } = renderHook(() => useActivateModWizard(modDefinition));

    const { isError, error } = result.current;
    expect(isError).toBe(true);
    expect(error).toBeInstanceOf(BusinessError);
    expect((error as BusinessError).message).toBe(
      "Your team's policy does not permit you to activate this mod. Contact your team admin for assistance",
    );
  });
});

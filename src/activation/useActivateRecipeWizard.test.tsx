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

import * as redux from "react-redux";
import { recipeDefinitionFactory, uuidSequence } from "@/testUtils/factories";
import useActivateRecipeWizard, {
  makeDatabasePreviewName,
} from "@/activation/useActivateRecipeWizard";
import { renderHook } from "@testing-library/react-hooks";
import { propertiesToSchema } from "@/validators/generic";
import useDatabaseOptions from "@/hooks/useDatabaseOptions";
import { valueToAsyncState } from "@/utils/asyncStateUtils";

jest.mock("@/components/auth/AuthWidget", () => {});
jest.mock("react-redux");
jest.mock("connected-react-router");
jest.mock("@/services/api", () => ({
  useGetServiceAuthsQuery: jest.fn().mockReturnValue({
    data: [],
  }),
}));

jest.mock("@/hooks/useDatabaseOptions", () => ({
  __esModule: true,
  default: jest.fn(() => valueToAsyncState([])),
}));

const useDatabaseOptionsMock = jest.mocked(useDatabaseOptions);

jest.mock("@/hooks/useAsyncRecipeOptionsValidationSchema", () => ({
  __esModule: true,
  default: jest.fn(() => valueToAsyncState({})),
}));

describe("useActivateRecipeWizard", () => {
  test("show personalized tab", () => {
    const spy = jest.spyOn(redux, "useSelector");
    spy.mockReturnValue([]);

    const { result } = renderHook(() =>
      useActivateRecipeWizard(
        recipeDefinitionFactory({
          // Page Editor produces normalized form
          options: {
            schema: propertiesToSchema({
              foo: { type: "string" },
            }),
          },
        })
      )
    );

    const {
      data: { wizardSteps },
    } = result.current;
    expect(wizardSteps).toHaveLength(2);
  });

  test("hide personalized tab for empty schema", () => {
    const spy = jest.spyOn(redux, "useSelector");
    spy.mockReturnValue([]);

    const { result } = renderHook(() =>
      useActivateRecipeWizard(recipeDefinitionFactory())
    );

    const {
      data: { wizardSteps },
    } = result.current;
    expect(wizardSteps).toHaveLength(1);
  });

  test("hide personalized tab for empty shorthand schema", () => {
    const spy = jest.spyOn(redux, "useSelector");
    spy.mockReturnValue([]);

    const { result } = renderHook(() =>
      useActivateRecipeWizard(recipeDefinitionFactory())
    );

    const {
      data: { wizardSteps },
    } = result.current;
    expect(wizardSteps).toHaveLength(1);
  });

  test("sets database preview initial value", async () => {
    const name = "Database";
    const optionSchema = propertiesToSchema({
      [name]: {
        $ref: "https://app.pixiebrix.com/schemas/database#",
        title: "Database",
        format: "preview",
      },
    });
    const recipe = recipeDefinitionFactory({
      options: {
        schema: optionSchema,
      },
    });
    useDatabaseOptionsMock.mockReturnValue(
      valueToAsyncState([{ label: "Database2", value: uuidSequence(2) }])
    );
    const { result } = renderHook(() => useActivateRecipeWizard(recipe));

    expect(result.current.data.initialValues.optionsArgs).toEqual({
      [name]: makeDatabasePreviewName(recipe, optionSchema, name),
    });
  });

  test("selects existing preview database", () => {
    const name = "Database";
    const optionSchema = propertiesToSchema({
      [name]: {
        $ref: "https://app.pixiebrix.com/schemas/database#",
        title: "Database",
        format: "preview",
      },
    });
    const recipe = recipeDefinitionFactory({
      options: {
        schema: optionSchema,
      },
    });
    const databaseId = uuidSequence(1);
    useDatabaseOptionsMock.mockReturnValue(
      valueToAsyncState([
        {
          label: `${makeDatabasePreviewName(
            recipe,
            optionSchema,
            name
          )} - Private`,
          value: databaseId,
        },
        { label: "Database2", value: uuidSequence(2) },
      ])
    );
    const { result } = renderHook(() => useActivateRecipeWizard(recipe));

    expect(result.current.data.initialValues.optionsArgs).toEqual({
      [name]: databaseId,
    });
  });
});

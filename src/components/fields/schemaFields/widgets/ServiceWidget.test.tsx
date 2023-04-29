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

import ServiceWidget, {
  defaultOutputKey,
} from "@/components/fields/schemaFields/widgets/ServiceWidget";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import React from "react";
import { render } from "@/pageEditor/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { type Schema } from "@/types/schemaTypes";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
// eslint-disable-next-line no-restricted-imports -- test
import { Formik } from "formik";
import { useAuthOptions } from "@/hooks/auth";
import { waitForEffect } from "@/testUtils/testHelpers";
import { liftValue } from "@/utils/asyncStateUtils";

jest.mock("@/hooks/auth", () => ({
  useAuthOptions: jest.fn(),
}));

jest.mock("@/components/fields/schemaFields/serviceFieldUtils", () => ({
  ...jest.requireActual("@/components/fields/schemaFields/serviceFieldUtils"),
  // Mock so we don't have to have full Page Editor state in tests
  produceExcludeUnusedDependencies: jest.fn().mockImplementation((x: any) => x),
}));

const useAuthOptionsMock = useAuthOptions as jest.MockedFunction<
  typeof useAuthOptions
>;

beforeAll(() => {
  registerDefaultWidgets();
});

describe("defaultOutputKey", () => {
  test("should handle default", () => {
    expect(defaultOutputKey(null, [])).toBe("service");
  });

  test("should handle id without collection", () => {
    expect(defaultOutputKey(validateRegistryId("google/sheet"), [])).toBe(
      "google"
    );
  });

  test("should generate fresh identifier", () => {
    expect(
      defaultOutputKey(validateRegistryId("google/sheet"), [
        validateOutputKey("google"),
      ])
    ).toBe("google2");
  });
});

const renderServiceWidget = (
  schema: Schema,
  initialValues: any,
  props?: Partial<SchemaFieldProps>
) =>
  render(
    <Formik initialValues={initialValues} onSubmit={jest.fn()}>
      <ServiceWidget name="service" schema={schema} {...props} />
    </Formik>
  );

describe("ServiceWidget", () => {
  it("should not default if there are multiple auth options", async () => {
    const serviceId = validateRegistryId("jest/api");

    useAuthOptionsMock.mockReturnValue(
      liftValue([
        {
          serviceId,
          label: "Test 1",
          value: uuidv4(),
          local: true,
          sharingType: "built-in",
        },
        {
          serviceId,
          label: "Test 2",
          value: uuidv4(),
          local: true,
          sharingType: "built-in",
        },
      ])
    );

    const schema = {
      $ref: `https://app.pixiebrix.com/schemas/services/${serviceId}`,
    };

    const wrapper = renderServiceWidget(schema, {
      services: [],
    });

    await waitForEffect();

    expect(wrapper.queryByText("Select...")).toBeVisible();
  });

  it("should default to only configuration", async () => {
    const serviceId = validateRegistryId("jest/api");

    useAuthOptionsMock.mockReturnValue(
      liftValue([
        {
          serviceId,
          label: "Test 1",
          value: uuidv4(),
          local: true,
          sharingType: "built-in",
        },
      ])
    );

    const schema = {
      $ref: `https://app.pixiebrix.com/schemas/services/${serviceId}`,
    };

    const wrapper = renderServiceWidget(schema, {
      services: [],
    });

    await waitForEffect();

    expect(wrapper.queryByText("Test 1")).toBeVisible();
  });
});

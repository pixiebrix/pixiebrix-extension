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

import IntegrationDependencyWidget, {
  defaultOutputKey,
} from "@/components/fields/schemaFields/integrations/IntegrationDependencyWidget";
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
import {
  loadingAsyncStateFactory,
  valueToAsyncState,
} from "@/utils/asyncStateUtils";
import selectEvent from "react-select-event";
import { act, screen } from "@testing-library/react";

import { toExpression } from "@/utils/expressionUtils";

jest.mock("@/hooks/auth");

const useAuthOptionsMock = jest.mocked(useAuthOptions);

beforeAll(() => {
  registerDefaultWidgets();
});

describe("defaultOutputKey", () => {
  test("should handle default", () => {
    expect(defaultOutputKey(null, [])).toBe("integration");
  });

  test("should handle id without collection", () => {
    expect(defaultOutputKey(validateRegistryId("google/sheet"), [])).toBe(
      "google",
    );
  });

  test("should generate fresh identifier", () => {
    expect(
      defaultOutputKey(validateRegistryId("google/sheet"), [
        validateOutputKey("google"),
      ]),
    ).toBe("google2");
  });
});

const renderWidget = (
  schema: Schema,
  initialValues: any = {},
  props?: Partial<SchemaFieldProps>,
) =>
  render(
    <Formik
      initialValues={{
        // Default empty, let initialValues override if needed
        integrationDependencies: [],
        ...initialValues,
        modComponent: { blockPipeline: [{ config: { service: null } }] },
      }}
      onSubmit={jest.fn()}
    >
      {({ values }) => (
        <>
          <IntegrationDependencyWidget
            name="modComponent.brickPipeline.0.config.service"
            schema={schema}
            {...props}
          />
          <div data-testid="values">{JSON.stringify(values)}</div>
        </>
      )}
    </Formik>,
  );

describe("ServiceWidget", () => {
  it("show no options while loading", async () => {
    const serviceId = validateRegistryId("jest/api");

    useAuthOptionsMock.mockReturnValue({
      ...loadingAsyncStateFactory(),
      refetch: jest.fn(),
    });

    const schema = {
      $ref: `https://app.pixiebrix.com/schemas/services/${serviceId}`,
    };

    renderWidget(schema);

    await waitForEffect();

    expect(screen.getByText("Select...")).toBeVisible();
  });

  it("should not default if there are multiple auth options", async () => {
    const serviceId = validateRegistryId("jest/api");

    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([
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
      ]),
    );

    const schema = {
      $ref: `https://app.pixiebrix.com/schemas/services/${serviceId}`,
    };

    renderWidget(schema);

    await waitForEffect();

    expect(screen.getByText("Select...")).toBeVisible();
  });

  it("should default to only configuration", async () => {
    const serviceId = validateRegistryId("jest/api");

    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([
        {
          serviceId,
          label: "Test 1",
          value: uuidv4(),
          local: true,
          sharingType: "built-in",
        },
      ]),
    );

    const schema = {
      $ref: `https://app.pixiebrix.com/schemas/services/${serviceId}`,
    };

    renderWidget(schema);

    await waitForEffect();

    expect(screen.getByText("Test 1")).toBeVisible();
  });

  it("allow any for HTTP Request brick", async () => {
    const serviceId = validateRegistryId("jest/api");
    const otherServiceId = validateRegistryId("jest/other");

    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([
        {
          serviceId,
          label: "Test 1",
          value: uuidv4(),
          local: true,
          sharingType: "built-in",
        },
        {
          serviceId: otherServiceId,
          label: "Test 2",
          value: uuidv4(),
          local: true,
          sharingType: "built-in",
        },
      ]),
    );

    const schema = {
      $ref: "https://app.pixiebrix.com/schemas/service#/definitions/configuredService",
    };

    renderWidget(schema);

    await waitForEffect();

    const select = screen.getByRole("combobox");

    await act(async () => {
      await selectEvent.select(select, "Test 1");
      await selectEvent.select(select, "Test 2");
    });

    const state = JSON.parse(screen.getByTestId("values").textContent);

    expect(state).toEqual({
      modComponent: {
        blockPipeline: [
          {
            config: {
              service: toExpression("var", "@jest2"),
            },
          },
        ],
      },
      // The original integration dependency should automatically be cleaned up
      integrationDependencies: [
        expect.objectContaining({
          integrationId: otherServiceId,
        }),
      ],
    });
  });
});

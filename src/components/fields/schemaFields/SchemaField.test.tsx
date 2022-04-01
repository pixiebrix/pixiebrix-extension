/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { Formik } from "formik";
import { ApiVersion, Expression, Schema, TemplateEngine } from "@/core";
import { createFormikTemplate } from "@/testUtils/formHelpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";
import { uniq } from "lodash";
import { expectToggleOptions } from "@/components/fields/schemaFields/fieldTestUtils";
import registerDefaultWidgets from "./widgets/registerDefaultWidgets";

interface SchemaTestCase {
  name: string;
  schema: Schema;
}

const sampleSchemas: SchemaTestCase[] = [
  {
    name: "empty",
    schema: {},
  },

  {
    name: "any properties",
    schema: {
      additionalProperties: true,
    },
  },

  {
    name: "basic string",
    schema: {
      type: "string",
    },
  },
  {
    name: "basic number",
    schema: {
      type: "number",
    },
  },
  {
    name: "basic integer",
    schema: {
      type: "integer",
    },
  },
  {
    name: "basic boolean",
    schema: {
      type: "boolean",
    },
  },

  {
    name: "basic object",
    schema: {
      type: "object",
    },
  },
  {
    name: "object with defined properties",
    schema: {
      type: "object",
      properties: {
        myString: { type: "string" },
        myBool: { type: "boolean" },
      },
    },
  },
  {
    name: "object with any additional properties",
    schema: {
      type: "object",
      additionalProperties: true,
    },
  },
  {
    name: "object with property types",
    schema: {
      type: "object",
      additionalProperties: {
        type: ["string", "number", "boolean"],
      },
    },
  },
  {
    name: "object with required fields",
    schema: {
      type: "object",
      properties: {
        myRequiredString: { type: "string" },
        myRequiredBool: { type: "boolean" },
        myString: { type: "string" },
        myNumber: { type: "number" },
      },
      required: ["myRequiredString", "myRequiredBool"],
    },
  },

  {
    name: "string array",
    schema: {
      type: "array",
      items: { type: "string" },
    },
  },
  {
    name: "array of objects with properties",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: ["string", "number", "boolean"] },
        },
      },
    },
  },

  {
    name: "oneOf string or number",
    schema: {
      oneOf: [{ type: "string" }, { type: "number" }],
    },
  },
  {
    name: "oneOf boolean or number",
    schema: {
      oneOf: [{ type: "boolean" }, { type: "number" }],
    },
  },
  {
    name: "oneOf boolean or string",
    schema: {
      oneOf: [{ type: "boolean" }, { type: "string" }],
    },
  },
  {
    name: "oneOf boolean, string, or number",
    schema: {
      oneOf: [{ type: "boolean" }, { type: "string" }, { type: "number" }],
    },
  },
];

const schemaTestCases: ReadonlyArray<[name: string, schema: Schema]> =
  sampleSchemas.map(({ name, schema }) => [name, schema]);

function expressionValue<T extends TemplateEngine>(
  type: T,
  value = ""
): Expression<string, T> {
  return {
    __type__: type,
    __value__: value,
  };
}

beforeAll(() => {
  registerDefaultWidgets();
});

describe("SchemaField", () => {
  test.each([["v1"], ["v2"]])(
    "show toggle widget for %s",
    (version: ApiVersion) => {
      const { container } = render(
        <Formik
          onSubmit={() => {}}
          initialValues={{ apiVersion: version, testField: "" }}
        >
          <SchemaField
            name="testField"
            schema={{
              type: "string",
              title: "Test Field",
              description: "A test field",
            }}
          />
        </Formik>
      );

      // Renders text entry HTML element
      expect(container.querySelector("textarea")).not.toBeNull();
      expect(container.querySelector("button")).not.toBeNull();
    }
  );

  test("string field options", async () => {
    const { container } = render(
      <Formik
        onSubmit={() => {}}
        initialValues={{ apiVersion: "v3", testField: "" }}
      >
        <SchemaField
          name="testField"
          schema={{
            type: "string",
            title: "Test Field",
            description: "A test field",
          }}
        />
      </Formik>
    );

    // Renders text entry HTML element
    expect(container.querySelector("textarea")).not.toBeNull();

    await expectToggleOptions(container, ["string", "var", "omit"]);
  });

  test("integer field options", async () => {
    const { container } = render(
      <Formik
        onSubmit={() => {}}
        initialValues={{ apiVersion: "v3", testField: 42 }}
      >
        <SchemaField
          name="testField"
          schema={{
            type: "integer",
            title: "Test Field",
            description: "A test field",
          }}
        />
      </Formik>
    );

    // Renders number entry HTML element
    expect(container.querySelector("input[type='number']")).not.toBeNull();
    await expectToggleOptions(container, ["number", "var", "omit"]);
  });

  test.each`
    startValue                             | inputMode     | toggleOption  | expectedEndValue
    ${{ foo: "bar" }}                      | ${"Object"}   | ${"Variable"} | ${expressionValue("var")}
    ${1.23}                                | ${"Number"}   | ${"Text"}     | ${expressionValue("nunjucks", "1.23")}
    ${1.23}                                | ${"Number"}   | ${"Variable"} | ${expressionValue("var", "1.23")}
    ${expressionValue("var", "abc")}       | ${"Variable"} | ${"Text"}     | ${expressionValue("nunjucks", "abc")}
    ${expressionValue("nunjucks", "abc")}  | ${"Text"}     | ${"Variable"} | ${expressionValue("var", "abc")}
    ${expressionValue("nunjucks", "1.23")} | ${"Text"}     | ${"Number"}   | ${1.23}
    ${expressionValue("var", "1.23")}      | ${"Variable"} | ${"Number"}   | ${1.23}
    ${expressionValue("nunjucks", "def")}  | ${"Text"}     | ${"Array"}    | ${[]}
    ${expressionValue("var", "abc")}       | ${"Variable"} | ${"Object"}   | ${{}}
  `(
    "Test field toggle transition from $inputMode to $toggleOption",
    async ({ startValue, toggleOption, expectedEndValue }) => {
      const initialState = {
        apiVersion: "v3",
        myField: startValue,
      };
      const onSubmit = jest.fn();
      const FormikTemplate = createFormikTemplate(initialState, onSubmit);

      // Using an empty schema to allow anything, since we're testing toggling, not schema parsing
      render(
        <FormikTemplate>
          <SchemaField name={"myField"} schema={{}} />
        </FormikTemplate>
      );

      await waitForEffect();

      const toggle = screen
        .getByTestId("toggle-myField")
        .querySelector("button");
      expect(toggle).not.toBeNull();

      userEvent.click(toggle);

      const newOption = screen.getByText(toggleOption, { exact: false });
      expect(newOption).not.toBeNull();

      // Await this element to avoid the "unable to click element" error
      await waitFor(() => {
        userEvent.click(newOption);
      });

      userEvent.click(screen.getByRole("button", { name: /submit/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          apiVersion: "v3",
          myField: expectedEndValue,
        });
      });
    }
  );

  test("string/integer field options", async () => {
    const { container } = render(
      <Formik
        onSubmit={() => {}}
        initialValues={{ apiVersion: "v3", testField: 42 }}
      >
        <SchemaField
          name="testField"
          schema={{
            type: ["integer", "string"],
            title: "Test Field",
            description: "A test field",
          }}
        />
      </Formik>
    );

    // Renders number entry HTML element because current value is a number
    expect(container.querySelector("input[type='number']")).not.toBeNull();
    await expectToggleOptions(container, ["string", "number", "var", "omit"]);
  });

  test.each(schemaTestCases)(
    "v3 field toggle doesn't show duplicate options - %s",
    async (_, schema) => {
      const fieldName = "aTestField";
      const FormikTemplate = createFormikTemplate({ apiVersion: "v3" });
      const { container } = render(
        <FormikTemplate>
          <SchemaField name={fieldName} schema={schema} />
        </FormikTemplate>
      );

      await waitForEffect();

      const widgetLoadingIndicator = screen.queryByTestId(
        `${fieldName}-widget-loading`
      );
      expect(widgetLoadingIndicator).toBeNull();

      const toggle = screen
        .queryByTestId(`toggle-${fieldName}`)
        .querySelector("button");
      expect(toggle).not.toBeNull();

      userEvent.click(toggle);

      await waitFor(() => {
        const testIds = [
          ...container.querySelectorAll<HTMLElement>("a.dropdown-item"),
        ].map((x) => x.dataset.testid);
        expect(testIds).toEqual(uniq(testIds));
      });
    }
  );

  test.each(schemaTestCases)(
    "v3 field toggle always renders 'omit' last - %s",
    async (_, schema) => {
      const FormikTemplate = createFormikTemplate({ apiVersion: "v3" });
      const { container } = render(
        <FormikTemplate>
          <SchemaField name="aTestField" schema={schema} />
        </FormikTemplate>
      );

      await waitForEffect();

      const toggle = screen
        .getByTestId("toggle-aTestField")
        .querySelector("button");
      expect(toggle).not.toBeNull();

      userEvent.click(toggle);

      await waitFor(() => {
        const testIds = [
          ...container.querySelectorAll<HTMLElement>("a.dropdown-item"),
        ].map((x) => x.dataset.testid);
        if (testIds.includes("omit")) {
          expect(testIds[testIds.length - 1]).toEqual("omit");
        }
      });
    }
  );
});

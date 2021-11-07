/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { render, fireEvent } from "@testing-library/react";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { Formik } from "formik";

function expectToggleOptions(container: HTMLElement, expected: string[]): void {
  // React Bootstrap dropdown does not render children items unless toggled
  fireEvent.click(container.querySelector("button"));
  const actual = new Set(
    [...container.querySelectorAll("a")].map((x) =>
      x.getAttribute("data-testid")
    )
  );
  expect(actual).toEqual(new Set(expected));
}

describe("SchemaField", () => {
  test.each([["v1"], ["v2"]])("don't show toggle widget for %s", () => {
    const { container } = render(
      <Formik
        onSubmit={() => {}}
        initialValues={{ apiVersion: "v2", testField: "" }}
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
    expect(container.querySelector("input[type='text']")).not.toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });
});

describe("SchemaField", () => {
  test("string field options", () => {
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
    expect(container.querySelector("input[type='text']")).not.toBeNull();

    expectToggleOptions(container, [
      "string",
      "var",
      "mustache",
      "nunjucks",
      "omit",
    ]);
  });

  test("integer field options", () => {
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
    expectToggleOptions(container, ["number", "var", "omit"]);
  });

  test("string/integer field options", () => {
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
    expectToggleOptions(container, [
      "string",
      "number",
      "var",
      "mustache",
      "nunjucks",
      "omit",
    ]);
  });
});

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
import { render, screen } from "@testing-library/react";
import FieldTemplate, { CustomFieldWidget, FieldProps } from "./FieldTemplate";
import { fireTextInput } from "@/utils/testUtils/formHelpers";

const testLabel = "Test label";
const testValue = "Test value";

const renderFieldTemplate = (partialProps?: Partial<FieldProps>) =>
  render(
    <FieldTemplate name={"testName"} onChange={jest.fn()} {...partialProps} />
  );

test.each([
  ["BS FormControl", undefined],
  [
    "custom widget",
    (({ id }) => (
      <input type="text" id={id} onChange={jest.fn()} />
    )) as CustomFieldWidget,
  ],
])("binds label and input for %s", (_caseName, as) => {
  renderFieldTemplate({
    label: testLabel,
    as,
  });

  // Label
  expect(screen.getByText(testLabel)).not.toBeNull();
  // Input
  expect(screen.getByLabelText(testLabel)).not.toBeNull();
});

test("passes value to custom widget", () => {
  renderFieldTemplate({
    label: testLabel,
    value: testValue,
    as: (({ id, value }) => (
      <input type="text" id={id} value={value} onChange={jest.fn()} />
    )) as CustomFieldWidget,
  });

  expect(screen.getByLabelText(testLabel)).toHaveValue(testValue);
});

test("emits onChange", () => {
  const onChangeMock = jest.fn();

  renderFieldTemplate({
    label: testLabel,
    onChange: onChangeMock,
    as: (({ id, onChange }) => (
      <input type="text" id={id} onChange={onChange} />
    )) as CustomFieldWidget,
  });

  fireTextInput(screen.getByLabelText(testLabel), testValue);

  expect(onChangeMock).toHaveBeenCalledTimes(1);
  expect(onChangeMock.mock.calls[0][0].target.value).toBe(testValue);
});

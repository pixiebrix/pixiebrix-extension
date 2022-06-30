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
import FieldTemplate, {
  computeLabelAndColSize,
  CustomFieldWidget,
  FieldProps,
} from "./FieldTemplate";
import { fireTextInput } from "@/testUtils/formHelpers";

describe("FieldTemplate", () => {
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
});

describe("computeLabelAndColSize", () => {
  test.each([true, false])("when fitLabelWidth", (widerLabel: boolean) => {
    const { labelSize, colSize } = computeLabelAndColSize(
      true,
      widerLabel,
      "Test label"
    );

    expect(labelSize).toEqual({ lg: "auto" });
    expect(colSize).toEqual({ lg: true });
  });

  test("when not fitLabelWidth, widerLabel, and label", () => {
    const { labelSize, colSize } = computeLabelAndColSize(
      false,
      true,
      "Test label"
    );

    expect(labelSize).toEqual({ lg: "4", xl: "3" });
    expect(colSize).toEqual({ lg: "8", xl: "9" });
  });

  test("when not fitLabelWidth, not widerLabel, and label", () => {
    const { labelSize, colSize } = computeLabelAndColSize(
      false,
      false,
      "Test label"
    );

    expect(labelSize).toEqual({ lg: "3", xl: "2" });
    expect(colSize).toEqual({ lg: "9", xl: "10" });
  });

  test("when not fitLabelWidth, widerLabel, and no label", () => {
    const { labelSize, colSize } = computeLabelAndColSize(false, true, null);

    expect(labelSize).toEqual({ lg: "4", xl: "3" });
    expect(colSize).toEqual({ lg: "12", xl: "12" });
  });
  test("when not fitLabelWidth, not widerLabel, and no label", () => {
    const { labelSize, colSize } = computeLabelAndColSize(false, false, null);

    expect(labelSize).toEqual({ lg: "3", xl: "2" });
    expect(colSize).toEqual({ lg: "12", xl: "12" });
  });
});

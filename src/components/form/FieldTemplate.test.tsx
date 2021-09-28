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
import { render, screen } from "@testing-library/react";
import { randomWords } from "@/tests/testHelpers";
import FieldTemplate, { CustomFieldWidget, FieldProps } from "./FieldTemplate";
import styles from "./FieldTemplate.module.scss";

const renderFieldTemplate = (partialProps?: Partial<FieldProps>) =>
  render(
    <FieldTemplate
      name={randomWords()}
      onChange={jest.fn()}
      {...partialProps}
    />
  );
test("renders horizontal layout by default", () => {
  const { container } = renderFieldTemplate();
  expect(container.firstChild).toHaveClass(styles.horizontalFormGroup);
});
test("renders horizontal layout", () => {
  const { container } = renderFieldTemplate({
    layout: "horizontal",
  });
  expect(container.firstChild).toHaveClass(styles.horizontalFormGroup);
});
test("renders vertical layout", () => {
  const { container } = renderFieldTemplate({
    layout: "vertical",
  });
  expect(container.firstChild).toHaveClass(styles.verticalFormGroup);
});

test.each([
  ["BS FormControl", undefined],
  [
    "custom widget",
    (({ id }) => <input type="text" id={id} />) as CustomFieldWidget,
  ],
])("binds label and input for %s", (_caseName, as) => {
  const label = randomWords();
  renderFieldTemplate({
    name: randomWords(),
    label,
    as,
  });

  // Label
  expect(screen.getByText(label)).not.toBeNull();
  // Input
  expect(screen.getByLabelText(label)).not.toBeNull();
});

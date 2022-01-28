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

import { render } from "@testing-library/react";
import React from "react";
import selectEvent from "react-select-event";
import SelectWidget, { Option } from "./SelectWidget";

const options: Option[] = [
  {
    label: "Test label 1",
    value: "value1",
  },
  {
    label: "Test label 2",
    value: "value2",
  },
];

test("renders value", () => {
  const name = "Name for Test";
  const rendered = render(
    <SelectWidget
      id="idForTest"
      name={name}
      options={options}
      value={options[1].value}
      onChange={jest.fn()}
    />
  );
  expect(rendered.asFragment()).toMatchSnapshot();
});

test("calls onChange", async () => {
  const id = "idForTest";
  const name = "Name for Test";
  const onChangeMock = jest.fn();
  const { container } = render(
    <SelectWidget
      id={id}
      name={name}
      options={options}
      value={options[1].value}
      onChange={onChangeMock}
    />
  );

  const optionToSelect = options[0];
  await selectEvent.select(
    container.querySelector(`#${id}`),
    optionToSelect.label
  );

  expect(onChangeMock).toHaveBeenCalledWith({
    target: {
      options,
      value: optionToSelect.value,
      name,
    },
  });
});

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

import { render, screen } from "@testing-library/react";
import React from "react";
import selectEvent from "react-select-event";
import SelectWidget, { type Option } from "./SelectWidget";
import { type GroupBase } from "react-select";
import { waitForEffect } from "@/testUtils/testHelpers";

describe("options", () => {
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
    const selectedOption = options[1]!;
    const { asFragment } = render(
      <SelectWidget
        id="idForTest"
        name={name}
        options={options}
        value={selectedOption.value}
        onChange={jest.fn()}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByText(selectedOption.label)).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- react-select works via hidden input element that can't be accessed via getByRole
    const hiddenInput = document.querySelector("input[type=hidden]");
    expect(hiddenInput).toHaveAttribute("name", name);
    expect(hiddenInput).toHaveAttribute("value", selectedOption.value);
  });

  test("calls onChange", async () => {
    const id = "idForTest";
    const name = "Name for Test";
    const onChangeMock = jest.fn();
    const selectedOption = options[1]!;
    render(
      <SelectWidget
        id={id}
        name={name}
        options={options}
        value={selectedOption.value}
        onChange={onChangeMock}
      />,
    );

    const optionToSelect = options[0]!;
    await selectEvent.select(
      screen.getByRole("combobox"),
      optionToSelect.label,
    );

    expect(onChangeMock).toHaveBeenCalledWith({
      target: {
        options,
        value: optionToSelect.value,
        name,
      },
    });
  });
});

describe("grouped options", () => {
  const groupedOptions: Array<GroupBase<Option>> = [
    {
      label: "Group 1",
      options: [
        {
          label: "Group 1 label 1",
          value: "group1value1",
        },
        {
          label: "Group1 label 2",
          value: "group1value2",
        },
      ],
    },
    {
      label: "Group 2",
      options: [
        {
          label: "Group 2 label 1",
          value: "group2value1",
        },
        {
          label: "Group 2 label 2",
          value: "group2value2",
        },
      ],
    },
  ];

  test("renders grouped options", async () => {
    const name = "Test field";
    const selectedOption = groupedOptions[1]!.options[0]!;
    render(
      <SelectWidget
        id="testField"
        name={name}
        options={groupedOptions}
        value={selectedOption.value}
        onChange={jest.fn()}
      />,
    );

    await waitForEffect();
    expect(screen.getByText(selectedOption.label)).toBeInTheDocument();

    // eslint-disable-next-line testing-library/no-node-access -- react-select works via hidden input element that can't be accessed via getByRole
    const hiddenInput = document.querySelector("input[type=hidden]");
    expect(hiddenInput).toHaveAttribute("name", name);
    expect(hiddenInput).toHaveAttribute("value", selectedOption.value);
  });

  test("calls onChange", async () => {
    const id = "idForTest";
    const name = "Name for Test";
    const onChangeMock = jest.fn();
    const selectedOption = groupedOptions[1]!.options[0]!;

    render(
      <SelectWidget
        id={id}
        name={name}
        options={groupedOptions}
        value={selectedOption.value}
        onChange={onChangeMock}
      />,
    );

    const optionToSelect = groupedOptions[0]!.options[1]!;
    await selectEvent.select(
      screen.getByRole("combobox"),
      optionToSelect.label,
    );

    expect(onChangeMock).toHaveBeenCalledWith({
      target: {
        options: groupedOptions,
        value: optionToSelect.value,
        name,
      },
    });
  });
});

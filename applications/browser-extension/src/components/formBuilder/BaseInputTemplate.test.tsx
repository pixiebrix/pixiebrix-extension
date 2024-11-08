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

import BaseInputTemplate, {
  type StrictBaseInputTemplateProps,
} from "./BaseInputTemplate";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type JSONSchema7 } from "json-schema";
import React from "react";

describe("RJSF BaseInputTemplate Override", () => {
  function getProps(id: string, schema: JSONSchema7, type?: string) {
    return {
      value: "",
      id,
      name: id,
      schema,
      options: {},
      label: "",
      type,
      onBlur: jest.fn(),
      onChange: jest.fn(),
      onFocus: jest.fn(),
      // Required by type, not used by component
      registry: null as unknown as StrictBaseInputTemplateProps["registry"],
    } satisfies StrictBaseInputTemplateProps;
  }

  it("renders a standard text input when the type is text", () => {
    const schema = { title: "Text", type: "string" } as JSONSchema7;

    render(<BaseInputTemplate {...getProps("text", schema)} />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders a text input with type email when the format is email", () => {
    const schema = {
      title: "Email",
      type: "string",
      format: "email",
    } as JSONSchema7;

    render(<BaseInputTemplate {...getProps("email", schema, "email")} />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("renders a text input with type url when the format is url", () => {
    const schema = {
      title: "URL",
      type: "string",
      format: "url",
    } as JSONSchema7;

    render(<BaseInputTemplate {...getProps("url", schema, "url")} />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "url");
  });

  it("renders a file input when the format is data-url", () => {
    const schema = {
      title: "File",
      type: "string",
      format: "data-url",
    } as JSONSchema7;

    const { container } = render(
      <BaseInputTemplate {...getProps("url", schema, "file")} />,
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- TODO: use better selector method
    const input = container.querySelector("#url");

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "file");
  });

  it("renders a date picker when the format is date", () => {
    const schema = {
      title: "Date",
      type: "string",
      format: "date",
    } as JSONSchema7;

    const { container } = render(
      <BaseInputTemplate {...getProps("date", schema, "date")} />,
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- TODO: use better selector method
    const input = container.querySelector("#date");

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "date");
  });

  it("renders a date-time picker when the format is date-time", () => {
    const schema = {
      title: "Date-Time",
      type: "string",
      format: "date-time",
    } as JSONSchema7;

    const { container } = render(
      <BaseInputTemplate {...getProps("dateTime", schema, "datetime-local")} />,
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- TODO: use better selector method
    const input = container.querySelector("#dateTime");

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "datetime-local");
  });

  it("renders a standard text input with inputMode numeric and a regex pattern when the type is number", () => {
    const schema = { title: "Number", type: "number" } as JSONSchema7;

    render(<BaseInputTemplate {...getProps("number", schema)} />);

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
    expect(screen.getByRole("textbox")).toHaveAttribute("inputMode", "numeric");
  });

  it.each([
    [0, "0", "2", 2],
    [1, "1", "2", 12],
    [1.5, "1.5", "2", 1.52],
    [1, "1", ".05", 1.05],
    [-1, "-1", "2", -12],
    [1.045e25, "1.045e+25", "2", 1.045e252],
    [undefined, "", "2", 2],
    [1.045, "1.045", "e25", 1.045e25],
  ])(
    "when number %d is passed as the value, it is converted to string %s; when the onChange is called with string %s, it is converted to number %d",
    async (value, inputValue, typedValue, calledWith) => {
      const schema = { title: "Number", type: "number" } as JSONSchema7;
      const onChange = jest.fn();

      render(
        <BaseInputTemplate
          {...getProps("number", schema)}
          onChange={onChange}
          value={value!}
        />,
      );

      expect(screen.getByRole("textbox")).toHaveValue(inputValue);

      await userEvent.type(screen.getByRole("textbox"), typedValue);

      expect(screen.getByRole("textbox")).toHaveValue(inputValue + typedValue);
      expect(onChange).toHaveBeenCalledWith(calledWith);
    },
  );

  it("numeric input ignores keystrokes that are not valid numbers", async () => {
    const schema = { title: "Number", type: "number" } as JSONSchema7;
    const onChange = jest.fn();

    render(
      <BaseInputTemplate {...getProps("number", schema)} onChange={onChange} />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("");

    await userEvent.type(screen.getByRole("textbox"), "abc123");

    expect(screen.getByRole("textbox")).toHaveValue("123");
    expect(onChange).toHaveBeenCalledWith(123);
  });

  it("numeric input does not lose decimal when the value is changed", async () => {
    const schema = { title: "Number", type: "number" } as JSONSchema7;
    const onChange = jest.fn();

    render(
      <BaseInputTemplate
        {...getProps("number", schema)}
        onChange={onChange}
        value={1}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("1");

    await userEvent.type(screen.getByRole("textbox"), ".");
    await userEvent.type(screen.getByRole("textbox"), "0");
    await userEvent.type(screen.getByRole("textbox"), "5");

    expect(screen.getByRole("textbox")).toHaveValue("1.05");

    expect(onChange).toHaveBeenCalledWith(1.05);
  });

  it("numeric input can be cleared", async () => {
    const schema = { title: "Number", type: "number" } as JSONSchema7;
    const onChange = jest.fn();

    render(
      <BaseInputTemplate
        {...getProps("number", schema)}
        onChange={onChange}
        value={1}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("1");

    await userEvent.type(screen.getByRole("textbox"), "{backspace}");

    expect(screen.getByRole("textbox")).toHaveValue("");

    expect(onChange).toHaveBeenCalledWith(Number.NaN);
  });
});

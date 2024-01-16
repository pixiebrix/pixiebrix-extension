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
} from "@/components/formBuilder/BaseInputTemplate";
import { render, screen } from "@testing-library/react";
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
      // @ts-expect-error -- Required by type, not used by component
      registry: undefined,
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
      title: "Data URL",
      type: "string",
      format: "data-url",
    } as JSONSchema7;

    render(<BaseInputTemplate {...getProps("url", schema, "data-url")} />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "file");
  });

  it.skip("renders a standard text input with inputMode numeric and a regex pattern when the type is number", () => {
    const schema = { title: "Number", type: "number" } as JSONSchema7;

    render(<BaseInputTemplate {...getProps("number", schema)} />);

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});

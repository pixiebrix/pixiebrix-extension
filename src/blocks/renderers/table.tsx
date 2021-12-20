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

import { Renderer } from "@/types";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, BlockOptions, SafeHTML } from "@/core";
import { isNullOrBlank } from "@/utils";
import { BusinessError } from "@/errors";
import makeDataTable, { Row } from "@/blocks/renderers/dataTable";

// Type ColumnDefinition = {
//   label: string;
//   property: string;
//   href: string;
// };

export class TableRenderer extends Renderer {
  constructor() {
    super(
      "@pixiebrix/table",
      "A customizable table",
      "A customizable table that displays a list of values",
      "faTable"
    );
  }

  inputSchema = propertiesToSchema(
    {
      data: {
        // HACK: this should really just be "array", but by including string here the page editor will render a text
        // input for the user to pass in a variable
        type: ["array", "string"],
        description: "The values to show in the table",
        items: {
          type: "object",
          additionalProperties: true,
        },
      },
      columns: {
        type: "array",
        description: "Column labels and values to show",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            property: { type: "string" },
            href: { type: "string" },
          },
          required: ["label", "property"],
        },
        minItems: 1,
      },
    },
    ["columns"]
  );

  async render(
    { columns, data: userData }: BlockArg,
    { ctxt = [], logger }: BlockOptions
  ): Promise<SafeHTML> {
    const data = userData ?? ctxt;

    if (!userData) {
      logger.warn(
        "Using implicit data from the previous step is deprecated, use the data parameter"
      );
    }

    if (!Array.isArray(data)) {
      throw new BusinessError(
        `Expected data to be an array, actual: ${typeof data}`
      );
    }

    const makeLinkRenderer = (href: string) => (value: unknown, row: Row) => {
      // Currently for TableRenderer we only support directly accessing the href. This matches the behavior in
      // makeDataTable's renderValue

      const anchorHref = Object.prototype.hasOwnProperty.call(row, href)
        ? // eslint-disable-next-line security/detect-object-injection -- checked with hasOwnProperty
          row[href]
        : null;

      return typeof anchorHref === "string" && !isNullOrBlank(anchorHref)
        ? `<a href="${anchorHref}" target="_blank" rel="noopener noreferrer">${String(
            value
          )}</a>`
        : String(value);
    };

    const table = makeDataTable(
      columns.map(({ label, property, href }: any) => ({
        label,
        property,
        renderer: href ? makeLinkRenderer(href) : undefined,
      }))
    );

    return table(data);
  }
}

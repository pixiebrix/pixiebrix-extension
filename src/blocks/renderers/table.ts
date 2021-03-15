/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Renderer } from "@/types";
import makeDataTable, { Row } from "@/blocks/renderers/dataTable";
import { registerBlock } from "@/blocks/registry";
import Mustache from "mustache";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, BlockOptions } from "@/core";
import { isNullOrBlank } from "@/utils";

export class Table extends Renderer {
  constructor() {
    super(
      "@pixiebrix/table",
      "A customizable table",
      "A customizable table that displays a list of values",
      "faTable"
    );
  }

  inputSchema = propertiesToSchema({
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
  });

  async render(
    { columns, ...blockArgs }: BlockArg,
    { ctxt = [] }: BlockOptions
  ) {
    if (!Array.isArray(ctxt)) {
      throw new Error(`Expected data to be an array, actual: ${typeof ctxt}`);
    }

    const makeLinkRenderer = (href: string) => (value: any, row: Row) => {
      const anchorHref = Mustache.render(href, { ...row, "@block": blockArgs });
      return !isNullOrBlank(anchorHref)
        ? `<a href="${anchorHref}" target="_blank" rel="noopener noreferrer">${value}</a>`
        : `${value}`;
    };

    const table = makeDataTable(
      columns.map(({ label, property, href }: any) => ({
        label,
        property,
        renderer: href ? makeLinkRenderer(href) : undefined,
      }))
    );

    return table(ctxt);
  }
}

registerBlock(new Table());

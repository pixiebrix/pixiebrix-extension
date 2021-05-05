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

import React from "react";
import {Renderer} from "@/types";
import {registerBlock} from "@/blocks/registry";
import {propertiesToSchema} from "@/validators/generic";
import {BlockArg, BlockOptions} from "@/core";
import {isNullOrBlank} from "@/utils";
import {BusinessError} from "@/errors";
import {mapArgs} from "@/helpers";

type ColumnDefinition = {
  label: string;
  property: string;
  href: string;
};

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
      throw new BusinessError(
        `Expected data to be an array, actual: ${typeof ctxt}`
      );
    }

    const makeLinkTemplate = ({
      property,
      href,
    }: {
      property: string;
      href: string;
    }) => (rowData: Record<string, unknown>) => {
      const anchorHref = mapArgs(href, { ...rowData, "@block": blockArgs });
      return !isNullOrBlank(anchorHref) ? (
        <a href={anchorHref} target="_blank" rel="noopener noreferrer">
          {rowData[property]}
        </a>
      ) : (
        property?.toString()
      );
    };

    const DataTable = (
      await import(
        /* webpackChunkName: "widgets" */
        "./DataTableComponent"
      )
    ).default;

    return {
      Component: DataTable,
      props: {
        rows: ctxt,
        columns: columns.map((column: ColumnDefinition) => ({
          header: column.label,
          field: column.property,
          body: column.href ? makeLinkTemplate(column) : undefined,
        })),
      },
    } as any;
  }
}

registerBlock(new Table());

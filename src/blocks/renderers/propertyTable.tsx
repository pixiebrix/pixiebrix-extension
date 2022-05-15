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
import { Renderer } from "@/types";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, BlockOptions, SafeHTML } from "@/core";
import { sortBy, isPlainObject } from "lodash";

interface Item {
  key: string;
  data: {
    name: string | null;
    value: unknown;
  };
  children: Item[];
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function richValue(value: unknown): unknown {
  if (typeof value === "string" && isValidUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noopener, noreferrer">
        {value}
      </a>
    );
  }

  return value;
}

function shapeData(inputs: unknown, keyPrefix = "root"): Item[] {
  if (isPlainObject(inputs)) {
    return sortBy(
      Object.entries(inputs).map(([name, value]) => ({ name, value })),
      (x) => x.name
    ).map(({ name, value }) => {
      const key = `${keyPrefix}-${name}`;
      if (Array.isArray(value) || isPlainObject(value)) {
        return {
          key,
          data: { name, value: null },
          children: shapeData(value, key),
        };
      }

      return {
        key,
        data: { name, value: richValue(value) },
        children: [],
      };
    });
  }

  if (Array.isArray(inputs)) {
    return inputs.map((value, index) => {
      const key = `${keyPrefix}-${index}`;

      if (Array.isArray(value) || isPlainObject(value)) {
        return {
          key,
          data: { name: `${index}`, value: null },
          children: shapeData(value, key),
        };
      }

      return {
        key,
        data: { name: `${index}`, value: richValue(value) },
        children: [],
      };
    });
  }

  return [
    {
      key: keyPrefix,
      data: { name: null, value: inputs as any },
      children: [],
    },
  ];
}

export class PropertyTableRenderer extends Renderer {
  constructor() {
    super(
      "@pixiebrix/property-table",
      "Property Table",
      "Shows all properties and their values"
    );
  }

  inputSchema = propertiesToSchema(
    {
      data: {
        description:
          "The data to show in the table, or null/blank to show the implicit data",
      },
    },
    []
  );

  async render({ data }: BlockArg, { ctxt }: BlockOptions): Promise<SafeHTML> {
    const PropertyTree = await import(
      /* webpackChunkName: "widgets" */
      "./PropertyTree"
    );

    return {
      Component: PropertyTree.default,
      props: {
        value: shapeData(data ?? ctxt),
      },
    } as any;
  }
}

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
import { Renderer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, BlockOptions, RenderedHTML } from "@/core";
import isPlainObject from "lodash/isPlainObject";
import sortBy from "lodash/sortBy";

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
  } catch (err) {
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
  } else {
    return value;
  }
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
      } else {
        return {
          key,
          data: { name, value: richValue(value) },
          children: [],
        };
      }
    });
  } else if (Array.isArray(inputs)) {
    return inputs.map((value, index) => {
      const key = `${keyPrefix}-${index}`;

      if (Array.isArray(value) || isPlainObject(value)) {
        return {
          key,
          data: { name: `${index}`, value: null },
          children: shapeData(value, key),
        };
      } else {
        return {
          key,
          data: { name: `${index}`, value: richValue(value) },
          children: [],
        };
      }
    });
  } else {
    return [
      {
        key: keyPrefix,
        data: { name: null, value: inputs as any },
        children: [],
      },
    ];
  }
}

export class PropertyTableRenderer extends Renderer {
  constructor() {
    super(
      "@pixiebrix/property-table",
      "Property Table",
      "Shows all properties and their values"
    );
  }

  inputSchema = propertiesToSchema({});

  async render(
    inputs: BlockArg,
    { ctxt }: BlockOptions
  ): Promise<RenderedHTML> {
    const PropertyTree = (
      await import(
        /* webpackChunkName: "widgets" */
        "./PropertyTree"
      )
    ).default;

    return {
      Component: PropertyTree,
      props: {
        value: shapeData(ctxt),
      },
    } as any;
  }
}

registerBlock(new PropertyTableRenderer());

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

import { parseAssemblyQualifiedName } from "csharp-helpers";
import { BusinessError } from "@/errors";
import { Schema, SchemaProperties } from "@/core";
import { Argument, Release } from "@/contrib/uipath/uipathContract";

function toType(type: string) {
  const { namespace, typeName } = parseAssemblyQualifiedName(type);
  // https://docs.microsoft.com/en-us/dotnet/api/system.valuetype?view=net-5.0
  if (namespace === "System" && typeName === "String") {
    return "string";
  }

  if (namespace === "System" && typeName === "Boolean") {
    return "boolean";
  }

  if (
    namespace === "System" &&
    ["Int64", "Int32", "Int16", "UInt64", "UInt32", "UInt16"].includes(typeName)
  ) {
    return "integer";
  }

  if (namespace === "System" && ["Decimal", "Double"].includes(typeName)) {
    return "number";
  }

  throw new BusinessError(`Unsupported input type: ${type}`);
}

export function releaseSchema(release: Release): Schema {
  if (!release.Arguments.Input) {
    return {};
  }

  const inputs = JSON.parse(release.Arguments.Input) as Argument[];

  const properties = Object.fromEntries(
    inputs.map((input) => [input.name, { type: toType(input.type) }])
  ) as SchemaProperties;

  return {
    properties,
    required: inputs.filter((input) => input.required).map((x) => x.name),
  };
}

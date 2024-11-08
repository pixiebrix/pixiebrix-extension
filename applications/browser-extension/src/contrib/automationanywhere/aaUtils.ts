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

import { type Schema } from "../../types/schemaTypes";
import {
  type Execution,
  type Interface,
  type OutputValue,
  type TableValue,
  type Variable,
} from "./contract";
import { type JSONSchema7Type } from "json-schema";
import { mapValues, zipWith } from "lodash";
import { type Primitive } from "type-fest";
import { BusinessError } from "../../errors/businessErrors";
import { boolean } from "../../utils/typeUtils";
import { type Nullishable } from "../../utils/nullishUtils";

const COMMUNITY_CONTROL_ROOM_REGEX =
  /^(https:\/\/)?community\d*\.\S+\.automationanywhere\.digital\/?$/;

/**
 * Returns true if the argument corresponds to an Automation Anywhere Community Edition Control Room.
 *
 * Returns false for malformed URLs, instead of throwing an error.
 *
 */
export function isCommunityControlRoom(
  hostnameOrUrl: Nullishable<string>,
): boolean {
  return COMMUNITY_CONTROL_ROOM_REGEX.test(hostnameOrUrl ?? "");
}

export function hostnameToUrl(hostname: Nullishable<string>): string {
  if (hostname == null) {
    // Give hint to user to include https: scheme
    return "https://";
  }

  if (/^[\da-z]+:\/\//.test(hostname)) {
    return hostname;
  }

  return `https://${hostname}`;
}

function selectDefaultValue(variable: Variable): JSONSchema7Type | undefined {
  if (!variable.defaultValue) {
    return undefined;
  }

  switch (variable.type) {
    case "STRING": {
      return variable.defaultValue.string;
    }

    case "BOOLEAN": {
      return boolean(variable.defaultValue.boolean);
    }

    case "NUMBER": {
      return Number(variable.defaultValue.number);
    }

    default: {
      return undefined;
    }
  }
}

type MappedType = "string" | "boolean" | "number";

function mapType(variable: Variable): {
  type?: MappedType;
} {
  switch (variable.type) {
    case "NUMBER":
    case "BOOLEAN":
    case "STRING": {
      return { type: variable.type.toLowerCase() as MappedType };
    }

    default: {
      return {};
    }
  }
}

/**
 * Convert an AAI bot input interface to JSON Schema.
 */
export function interfaceToInputSchema(botInterface: Interface): Schema {
  const inputs = botInterface.variables.filter((variable) => variable.input);

  return {
    type: "object",
    properties: Object.fromEntries(
      inputs.map((variable) => {
        const definition: Schema = {
          ...mapType(variable),
          description: variable.description,
        };

        const defaultValue = selectDefaultValue(variable);
        if (defaultValue != null) {
          definition.default = defaultValue;
        }

        return [variable.name, definition];
      }),
    ),
    required: inputs.map((variable) => variable.name),
  };
}

export function mapBotInput(data: UnknownObject) {
  return mapValues(data, (value) => {
    switch (typeof value) {
      case "string": {
        return { type: "STRING", string: value };
      }

      case "number": {
        return { type: "NUMBER", number: String(value) };
      }

      case "boolean": {
        return { type: "BOOLEAN", boolean: String(value) };
      }

      default: {
        throw new BusinessError(`Type not supported: ${typeof value}`);
      }
    }
  });
}

type BotOutput = Primitive | UnknownObject | UnknownObject[];

function mapBotTableValue(tableValue: TableValue): UnknownObject[] {
  const { schema, rows } = tableValue;
  return rows.map((row) => {
    const newEntries: Array<[string, BotOutput]> = zipWith(
      schema,
      row.values,
      (columnSchema, rowValue) => [columnSchema.name, mapBotOutput(rowValue)],
    );
    return Object.fromEntries(newEntries);
  });
}

function mapBotOutput(value: OutputValue): BotOutput {
  switch (value.type) {
    case "STRING": {
      return value.string;
    }

    case "NUMBER": {
      return Number(value.number);
    }

    case "BOOLEAN": {
      return boolean(value.boolean);
    }

    case "DICTIONARY": {
      return Object.fromEntries(
        value.dictionary.map(({ key, value }) => [key, mapBotOutput(value)]),
      );
    }

    case "TABLE": {
      if (value.table == null) {
        // This should never happen, but be defensive just in case,
        // since it's an api payload
        return [];
      }

      return mapBotTableValue(value.table);
    }

    default: {
      const exhaustiveCheck: never = value.type;
      throw new BusinessError(
        `Type not supported by PixieBrix: ${exhaustiveCheck}`,
      );
    }
  }
}

export function selectBotOutput(
  execution: Pick<Execution, "botOutVariables">,
): Record<string, BotOutput> {
  return mapValues(execution.botOutVariables?.values ?? {}, (value) =>
    mapBotOutput(value),
  );
}

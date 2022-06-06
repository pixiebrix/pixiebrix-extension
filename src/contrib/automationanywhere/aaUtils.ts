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

import { boolean } from "@/utils";
import { Schema } from "@/core";
import {
  Activity,
  Interface,
  OutputValue,
  Variable,
} from "@/contrib/automationanywhere/contract";
import { JSONSchema7Type } from "json-schema";
import { UnknownObject } from "@/types";
import { mapValues } from "lodash";
import { Primitive } from "type-fest";
import { BusinessError } from "@/errors/businessErrors";

const COMMUNITY_HOSTNAME_REGEX =
  /^community\d+\..*\.automationanywhere\.digital$/;

/**
 * Return true if the control room URL corresponds to the AA community cloud.
 */
export function isCommunityControlRoom(url: string): boolean {
  const parsed = new URL(url);
  return COMMUNITY_HOSTNAME_REGEX.test(parsed.hostname);
}

function selectDefaultValue(variable: Variable): JSONSchema7Type {
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
      })
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

export function mapBotOutput(value: OutputValue): Primitive {
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

    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
      throw new BusinessError(`Type not supported by PixieBrix: ${value.type}`);
    }
  }
}

export function selectBotOutput(activity: Activity): Record<string, Primitive> {
  return mapValues(activity.botOutVariables?.values ?? {}, (value) =>
    mapBotOutput(value)
  );
}

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

import { Reader } from "@/types";
import { Schema } from "@/core";

class TimestampReader extends Reader {
  defaultOutputKey = "instant";

  constructor() {
    super(
      "@pixiebrix/timestamp",
      "Generate a timestamp",
      "Get the current date-time in ISO format"
    );
  }

  async read() {
    return {
      timestamp: new Date().toISOString(),
    };
  }

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      timestamp: {
        type: "string",
        description: "Current ISO date-time",
        format: "date-time",
      },
    },
  };

  async isAvailable() {
    return true;
  }
}

export default TimestampReader;

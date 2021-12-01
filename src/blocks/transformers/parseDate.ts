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

import { Transformer } from "@/types";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { parseDate } from "chrono-node";

function getLocalISOString(date: Date): string {
  const offsetInMinutes = date.getTimezoneOffset();
  let offsetMillis = offsetInMinutes * 60 * 1000;
  const offsetSign = offsetMillis > 0 ? "-" : "+";
  offsetMillis = Math.abs(offsetMillis);
  const offsetHours = String(Math.trunc(offsetInMinutes / 60)).padStart(2, "0");
  const offsetMinutes = String(offsetInMinutes % 60).padStart(2, "0");
  const shiftedMillis = date.getTime() - offsetMillis;
  const shiftedDate = new Date(shiftedMillis);
  const isoString = shiftedDate.toISOString();
  const isoTrimmed = isoString.slice(0, -1);
  return `${isoTrimmed}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

export class ParseDate extends Transformer {
  async isPure(): Promise<boolean> {
    return true;
  }

  defaultOutputKey = "parsedDate";

  constructor() {
    super(
      "@pixiebrix/parse-date",
      "Parse date",
      "Parse a date string and return multiple formats",
      "faCalendarDay"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      date: {
        type: "string",
        title: "Date",
        description: "A date string value in any format",
      },
    },
    ["date"]
  );

  outputSchema: Schema = {
    type: "object",
    properties: {
      utc: {
        type: "object",
        properties: {
          iso8601: {
            type: "string",
            format: "date-time",
          },
          date: {
            type: "string",
            format: "date",
          },
          time: {
            type: "string",
            format: "time",
          },
          humanReadable: {
            type: "string",
          },
        },
      },
      local: {
        type: "object",
        properties: {
          iso8601: {
            type: "string",
            format: "date-time",
          },
          date: {
            type: "string",
            format: "date",
          },
          time: {
            type: "string",
            format: "time",
          },
          humanReadable: {
            type: "string",
          },
        },
      },
    },
  };

  async transform({ date }: BlockArg): Promise<unknown> {
    const parsed = parseDate(date);

    return {
      utc: {
        iso8601: parsed.toISOString(),
        date: parsed.toDateString(),
        time: parsed.toTimeString(),
        humanReadable: parsed.toUTCString(),
      },
      local: {
        iso8601: getLocalISOString(parsed),
        date: parsed.toLocaleDateString(),
        time: parsed.toLocaleTimeString(),
        humanReadable: parsed.toLocaleString(),
      },
    };
  }
}

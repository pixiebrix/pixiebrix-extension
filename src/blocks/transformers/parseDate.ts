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

import { Transformer } from "@/types";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { BusinessError } from "@/errors";
import { isEmpty } from "lodash";

export function getLocalISOString(date: Date): string {
  let offsetInMinutes = date.getTimezoneOffset();
  const offsetMillis = offsetInMinutes * 60 * 1000;
  const shiftedDate = new Date(date.getTime() - offsetMillis);
  const isoString = shiftedDate.toISOString();

  if (offsetInMinutes === 0) {
    return isoString;
  }

  const offsetSign = offsetInMinutes > 0 ? "-" : "+";
  offsetInMinutes = Math.abs(offsetInMinutes);
  const offsetHours = String(Math.trunc(offsetInMinutes / 60)).padStart(2, "0");
  const offsetMinutes = String(offsetInMinutes % 60).padStart(2, "0");
  // Remove the 'Z' on the end
  const isoTrimmed = isoString.slice(0, -1);
  return `${isoTrimmed}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

export class ParseDate extends Transformer {
  override async isPure(): Promise<boolean> {
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
        description: "A textual date in any format",
      },
    },
    ["date"]
  );

  override outputSchema: Schema = {
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

  async transform({ date }: BlockArg<{ date: string }>): Promise<unknown> {
    const { parseDate } = await import(
      /* webpackChunkName: "chrono-node" */ "chrono-node"
    );

    const parsed = parseDate(date);

    if (isEmpty(date.trim())) {
      throw new BusinessError("Date/time text is empty");
    }

    if (parsed == null) {
      throw new BusinessError("Unrecognized date/time");
    }

    const millisPerMinute = 60 * 1000;
    const offsetInMinutes = parsed.getTimezoneOffset();
    const utc = new Date(parsed.getTime() + offsetInMinutes * millisPerMinute);

    return {
      utc: {
        iso8601: parsed.toISOString(),
        date: utc.toLocaleDateString(),
        time: utc.toLocaleTimeString(),
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

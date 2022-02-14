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

import { getLocalISOString, ParseDate } from "@/blocks/transformers/parseDate";
import { register, TimeZone, unregister } from "timezone-mock";
import { BlockArg } from "@/core";

const refDate = "2021-12-07T06:17:09.258Z";

const cases = [
  ["US/Pacific", "2021-12-06T22:17:09.258-08:00"],
  ["US/Eastern", "2021-12-07T01:17:09.258-05:00"],
  ["Brazil/East", "2021-12-07T04:17:09.258-02:00"],
  ["UTC", "2021-12-07T06:17:09.258Z"],
  ["Europe/London", "2021-12-07T06:17:09.258Z"],
  ["Australia/Adelaide", "2021-12-07T16:47:09.258+10:30"],
];

describe("ParseDate block", () => {
  afterEach(() => {
    unregister();
  });

  test.each(cases)(
    "getLocalIsoString() for %s",
    (timezone: TimeZone, expected: string) => {
      register(timezone);
      const input = new Date(refDate);
      const result = getLocalISOString(input);
      expect(result).toStrictEqual(expected);
      unregister();
    }
  );

  test("Results snapshot - EST input", async () => {
    register("US/Eastern");
    const brick = new ParseDate();
    const arg = {
      date: "Thursday, December 9th 2021, 10pm, EST",
    } as unknown as BlockArg<Record<string, string>>;
    await brick
      .run(arg, {
        ctxt: null,
        logger: null,
        root: null,
      })
      .then((result) => {
        expect(result).toEqual({
          utc: {
            iso8601: "2021-12-10T03:00:00.000Z",
            date: "12/10/2021",
            time: "3:00:00 AM",
            humanReadable: "Fri, 10 Dec 2021 03:00:00 GMT",
          },
          local: {
            iso8601: "2021-12-09T22:00:00.000-05:00",
            date: "12/9/2021",
            time: "10:00:00 PM",
            humanReadable: "2021-12-10T03:00:00.000Z UTC (MockDate: GMT-0500)",
          },
        });
      });
  });

  test("Results snapshot - GMT input", async () => {
    register("US/Eastern");
    const brick = new ParseDate();
    const arg = {
      date: "Thursday, December 9th 2021, 3am, GMT",
    } as unknown as BlockArg<Record<string, string>>;
    await brick
      .run(arg, {
        ctxt: null,
        logger: null,
        root: null,
      })
      .then((result) => {
        expect(result).toEqual({
          utc: {
            iso8601: "2021-12-09T03:00:00.000Z",
            date: "12/9/2021",
            time: "3:00:00 AM",
            humanReadable: "Thu, 09 Dec 2021 03:00:00 GMT",
          },
          local: {
            iso8601: "2021-12-08T22:00:00.000-05:00",
            date: "12/8/2021",
            time: "10:00:00 PM",
            humanReadable: "2021-12-09T03:00:00.000Z UTC (MockDate: GMT-0500)",
          },
        });
      });
  });
});

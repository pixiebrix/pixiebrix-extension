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

import { getLocalISOString, ParseDate } from "./parseDate";
import { register, type TimeZone, unregister } from "timezone-mock";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { validateBrickInputOutput } from "../../validators/schemaValidator";
import { BusinessError } from "@/errors/businessErrors";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

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
    },
  );

  test("Results snapshot - EST input", async () => {
    register("US/Eastern");
    const brick = new ParseDate();

    const arg = unsafeAssumeValidArg({
      date: "Thursday, December 9th 2021, 10pm, EST",
    });

    const result = await brick.run(arg, brickOptionsFactory());

    expect(result).toMatchSnapshot();

    const validation = await validateBrickInputOutput(
      brick.outputSchema,
      result,
    );
    expect(validation.valid).toBeTruthy();
  });

  test("Throw BusinessError on whitespace", async () => {
    const brick = new ParseDate();

    await expect(async () => {
      await brick.run(
        unsafeAssumeValidArg({ date: "   " }),
        brickOptionsFactory(),
      );
    }).rejects.toThrow(BusinessError);
  });

  test("Throw BusinessError on invalid date", async () => {
    const brick = new ParseDate();

    await expect(async () => {
      await brick.run(
        unsafeAssumeValidArg({ date: "foo" }),
        brickOptionsFactory(),
      );
    }).rejects.toThrow(BusinessError);
  });

  test("Results snapshot - GMT input", async () => {
    register("US/Eastern");
    const brick = new ParseDate();
    const arg = unsafeAssumeValidArg({
      date: "Thursday, December 9th 2021, 3am, GMT",
    });

    const result = await brick.run(arg, brickOptionsFactory());

    expect(result).toMatchSnapshot();

    const validation = await validateBrickInputOutput(
      brick.outputSchema,
      result,
    );
    expect(validation.valid).toBeTruthy();
  });
});

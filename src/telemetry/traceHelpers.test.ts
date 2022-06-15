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

import { traceRecordFactory } from "@/testUtils/factories";
import { getLatestCall, hasBranchPrefix } from "@/telemetry/traceHelpers";

describe("getLatestCall", () => {
  it("sorts by single branch", () => {
    const latest = traceRecordFactory({
      branches: [{ key: "foo", counter: 2 }],
    });

    const traces = [
      traceRecordFactory({ branches: [{ key: "foo", counter: 0 }] }),
      latest,
      traceRecordFactory({ branches: [{ key: "foo", counter: 1 }] }),
    ];

    expect(getLatestCall(traces)).toStrictEqual(latest);
  });

  it("sorts by second branch", () => {
    const latest = traceRecordFactory({
      branches: [
        { key: "foo", counter: 0 },
        { key: "bar", counter: 2 },
      ],
    });

    const traces = [
      traceRecordFactory({
        branches: [
          { key: "foo", counter: 0 },
          { key: "bar", counter: 0 },
        ],
      }),
      latest,
      traceRecordFactory({
        branches: [
          { key: "foo", counter: 0 },
          { key: "bar", counter: 1 },
        ],
      }),
    ];

    expect(getLatestCall(traces)).toStrictEqual(latest);
  });

  it("sorts by first branch", () => {
    const latest = traceRecordFactory({
      branches: [
        { key: "foo", counter: 1 },
        { key: "bar", counter: 0 },
      ],
    });

    const traces = [
      traceRecordFactory({
        branches: [
          { key: "foo", counter: 0 },
          { key: "bar", counter: 1 },
        ],
      }),
      latest,
      traceRecordFactory({
        branches: [
          { key: "foo", counter: 0 },
          { key: "bar", counter: 2 },
        ],
      }),
    ];

    expect(getLatestCall(traces)).toStrictEqual(latest);
  });
});

describe("hasBranchPrefix", () => {
  it("empty prefix", () => {
    const record = traceRecordFactory({
      branches: [{ key: "foo", counter: 0 }],
    });
    expect(hasBranchPrefix([], record)).toBeTrue();
  });

  it("matches", () => {
    const prefix = { key: "foo", counter: 0 };
    const record = traceRecordFactory({
      branches: [prefix, { key: "bar", counter: 0 }],
    });
    expect(hasBranchPrefix([prefix], record)).toBeTrue();
  });

  it("rejects", () => {
    const prefix = { key: "foo", counter: 0 };
    const record = traceRecordFactory({
      branches: [{ ...prefix, counter: 1 }],
    });
    expect(hasBranchPrefix([prefix], record)).toBeFalse();
  });
});

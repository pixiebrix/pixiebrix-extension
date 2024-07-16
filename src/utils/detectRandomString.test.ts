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

import { guessUsefulness, selectorTypes } from "./detectRandomString";

describe("guessUsefulness", () => {
  it("handles good class name", () => {
    expect(guessUsefulness(".Nav-item")).toMatchInlineSnapshot(`
      {
        "detectorFactor": 0.13,
        "isRandom": false,
        "isSuspicious": false,
        "lettersFactor": 0.22,
        "string": ".Nav-item",
      }
    `);
    expect(guessUsefulness(".footerlink")).toMatchInlineSnapshot(`
      {
        "detectorFactor": 0.3,
        "isRandom": false,
        "isSuspicious": false,
        "lettersFactor": 0.09,
        "string": ".footerlink",
      }
    `);
  });
  it("handles css module name", () => {
    expect(guessUsefulness(".ePGuZuxBTv9BWrjZL4l3")).toMatchInlineSnapshot(`
      {
        "detectorFactor": 0.55,
        "isRandom": true,
        "isSuspicious": true,
        "lettersFactor": 0.19,
        "string": ".ePGuZuxBTv9BWrjZL4l3",
      }
    `);
    expect(guessUsefulness("._s2dF")).toMatchInlineSnapshot(`
      {
        "detectorFactor": 0.2,
        "isRandom": true,
        "isSuspicious": true,
        "lettersFactor": 0.5,
        "string": "._s2dF",
      }
    `);

    // XXX: .Nav-wd32 should likely be flagged as suspicious
    expect(guessUsefulness(".Nav-wd32")).toMatchInlineSnapshot(`
      {
        "detectorFactor": 0.38,
        "isRandom": false,
        "isSuspicious": false,
        "lettersFactor": 0.44,
        "string": ".Nav-wd32",
      }
    `);
  });
  it("handles tag name", () => {
    expect(guessUsefulness("h1")).toMatchInlineSnapshot(`
      {
        "detectorFactor": 0,
        "isRandom": false,
        "isSuspicious": false,
        "lettersFactor": 0.5,
        "string": "h1",
      }
    `);
  });

  it("handles utility class name", () => {
    // XXX: .mt-3 should ideally be flagged a suspicious, not random
    expect(guessUsefulness(".mt-3")).toMatchInlineSnapshot(`
      {
        "detectorFactor": 0.25,
        "isRandom": true,
        "isSuspicious": false,
        "lettersFactor": 0.6,
        "string": ".mt-3",
      }
    `);

    // XXX: h1.mt-3 should ideally be flagged a suspicious, not random
    expect(guessUsefulness("h1.mt-3")).toMatchInlineSnapshot(`
      {
        "detectorFactor": 0.17,
        "isRandom": true,
        "isSuspicious": false,
        "lettersFactor": 0.57,
        "string": "h1.mt-3",
      }
    `);
  });
});

describe("selectorTypes", () => {
  it("detects simple selector", () => {
    expect(selectorTypes(".nav")).toStrictEqual(["CLASS"]);
    expect(selectorTypes("nav")).toStrictEqual(["TAG"]);
  });

  it("detects combo selector", () => {
    expect(selectorTypes("nav.nav")).toStrictEqual(["TAG", "CLASS"]);
  });

  it("returns empty array for invalid selector", () => {
    expect(selectorTypes("! nav")).toStrictEqual([]);
  });
});

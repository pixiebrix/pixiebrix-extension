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

import { guessUsefulness } from "./detectRandomString";

test("guessUsefulness", () => {
  expect(guessUsefulness(".Nav-item")).toMatchInlineSnapshot(`
    Object {
      "detectorFactor": 0.13,
      "isRandom": false,
      "isSuspicious": false,
      "lettersFactor": 0.22,
      "string": ".Nav-item",
    }
  `);
  expect(guessUsefulness(".ePGuZuxBTv9BWrjZL4l3")).toMatchInlineSnapshot(`
    Object {
      "detectorFactor": 0.55,
      "isRandom": true,
      "isSuspicious": true,
      "lettersFactor": 0.19,
      "string": ".ePGuZuxBTv9BWrjZL4l3",
    }
  `);
  expect(guessUsefulness("._s2dF")).toMatchInlineSnapshot(`
    Object {
      "detectorFactor": 0.2,
      "isRandom": true,
      "isSuspicious": true,
      "lettersFactor": 0.5,
      "string": "._s2dF",
    }
  `);
  expect(guessUsefulness(".Nav-wd32")).toMatchInlineSnapshot(`
    Object {
      "detectorFactor": 0.38,
      "isRandom": false,
      "isSuspicious": false,
      "lettersFactor": 0.44,
      "string": ".Nav-wd32",
    }
  `);
  expect(guessUsefulness(".footerlink")).toMatchInlineSnapshot(`
    Object {
      "detectorFactor": 0.3,
      "isRandom": false,
      "isSuspicious": false,
      "lettersFactor": 0.09,
      "string": ".footerlink",
    }
  `);
});

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

import detectRandomString from "../vendors/randomStringDetection/detector";
import { isEqual, round, uniq } from "lodash";

// Checks, in order:
// - has numbers surrounded by letters: r4Nd0m
// - starts or ends with dash: _cls, -cls, cls_, cls-
const suspiciousRegex = /[a-z]\d+[a-z]|^\.?[_-]|[_-]$/i;

// Excludes numbers and symbols
const nonLetters = /[^a-z]/gi;

/** @internal */
export function selectorTypes(selector: string): string[] {
  try {
    const tokens = $.find.tokenize(selector);
    return uniq(tokens.flatMap((xs) => xs.map((x) => x.type)));
  } catch {
    return [];
  }
}

export function guessUsefulness(selector: string) {
  const detectorFactor = round(Number(detectRandomString(selector)), 2);

  // Useful to catch short sequences like `.d_b-3` that wouldn't otherwise be detected
  // by the other factors, without sacrificing short human classes like `.nav`
  const meaningfulCharacters = selector.replaceAll(nonLetters, "").length;
  const lettersFactor = round(1 - meaningfulCharacters / selector.length, 2);

  const isSuspicious = suspiciousRegex.test(selector);

  const isRandom =
    (isSuspicious || lettersFactor >= 0.5 || detectorFactor >= 0.5) &&
    !isEqual(selectorTypes(selector), ["TAG"]);
  return {
    string: selector,
    detectorFactor,
    isSuspicious,
    lettersFactor,
    isRandom,
  };
}

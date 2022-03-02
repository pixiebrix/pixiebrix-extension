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

import detectRandomString from "@/vendors/randomStringDetection/detector";
import { round } from "lodash";

// Checks, in order:
// - has numbers surrounded by letters: r4Nd0m
// - starts or ends with dash: _cls, -cls, cls_, cls-
const suspiciousRegex = /[a-z]\d+[a-z]|^\.?[_-]|[_-]$/i;

// Excludes numbers and symbols
const nonLetters = /[^a-z]/gi;

export function guessUsefulness(string: string) {
  const detectorFactor = round(Number(detectRandomString(string)), 2);

  const meaningfulCharacters = string.replaceAll(nonLetters, "").length;
  const lettersFactor = round(1 - meaningfulCharacters / string.length, 2);

  const isSus = suspiciousRegex.test(string);

  const isRandom = isSus || lettersFactor >= 0.5 || detectorFactor >= 0.5;
  return { string, detectorFactor, isSus, lettersFactor, isRandom };
}

export function isRandomString(string: string): boolean {
  return guessUsefulness(string).isRandom;
}

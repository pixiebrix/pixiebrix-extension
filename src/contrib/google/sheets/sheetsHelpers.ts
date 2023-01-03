/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

export function normalizeHeader(header: string): string {
  return header.toLowerCase().trim();
}

export function isAuthError(error: { code: number }): boolean {
  return [404, 401, 403].includes(error.code);
}

export function columnToLetter(column: number): string {
  // https://stackoverflow.com/a/21231012/402560
  let temporary;
  let letter = "";
  while (column > 0) {
    temporary = (column - 1) % 26;
    letter = String.fromCodePoint(temporary + 65) + letter;
    column = (column - temporary - 1) / 26;
  }

  return letter;
}

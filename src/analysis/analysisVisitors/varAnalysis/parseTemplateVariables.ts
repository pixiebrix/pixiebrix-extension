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

// As of now the regex looks for variables with @ prefix only.
// A complimentary check for the use of the @ sign in a text template can be done separately:
// if there's no @ found in a text field show info message "Looks like you haven't used any var."
const varRegex =
  /{({|%)[^@]*(?<varName>@\w+(\.|\w|(\[\d+])|(\[("|')[\s\w]+("|')]))*)[\s|]?[^%}]*(}|%)}/g;

export function parseTemplateVariables(template: string): string[] {
  const vars = [];
  let match = varRegex.exec(template);
  while (match !== null) {
    const { varName } = match.groups;
    if (varName) {
      vars.push(varName.trim());
    }

    match = varRegex.exec(template);
  }

  return vars;
}

export function getVariableAtPosition(
  template: string,
  position: number
): string | null {
  let match = varRegex.exec(template);
  while (match !== null) {
    const varName = match.groups.varName.trim();

    // Can't use match.index because it's the index of the whole match, not the variable name
    const startIndex = template.indexOf(varName);
    if (startIndex <= position && position <= startIndex + varName.length) {
      varRegex.lastIndex = 0;
      return varName;
    }

    match = varRegex.exec(template);
  }

  return null;
}

export default parseTemplateVariables;

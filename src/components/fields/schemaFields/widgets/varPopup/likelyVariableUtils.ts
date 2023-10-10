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

const varRegex = /(?<varName>@(\.|\w|(\[\d+])|(\[("|')[\s\w]+("|')]))*)/g;

type LikelyVariable = {
  name: string | null;
  startIndex: number;
  endIndex: number;
};

/**
 * Returns the variable expression at the position in the path. Excludes characters after the cursor to allow the user
 * to use the cursor to navigate the variable popover/refine the search.
 * @param path the variable path.
 * @param position the cursor position in the variable entry text control
 */
export function getVariableAtPosition(path: string, position: number): string {
  return path.slice(0, position);
}

/**
 * Returns the likely variable path at the given cursor position in the template
 * @param template the text template
 * @param position the cursor position in the template
 * @param clampCursor if true, the endIndex/name will be clamped to the cursor position
 * @param includeBoundary if true, match a variable if the cursor is at the variable boundary
 */
export function getLikelyVariableAtPosition(
  template: string,
  position: number,
  {
    clampPosition = false,
    includeBoundary = false,
  }: { clampPosition?: boolean; includeBoundary?: boolean } = {}
): LikelyVariable {
  // Cursor is at whitespace, detect if the cursor is at the end of the variable
  const matchPosition =
    includeBoundary && [" ", undefined].includes(template.at(position))
      ? position - 1
      : position;

  // This method is based on regex because we want to show popup even for incomplete template, ex. "{{ @foo."
  let match = varRegex.exec(template);
  while (match !== null) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- Guaranteed by regex
    const varName = match.groups!.varName!;
    const startIndex = match.index;
    const variableEndIndex = startIndex + varName.length;
    if (startIndex <= matchPosition && matchPosition <= variableEndIndex) {
      varRegex.lastIndex = 0;

      if (clampPosition) {
        if (startIndex === matchPosition) {
          return {
            name: varName.slice(0, 1),
            startIndex,
            endIndex: startIndex + 1,
          };
        }

        const trimAmount = variableEndIndex - position;
        return {
          name: varName.slice(0, varName.length - trimAmount),
          startIndex,
          endIndex: Math.min(variableEndIndex, position),
        };
      }

      return {
        name: varName,
        startIndex,
        endIndex: variableEndIndex,
      };
    }

    match = varRegex.exec(template);
  }

  return {
    name: null,
    startIndex: -1,
    endIndex: -1,
  };
}

function getOpeningBracesLeftOfIndex(
  template: string,
  index: number
): "{{" | "{%" | null {
  const templatePartLeft = template.slice(0, index);
  let openingBraces = null;
  for (let i = templatePartLeft.length - 1; i > 0; i--) {
    // eslint-disable-next-line security/detect-object-injection -- number is coming from loop index
    const char = templatePartLeft[i];
    const charLeftOfChar = templatePartLeft[i - 1];
    if (char === "}" && (charLeftOfChar === "}" || charLeftOfChar === "%")) {
      break;
    }

    if ((char === "{" || char === "%") && charLeftOfChar === "{") {
      openingBraces = (charLeftOfChar + char) as "{{" | "{%";
      break;
    }
  }

  return openingBraces;
}

function getClosingBracesRightOfIndex(
  template: string,
  index: number
): "}}" | "%}" | null {
  const templatePartRight = template.slice(index);
  let closingBraces = null;
  for (let i = 0; i < templatePartRight.length - 1; i++) {
    // eslint-disable-next-line security/detect-object-injection -- number is coming from loop index
    const char = templatePartRight[i];
    const charRightOfChar = templatePartRight[i + 1];
    if (char === "{" && (charRightOfChar === "{" || charRightOfChar === "%")) {
      break;
    }

    if ((char === "}" || char === "%") && charRightOfChar === "}") {
      closingBraces = (char + charRightOfChar) as "}}" | "%}";
      break;
    }
  }

  return closingBraces;
}

export function replaceLikelyVariable(
  template: string,
  position: number,
  replacement: string
): {
  newTemplate: string;
  newCursorPosition: number;
} {
  let { startIndex, endIndex } = getLikelyVariableAtPosition(
    template,
    position
  );

  if (startIndex === -1 || endIndex === -1) {
    startIndex = position;
    endIndex = position;
  }

  const templatePartLeftOfLikelyVariable = template.slice(0, startIndex);
  const templatePartRightOfLikelyVariable = template.slice(endIndex);

  const openingBraces = getOpeningBracesLeftOfIndex(template, startIndex);
  const shouldInsertOpeningBraces = !openingBraces;
  const closingBlockToken: "%" | "}" = openingBraces?.endsWith("%") ? "%" : "}";

  const closingBraces = getClosingBracesRightOfIndex(template, endIndex);
  const shouldInsertClosingBraces = !closingBraces;
  const openingBlockToken: "%" | "{" = closingBraces?.startsWith("%")
    ? "%"
    : "{";

  const replacementWithBraces = `${
    shouldInsertOpeningBraces ? `{${openingBlockToken} ` : ""
  }${replacement}${shouldInsertClosingBraces ? ` ${closingBlockToken}}` : ""}`;

  const endOfVariableIndex =
    startIndex +
    replacementWithBraces.length -
    (shouldInsertClosingBraces ? 3 : 0);

  return {
    newTemplate: `${templatePartLeftOfLikelyVariable}${replacementWithBraces}${templatePartRightOfLikelyVariable}`,
    newCursorPosition: endOfVariableIndex,
  };
}

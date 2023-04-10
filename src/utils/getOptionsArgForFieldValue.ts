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

import { isEmpty } from "lodash";
import { isVarExpression } from "@/runtime/mapArgs";
import { type Expression, type OptionsArgs } from "@/types/runtimeTypes";

export function getOptionsArgForFieldValue(
  fieldValue: string | Expression,
  optionsArgs: OptionsArgs
): string | null {
  if (
    isEmpty(optionsArgs) ||
    !isVarExpression(fieldValue) ||
    !fieldValue.__value__.startsWith("@options.")
  ) {
    return null;
  }

  const optionKey = fieldValue.__value__.replace("@options.", "");
  if (isEmpty(optionKey)) {
    return null;
  }

  // Leaving the lint warning, this DOES come from user input
  const optionValue = optionsArgs[optionKey];
  if (typeof optionValue === "string") {
    return optionValue;
  }

  return null;
}

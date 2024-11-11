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

import { freeze } from "@/utils/objectUtils";
import { useMemo } from "react";

// Disabled placeholder option to indicate that a user can create an option
const CREATABLE_PLACEHOLDER = {
  value: "",
  label: "Start typing to filter or create new entry",
  isDisabled: true,
} as const;

const DEFAULT_OPTIONS = freeze([]);

/**
 * Adds a disabled placeholder options if creatable === true and the text-input is empty
 */
export default function useAddCreatablePlaceholder<OptionType>({
  creatable,
  options = DEFAULT_OPTIONS,
  textInputValue,
}: {
  creatable?: boolean;
  options?: readonly OptionType[];
  textInputValue: string;
}) {
  return useMemo(
    () =>
      creatable && textInputValue.length === 0
        ? [CREATABLE_PLACEHOLDER, ...options]
        : options,
    [creatable, options, textInputValue],
  );
}

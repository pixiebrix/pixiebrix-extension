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

import { ApiVersion } from "@/core";
import { useField } from "formik";
import { isApiVersionAtLeast } from "@/utils";
import { useContext } from "react";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";

function useApiVersionAtLeast(atLeast: ApiVersion): boolean {
  const [{ value: formValuesApiVersion }] = useField<ApiVersion>("apiVersion");
  const { apiVersion: contextApiVersion } = useContext(FieldRuntimeContext);
  // Prefer the version on the form
  const effectiveVersion = formValuesApiVersion ?? contextApiVersion;
  return isApiVersionAtLeast(effectiveVersion, atLeast);
}

export default useApiVersionAtLeast;

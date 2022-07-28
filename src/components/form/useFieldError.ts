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

import { useSelector } from "react-redux";
import { annotationsForPathSelector } from "@/pageEditor/slices/editorSelectors";
import { Annotation } from "@/analysis/analysisTypes";
import { RootState } from "@/pageEditor/pageEditorTypes";
import { useField } from "formik";

function maybeAnnotationsForPathSelector(
  state: RootState,
  path: string
): Annotation[] | undefined {
  if (state.editor == null) {
    return undefined;
  }

  return annotationsForPathSelector(state, path);
}

function maybeSelectAnnotationsForPath(path: string) {
  return (state: RootState) => maybeAnnotationsForPathSelector(state, path);
}

function useFieldError(fieldPath: string): string | undefined {
  const [, { error: formikError }] = useField(fieldPath);
  const annotations = useSelector(maybeSelectAnnotationsForPath(fieldPath));
  if (typeof annotations === "undefined") {
    return formikError;
  }

  return annotations.length > 0
    ? annotations.map(({ message }) => message).join(" ")
    : undefined;
}

export default useFieldError;

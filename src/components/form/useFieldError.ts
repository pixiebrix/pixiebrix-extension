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
import { selectAnnotationsForPath } from "@/pageEditor/slices/editorSelectors";
import { useField } from "formik";
import { useContext } from "react";
import { FormErrorContext } from "@/components/form/Form";

function useFormikFieldError(
  fieldPath: string,
  showUntouched?: boolean
): string | undefined {
  const [, { error, touched }] = useField(fieldPath);
  return showUntouched || touched ? error : null;
}

function useAnalysisFieldError(fieldPath: string): string[] | undefined {
  const annotations = useSelector(selectAnnotationsForPath(fieldPath));

  return annotations?.length > 0
    ? annotations.map(({ message }) => message)
    : undefined;
}

function useFieldError(fieldPath: string): string | string[] | undefined {
  const { shouldUseAnalysis, showUntouchedErrors } =
    useContext(FormErrorContext);

  return shouldUseAnalysis
    ? // eslint-disable-next-line react-hooks/rules-of-hooks -- shouldUseAnalysis is set once before render
      useAnalysisFieldError(fieldPath)
    : // eslint-disable-next-line react-hooks/rules-of-hooks -- shouldUseAnalysis is set once before render
      useFormikFieldError(fieldPath, showUntouchedErrors);
}

export default useFieldError;

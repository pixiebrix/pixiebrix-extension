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

import { useSelector } from "react-redux";
import { selectAnnotationsForPath } from "@/pageEditor/slices/editorSelectors";
import { useField } from "formik";
import { useFormErrorSettings } from "@/components/form/FormErrorContext";
import { type AnalysisAnnotation } from "@/analysis/analysisTypes";
import { AnnotationType } from "@/types";

type UseFieldErrorResult = {
  warning?: string | AnalysisAnnotation[] | undefined;

  // Formik error tree can return an object, hence the 'Record<string, unknown>'
  error?: string | AnalysisAnnotation[] | Record<string, unknown> | undefined;
};

function useFormikFieldError(
  fieldPath: string,
  showUntouched?: boolean
): UseFieldErrorResult {
  const [, { error, touched }] = useField(fieldPath);
  return showUntouched || touched ? { error } : {};
}

function useAnalysisFieldError(fieldPath: string): UseFieldErrorResult {
  const annotations = useSelector(selectAnnotationsForPath(fieldPath));
  if (!annotations?.length) {
    return {};
  }

  return {
    error: annotations.filter(
      (annotation) => annotation.type === AnnotationType.Error
    ),
    warning: annotations.filter(
      (annotation) => annotation.type === AnnotationType.Warning
    ),
  };
}

function useFieldError(fieldPath: string): UseFieldErrorResult {
  const { shouldUseAnalysis, showUntouchedErrors } = useFormErrorSettings();

  return shouldUseAnalysis
    ? // eslint-disable-next-line react-hooks/rules-of-hooks -- shouldUseAnalysis is set once before render
      useAnalysisFieldError(fieldPath)
    : // eslint-disable-next-line react-hooks/rules-of-hooks -- shouldUseAnalysis is set once before render
      useFormikFieldError(fieldPath, showUntouchedErrors);
}

export default useFieldError;

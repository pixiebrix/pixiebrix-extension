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

import React, { useContext, useMemo } from "react";
import { connect, type FormikContextType, getIn } from "formik";
import FieldTemplate, { type FieldProps } from "./FieldTemplate";
import { useSelector } from "react-redux";
import type { FieldAnnotation } from "./FieldAnnotation";
import { extractMarkdownLink, isNullOrBlank } from "../../utils/stringUtils";
import { AnnotationType } from "../../types/annotationTypes";
import AnalysisAnnotationsContext from "@/analysis/AnalysisAnnotationsContext";
import { makeFieldAnnotationsForValue } from "./makeFieldAnnotationsForValue";

type ConnectedFieldProps<Values> = FieldProps & {
  formik: FormikContextType<Values>;
  showUntouchedErrors?: boolean;
};

function FormikFieldTemplate<Values>({
  formik,
  showUntouchedErrors,
  ...fieldProps
}: ConnectedFieldProps<Values>) {
  const value: unknown = getIn(formik.values, fieldProps.name);
  const touched = Boolean(getIn(formik.touched, fieldProps.name));
  const error: unknown = getIn(formik.errors, fieldProps.name);

  const { analysisAnnotationsSelectorForPath } = useContext(
    AnalysisAnnotationsContext,
  );
  const analysisAnnotations = useSelector(
    analysisAnnotationsSelectorForPath(fieldProps.name),
  );
  const fieldAnnotations = useMemo(() => {
    const annotations = makeFieldAnnotationsForValue(
      analysisAnnotations,
      value,
      formik,
    );

    const showFormikError =
      (showUntouchedErrors || touched) &&
      typeof error === "string" &&
      !isNullOrBlank(error);

    if (showFormikError) {
      // The error message could end in a Markdown link [label](url), which is extracted and shown as a button link.
      const documentationLink = extractMarkdownLink(error);
      const annotation: FieldAnnotation = {
        message: documentationLink?.rest || error,
        type: AnnotationType.Error,
        actions: documentationLink
          ? [
              {
                caption: documentationLink.label || "Read more",
                async action() {
                  window.open(documentationLink.url, "_blank");
                },
              },
            ]
          : undefined,
      };
      annotations.push(annotation);
    }

    return annotations;
  }, [analysisAnnotations, error, formik, showUntouchedErrors, touched, value]);

  return (
    <FieldTemplate
      value={value}
      annotations={fieldAnnotations}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      {...fieldProps}
    />
  );
}

export default connect<FieldProps>(FormikFieldTemplate);

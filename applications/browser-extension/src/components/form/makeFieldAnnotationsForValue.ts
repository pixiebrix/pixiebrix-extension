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

import { type AnalysisAnnotation } from "@/analysis/analysisTypes";
import { type FieldAnnotation } from "./FieldAnnotation";
import { isEqual } from "lodash";
import { makeFieldActionForAnnotationAction } from "./makeFieldActionForAnnotationAction";
import { type FormikContextType } from "formik";

export function makeFieldAnnotationsForValue(
  analysisAnnotations: AnalysisAnnotation[],
  fieldValue: unknown,
  formik: FormikContextType<unknown>,
): FieldAnnotation[] {
  return (
    analysisAnnotations
      // Annotations from redux can get out of sync with the current state of the field
      // Check that the value from redux matches the current formik value before showing
      // See: https://github.com/pixiebrix/pixiebrix-extension/pull/6846
      .filter((annotation) => {
        if (!annotation.detail) {
          return true;
        }

        // Also need to handle annotation.detail: { expression: ... } format
        const detailValue =
          typeof annotation.detail === "object" &&
          "expression" in annotation.detail
            ? annotation.detail.expression
            : annotation.detail;

        return isEqual(detailValue, fieldValue);
      })
      .map(({ message, type, actions }) => {
        const fieldAnnotation: FieldAnnotation = {
          message,
          type,
        };
        if (actions && actions.length > 0) {
          fieldAnnotation.actions = actions.map((action) =>
            makeFieldActionForAnnotationAction(action, formik),
          );
        }

        return fieldAnnotation;
      })
  );
}

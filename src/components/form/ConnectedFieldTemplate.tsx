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

import React, { useMemo } from "react";
import { connect, type FormikContextType, getIn, setIn } from "formik";
import FieldTemplate, {
  type FieldProps,
} from "@/components/form/FieldTemplate";
import { useSelector } from "react-redux";
import { selectAnnotationsForPath } from "@/pageEditor/slices/editorSelectors";
import type {
  FieldAnnotation,
  FieldAnnotationAction,
} from "@/components/form/FieldAnnotation";
import { isEmpty, isEqual } from "lodash";
import {
  type AnalysisAnnotationAction,
  AnalysisAnnotationActionType,
} from "@/analysis/analysisTypes";
import { produce } from "immer";
import { isNullOrBlank } from "@/utils/stringUtils";
import { AnnotationType } from "@/types/annotationTypes";

type ConnectedFieldProps<Values> = FieldProps & {
  formik: FormikContextType<Values>;
  showUntouchedErrors?: boolean;
};

function makeFieldActionForAnnotationAction<Values>(
  action: AnalysisAnnotationAction,
  formik: FormikContextType<Values>,
): FieldAnnotationAction {
  return {
    caption: action.caption,
    async action() {
      const newValues = produce(formik.values, (draft) => {
        if (action.type === AnalysisAnnotationActionType.AddValueToArray) {
          const array = getIn(draft, action.path) as unknown[];
          array.push(action.value);
          setIn(draft, action.path, array);
        }
      });

      await action.extraCallback?.();

      // Order here matters at the moment. The first implemented action needs
      // to request browser permissions in the callback before setting form
      // state, so that after the Effect handler syncs formik with redux, the
      // browser permissions are present when the app re-renders
      // (analysis runs again, permissions toolbar updates, etc.).
      // TBD if this is the correct long-term approach or not.
      await formik.setValues(newValues, true);
    },
  };
}

function FormikFieldTemplate<Values>({
  formik,
  showUntouchedErrors,
  ...fieldProps
}: ConnectedFieldProps<Values>) {
  const value: unknown = getIn(formik.values, fieldProps.name);
  const touched = Boolean(getIn(formik.touched, fieldProps.name));
  const error: unknown = getIn(formik.errors, fieldProps.name);

  const analysisAnnotations = useSelector(
    selectAnnotationsForPath(fieldProps.name),
  );

  const annotations = useMemo<FieldAnnotation[]>(() => {
    const results = analysisAnnotations
      // Annotations from redux can get out of sync with the current state of the field
      // Check that the value from redux matches the current formik value before showing
      // See: https://github.com/pixiebrix/pixiebrix-extension/pull/6846
      .filter((annotation) => {
        if (!annotation.detail) {
          return true;
        }

        // Also need to handle { expression: ... } detail format
        const detailValue =
          typeof annotation.detail === "object" &&
          "expression" in annotation.detail
            ? annotation.detail.expression
            : annotation.detail;

        return isEqual(detailValue, value);
      })
      .map(({ message, type, actions }) => {
        const fieldAnnotation: FieldAnnotation = {
          message,
          type,
        };
        if (!isEmpty(actions)) {
          fieldAnnotation.actions = actions.map((action) =>
            makeFieldActionForAnnotationAction(action, formik),
          );
        }

        return fieldAnnotation;
      });

    const showFormikError =
      (showUntouchedErrors || touched) &&
      typeof error === "string" &&
      !isNullOrBlank(error);

    const annotation: FieldAnnotation = {
      message: error as string,
      type: AnnotationType.Error,
    };
    if (showFormikError) {
      results.push(annotation);
    }

    return results;
  }, [analysisAnnotations, error, formik, showUntouchedErrors, touched, value]);

  return (
    <FieldTemplate
      value={value}
      annotations={annotations}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      {...fieldProps}
    />
  );
}

export default connect<FieldProps>(FormikFieldTemplate);

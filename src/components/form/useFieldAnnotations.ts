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

import {
  type FieldAnnotation,
  type FieldAnnotationAction,
} from "@/components/form/FieldAnnotation";
import { useFormErrorSettings } from "@/components/form/FormErrorContext";
import { useFormikContext } from "formik";
import { useSelector } from "react-redux";
import { selectAnnotationsForPath } from "@/pageEditor/slices/editorSelectors";
import {
  type AnalysisAnnotationAction,
  AnalysisAnnotationActionType,
} from "@/analysis/analysisTypes";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { type FormikContextType } from "formik/dist/types";
import { produce } from "immer";
import { get, isEmpty, set } from "lodash";
import { isNullOrBlank } from "@/utils";
import { AnnotationType } from "@/types";

function makeFieldActionForAnnotationAction(
  action: AnalysisAnnotationAction,
  formik: FormikContextType<FormState>
): FieldAnnotationAction {
  return {
    caption: action.caption,
    async action() {
      const newValues = produce(formik.values, (draft) => {
        if (action.type === AnalysisAnnotationActionType.AddValueToArray) {
          const array = get(draft, action.path) ?? [];
          array.push(action.value);
          set(draft, action.path, array);
        }
      });

      await action.extraCallback?.();

      // Order here matters at the moment. The first implemented action needs
      // to request browser permissions in the callback before setting form
      // state, so that after the Effect handler syncs formik with redux, the
      // browser permissions are present when the app re-renders
      // (analysis runs again, permissions toolbar updates, etc.).
      // TBD if this is the correct long-term approach or not.
      formik.setValues(newValues, true);
    },
  };
}

function useFieldAnnotations(fieldPath: string): FieldAnnotation[] {
  const { shouldUseAnalysis, showUntouchedErrors, showFieldActions } =
    useFormErrorSettings();
  const formik = useFormikContext<FormState>();

  if (shouldUseAnalysis) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Conditional is based on a Context that won't change at runtime
    const analysisAnnotations = useSelector(
      selectAnnotationsForPath(fieldPath)
    );
    return analysisAnnotations.map(({ message, type, actions }) => {
      const fieldAnnotation: FieldAnnotation = {
        message,
        type,
      };
      if (showFieldActions && !isEmpty(actions)) {
        fieldAnnotation.actions = actions.map((action) =>
          makeFieldActionForAnnotationAction(action, formik)
        );
      }

      return fieldAnnotation;
    });
  }

  const { error, touched } = formik.getFieldMeta(fieldPath);
  const showFormikError =
    (showUntouchedErrors || touched) &&
    typeof error === "string" &&
    !isNullOrBlank(error);
  const annotation: FieldAnnotation = {
    message: error,
    type: AnnotationType.Error,
  };
  return showFormikError ? [annotation] : [];
}

export default useFieldAnnotations;

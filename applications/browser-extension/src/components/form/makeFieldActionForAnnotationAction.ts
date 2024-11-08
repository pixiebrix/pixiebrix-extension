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

import {
  type AnalysisAnnotationAction,
  AnalysisAnnotationActionType,
} from "@/analysis/analysisTypes";
import { type FormikContextType } from "formik";
// Use lodash's get/set because formik's does not mutate the object in place.
import { get as getIn, set as setIn } from "lodash";
import type { FieldAnnotationAction } from "./FieldAnnotation";
import { produce } from "immer";

export function makeFieldActionForAnnotationAction<Values>(
  action: AnalysisAnnotationAction,
  formik: FormikContextType<Values>,
): FieldAnnotationAction {
  return {
    caption: action.caption,
    async action() {
      const newValues = produce(formik.values, (draft) => {
        switch (action.type) {
          case AnalysisAnnotationActionType.AddValueToArray: {
            const array = getIn(draft, action.path) as unknown[];
            array.push(action.value);
            setIn(draft as UnknownObject, action.path, array);
            break;
          }

          case AnalysisAnnotationActionType.UnsetValue: {
            setIn(draft as UnknownObject, action.path, undefined);
            break;
          }

          default:
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

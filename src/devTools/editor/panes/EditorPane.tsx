/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useState } from "react";
import { editorSlice, FormState } from "@/devTools/editor/slices/editorSlice";
import { useCreate } from "@/devTools/editor/hooks/useCreate";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/options/selectors";
import { useDebouncedCallback } from "use-debounce";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Formik, FormikHelpers } from "formik";
import Effect from "@/devTools/editor/components/Effect";
import ElementWizard from "@/devTools/editor/ElementWizard";
import useEditable from "@/devTools/editor/hooks/useEditable";
import { LogContextWrapper } from "@/components/logViewer/LogContext";
import SaveRecipeExtensionModal from "./SaveRecipeExtensionModal";

// CHANGE_DETECT_DELAY_MILLIS should be low enough so that sidebar gets updated in a reasonable amount of time, but
// high enough that there isn't an entry lag in the page editor
const CHANGE_DETECT_DELAY_MILLIS = 100;
const REDUX_SYNC_WAIT_MILLIS = 500;

const { updateElement } = editorSlice.actions;

const EditorPane: React.FunctionComponent<{
  selectedElement: FormState;
  selectionSeq: number;
}> = ({ selectedElement, selectionSeq }) => {
  const create = useCreate();
  const dispatch = useDispatch();
  const installed = useSelector(selectExtensions);
  const editable = useEditable();

  const [isRecipeOptionsModalShown, setRecipeOptionsModalShown] = useState(
    false
  );

  const onCreate = async (
    element: FormState,
    formikHelpers: FormikHelpers<FormState>
  ) => {
    if (element.recipe || true) {
      setRecipeOptionsModalShown(true);
    } else {
      await create(element, formikHelpers);
    }
  };

  // XXX: anti-pattern: callback to update the redux store based on the formik state
  const syncReduxState = useDebouncedCallback(
    (values: FormState) => {
      dispatch(updateElement(values));
    },
    REDUX_SYNC_WAIT_MILLIS,
    { trailing: true, leading: false }
  );

  // Key to force reload of component when user selects a different element from the sidebar
  const key = `${selectedElement.uuid}-${selectedElement.installed}-${selectionSeq}`;

  return (
    <>
      <ErrorBoundary key={key}>
        <Formik key={key} initialValues={selectedElement} onSubmit={onCreate}>
          {({ values }) => (
            <>
              <Effect
                values={values}
                onChange={syncReduxState}
                delayMillis={CHANGE_DETECT_DELAY_MILLIS}
              />
              <LogContextWrapper>
                <ElementWizard
                  element={values}
                  editable={editable}
                  installed={installed}
                />
              </LogContextWrapper>
            </>
          )}
        </Formik>
      </ErrorBoundary>
      {isRecipeOptionsModalShown && (
        <SaveRecipeExtensionModal
          recipeName={"asdf"}
          isRecipeEditable
          installedRecipeVersion={4}
          latestRecipeVersion={4}
          onClose={() => {
            setRecipeOptionsModalShown(false);
          }}
        />
      )}
    </>
  );
};

export default EditorPane;

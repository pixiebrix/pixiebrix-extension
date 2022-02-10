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

import React from "react";
import {
  actions as editorActions,
  FormState,
} from "@/devTools/editor/slices/editorSlice";
import { useDispatch } from "react-redux";
import { useDebouncedCallback } from "use-debounce";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Formik } from "formik";
import Effect from "@/devTools/editor/components/Effect";
import ElementWizard from "@/devTools/editor/ElementWizard";
import useEditable from "@/devTools/editor/hooks/useEditable";
import { LogContextWrapper } from "@/components/logViewer/LogContext";
import SaveExtensionWizard from "./save/SaveExtensionWizard";
import useSavingWizard from "./save/useSavingWizard";
import { ContextLogs } from "@/components/logViewer/Logs";

// CHANGE_DETECT_DELAY_MILLIS should be low enough so that sidebar gets updated in a reasonable amount of time, but
// high enough that there isn't an entry lag in the page editor
const CHANGE_DETECT_DELAY_MILLIS = 100;
const REDUX_SYNC_WAIT_MILLIS = 500;

const EditorPane: React.FunctionComponent<{
  selectedElement: FormState;
  selectionSeq: number;
}> = ({ selectedElement, selectionSeq }) => {
  const dispatch = useDispatch();
  const editable = useEditable();
  const { isWizardOpen } = useSavingWizard();

  // XXX: anti-pattern: callback to update the redux store based on the formik state
  const syncReduxState = useDebouncedCallback(
    (values: FormState) => {
      dispatch(editorActions.editElement(values));
    },
    REDUX_SYNC_WAIT_MILLIS,
    { trailing: true, leading: false }
  );

  // Key to force reload of component when user selects a different element from the sidebar
  const key = `${selectedElement.uuid}-${selectedElement.installed}-${selectionSeq}`;

  return (
    <>
      <ErrorBoundary key={key}>
        <Formik
          key={key}
          initialValues={selectedElement}
          onSubmit={() => {
            console.error(
              "Formik's submit should not be called to save an extension. Use 'saveElement' from 'useSavingWizard' instead."
            );
          }}
          // We're validating on blur instead of on change as a stop-gap measure to improve typing
          // performance in schema fields of block configs in dev builds of the extension.
          // The long-term better solution is to split up our pipeline validation code to work
          // on one block at a time, and then modify the usePipelineField hook to only validate
          // one block at a time. Then we can re-enable change validation here once this doesn't
          // cause re-rendering the entire form on every change.
          validateOnChange={false}
          validateOnBlur={true}
        >
          {({ values: element }) => (
            <>
              <Effect
                values={element}
                onChange={syncReduxState}
                delayMillis={CHANGE_DETECT_DELAY_MILLIS}
              />
              <LogContextWrapper>
                <ContextLogs context={{ extensionId: element.uuid }}>
                  <ElementWizard element={element} editable={editable} />
                </ContextLogs>
              </LogContextWrapper>
              {isWizardOpen && <SaveExtensionWizard />}
            </>
          )}
        </Formik>
      </ErrorBoundary>
    </>
  );
};

export default EditorPane;

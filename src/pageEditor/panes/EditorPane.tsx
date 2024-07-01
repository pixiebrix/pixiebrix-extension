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

import React, { useEffect } from "react";
import {
  actions,
  actions as editorActions,
} from "@/pageEditor/slices/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { useDebouncedCallback } from "use-debounce";
import ErrorBoundary from "@/components/ErrorBoundary";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import Effect from "@/components/Effect";
import ModComponentFormStateWizard from "@/pageEditor/ModComponentFormStateWizard";
import { logActions } from "@/components/logViewer/logSlice";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import {
  selectActiveModComponentFormState,
  selectEditorUpdateKey,
} from "@/pageEditor/slices/editorSelectors";
import IntegrationsSliceModIntegrationsContextAdapter from "@/integrations/store/IntegrationsSliceModIntegrationsContextAdapter";

// CHANGE_DETECT_DELAY_MILLIS should be low enough so that sidebar gets updated in a reasonable amount of time, but
// high enough that there isn't an entry lag in the page editor
const CHANGE_DETECT_DELAY_MILLIS = 100;
const REDUX_SYNC_WAIT_MILLIS = 500;

const EditorPaneContent: React.VoidFunctionComponent<{
  modComponentFormState: ModComponentFormState;
}> = ({ modComponentFormState }) => {
  const dispatch = useDispatch();

  // XXX: anti-pattern: callback to update the redux store based on the formik state
  const syncReduxState = useDebouncedCallback(
    (values: ModComponentFormState) => {
      dispatch(editorActions.syncModComponentFormState(values));
      dispatch(actions.checkActiveModComponentAvailability());
    },
    REDUX_SYNC_WAIT_MILLIS,
    { trailing: true, leading: false },
  );

  useEffect(() => {
    const messageContext = {
      extensionId: modComponentFormState.uuid,
      blueprintId: modComponentFormState.recipe
        ? modComponentFormState.recipe.id
        : undefined,
    };
    dispatch(logActions.setContext(messageContext));
  }, [modComponentFormState.uuid, modComponentFormState.recipe, dispatch]);

  return (
    <IntegrationsSliceModIntegrationsContextAdapter>
      <Effect
        values={modComponentFormState}
        onChange={syncReduxState}
        delayMillis={CHANGE_DETECT_DELAY_MILLIS}
      />
      <ModComponentFormStateWizard
        modComponentFormState={modComponentFormState}
      />
    </IntegrationsSliceModIntegrationsContextAdapter>
  );
};

const EditorPane: React.VFC = () => {
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  const editorUpdateKey = useSelector(selectEditorUpdateKey);
  // Key to force reload of component when user selects a different mod component from the sidebar
  const key = `${activeModComponentFormState.uuid}-${activeModComponentFormState.installed}-${editorUpdateKey}`;

  return (
    <ErrorBoundary key={key}>
      <Formik
        key={key}
        initialValues={activeModComponentFormState}
        onSubmit={() => {
          console.error(
            "Formik's submit should not be called to save a mod component.",
          );
        }}
        // Don't validate -- we're using analysis, so we don't pass in a validation schema here
        validateOnMount={false}
        validateOnChange={false}
        validateOnBlur={false}
        data-testid="editorPane"
      >
        {({ values }) => <EditorPaneContent modComponentFormState={values} />}
      </Formik>
    </ErrorBoundary>
  );
};

export default EditorPane;

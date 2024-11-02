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

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  actions,
  actions as editorActions,
} from "@/pageEditor/store/editor/editorSlice";
import { useDispatch, useSelector, useStore } from "react-redux";
import ErrorBoundary from "@/components/ErrorBoundary";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import Effect from "@/components/Effect";
import ModComponentFormStateWizard from "@/pageEditor/layout/ModComponentFormStateWizard";
import { logActions } from "@/components/logViewer/logSlice";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import {
  selectActiveModComponentFormState,
  selectEditorUpdateKey,
} from "@/pageEditor/store/editor/editorSelectors";
import IntegrationsSliceModIntegrationsContextAdapter from "@/integrations/store/IntegrationsSliceModIntegrationsContextAdapter";
import { assertNotNullish } from "@/utils/nullishUtils";
import useRegisterDraftModInstanceOnAllFrames from "@/pageEditor/hooks/useRegisterDraftModInstanceOnAllFrames";
import { usePreviousValue } from "@/hooks/usePreviousValue";
import type { EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";
import type { AppDispatch } from "@/pageEditor/store/store";

// CHANGE_DETECT_DELAY_MILLIS should be low enough so that sidebar gets updated in a reasonable amount of time, but
// high enough that there isn't an entry lag in the page editor
const CHANGE_DETECT_DELAY_MILLIS = 300;

/**
 * Returns callback to generate the current key to force reinitialization of Formik form.
 */
function useGetFormReinitializationKey(): () => string {
  const store = useStore<EditorRootState>();

  return useCallback(() => {
    const state = store.getState();
    const editorUpdateKey = selectEditorUpdateKey(state);
    const activeModComponentFormState =
      selectActiveModComponentFormState(state);

    assertNotNullish(
      activeModComponentFormState,
      "ModComponentEditorPane requires activeModComponentFormState",
    );

    return `${activeModComponentFormState.uuid}-${activeModComponentFormState.installed}-${editorUpdateKey}`;
  }, [store]);
}

const EditorPaneContent: React.FC<{
  modComponentFormState: ModComponentFormState;
}> = ({ modComponentFormState }) => {
  const dispatch = useDispatch<AppDispatch>();
  const getFormReinitializationKey = useGetFormReinitializationKey();
  const previousKey = useRef<string | null>(getFormReinitializationKey());

  // XXX: anti-pattern: callback to update the redux store based on the Formik state.
  // Don't use useDebouncedCallback because Effect component is already debounced
  const syncReduxState = useCallback(
    (values: ModComponentFormState) => {
      const currentKey = getFormReinitializationKey();

      dispatch(
        editorActions.setModComponentFormState({
          modComponentFormState: values,
          includesNonFormikChanges: false,
          // Keep existing dirty state on first syncReduxState call after reinitialization. There are
          // some editor components that contain useEffect-like calls that perform normalization on the Formik
          // form state on mount. We want to those changes to be reflected in the form state, but it would be
          // confusing if that normalization automatically marked the component as dirty.
          // See: https://github.com/pixiebrix/pixiebrix-extension/issues/9355
          // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/9370 - remove logic once all
          //  normalization has been moved to the form state adapter
          dirty: previousKey.current === currentKey ? true : undefined,
        }),
      );

      // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/9389
      void dispatch(actions.checkActiveModComponentAvailability());

      previousKey.current = currentKey;
    },
    [dispatch, getFormReinitializationKey, previousKey],
  );

  // XXX: effect should be refactored to a middleware that listens for selected mod component
  useEffect(() => {
    const messageContext = {
      modComponentId: modComponentFormState.uuid,
      modId: modComponentFormState.modMetadata.id,
    };
    dispatch(logActions.setContext({ messageContext }));
  }, [modComponentFormState.uuid, modComponentFormState.modMetadata, dispatch]);

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

/**
 * Returns the initial mod component form state for the Formik form. Responds to updates in the editor state
 * for use with Formik reinitialization.
 */
function useInitialValues(): ModComponentFormState {
  const getCurrentFormReinitializationKey = useGetFormReinitializationKey();

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  assertNotNullish(
    activeModComponentFormState,
    "ModComponentEditorPane requires activeModComponentFormState",
  );

  // Key to force reinitialization of formik when user selects a different mod component from the sidebar
  const key = getCurrentFormReinitializationKey();
  const prevKey = usePreviousValue(key);
  const activeModComponentFormStateRef = useRef(activeModComponentFormState);

  return useMemo(() => {
    if (key === prevKey) {
      return activeModComponentFormStateRef.current;
    }

    activeModComponentFormStateRef.current = activeModComponentFormState;
    return activeModComponentFormState;
  }, [key, prevKey, activeModComponentFormState]);
}

const ModComponentEditorPane: React.FC = () => {
  // Inject the draft mod instance into the page while editing
  useRegisterDraftModInstanceOnAllFrames();
  const initialValues = useInitialValues();

  return (
    <ErrorBoundary>
      <Formik
        enableReinitialize
        initialValues={initialValues}
        onSubmit={() => {
          console.error(
            "Formik's submit should not be called to save a mod component.",
          );
        }}
        // Don't validate -- we're using analysis, so we don't pass in a validation schema here
        validateOnMount={false}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({ values }) => <EditorPaneContent modComponentFormState={values} />}
      </Formik>
    </ErrorBoundary>
  );
};

export default ModComponentEditorPane;

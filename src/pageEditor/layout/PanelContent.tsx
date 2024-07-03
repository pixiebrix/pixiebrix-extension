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

import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { navigationEvent } from "@/pageEditor/events";
import { tabStateActions } from "@/pageEditor/tabState/tabStateSlice";
import { persistor } from "@/pageEditor/store/store";
import { ModalProvider } from "@/components/ConfirmationModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import TabConnectionErrorBanner from "@/pageEditor/TabConnectionErrorBanner";
import RequireAuth from "@/auth/RequireAuth";
import LoginCard from "@/pageEditor/components/LoginCard";
import EditorLayout from "@/pageEditor/layout/EditorLayout";
import { PersistGate } from "redux-persist/integration/react";
import { logActions } from "@/components/logViewer/logSlice";
import {
  updateDraftModComponent,
  removeActivatedModComponent,
} from "@/contentScript/messenger/api";
import { selectActiveModComponentFormState } from "../store/editor/editorSelectors";
import { formStateToDraftModComponent } from "../starterBricks/adapter";
import { shouldAutoRun } from "@/pageEditor/toolbar/ReloadToolbar";
import ReduxPersistenceContext, {
  type ReduxPersistenceContextType,
} from "@/store/ReduxPersistenceContext";
import {
  type StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import type { EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import DimensionGate from "@/pageEditor/components/DimensionGate";
import { allFramesInInspectedTab } from "@/pageEditor/context/connection";
import DatabaseUnresponsiveBanner from "@/components/DatabaseUnresponsiveBanner";

const STARTER_BRICKS_TO_EXCLUDE_FROM_CLEANUP: StarterBrickType[] = [
  StarterBrickTypes.SIDEBAR_PANEL,
];

// When selecting a starter brick in the Page Editor, remove any existing starter bricks
// to avoid adding duplicate starter bricks to the page.
// Issue doesn't apply to certain starter bricks, e.g. sidebar panels
// See https://github.com/pixiebrix/pixiebrix-extension/pull/5047
// and https://github.com/pixiebrix/pixiebrix-extension/pull/6372
const cleanUpStarterBrickForModComponentFormState = (
  modComponentFormState: EditorState["modComponentFormStates"][number],
) => {
  if (
    STARTER_BRICKS_TO_EXCLUDE_FROM_CLEANUP.includes(modComponentFormState.type)
  ) {
    return;
  }

  removeActivatedModComponent(
    allFramesInInspectedTab,
    modComponentFormState.uuid,
  );
};

const PanelContent: React.FC = () => {
  const dispatch = useDispatch();
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  const onNavigation = useCallback(() => {
    dispatch(tabStateActions.connectToContentScript());

    if (
      activeModComponentFormState != null &&
      shouldAutoRun(activeModComponentFormState)
    ) {
      const draftModComponent = formStateToDraftModComponent(
        activeModComponentFormState,
      );
      updateDraftModComponent(allFramesInInspectedTab, draftModComponent);
    }
  }, [dispatch, activeModComponentFormState]);

  useEffect(() => {
    navigationEvent.add(onNavigation);
    return () => {
      navigationEvent.remove(onNavigation);
    };
  }, [onNavigation]);

  useEffect(() => {
    // Automatically connect on load
    dispatch(tabStateActions.connectToContentScript());

    // Start polling logs
    dispatch(logActions.pollLogs());
  }, [dispatch]);

  useEffect(() => {
    if (!activeModComponentFormState) {
      return;
    }

    cleanUpStarterBrickForModComponentFormState(activeModComponentFormState);
  }, [activeModComponentFormState]);

  const authPersistenceContext: ReduxPersistenceContextType = {
    async flush() {
      await persistor.flush();
    },
  };

  return (
    <PersistGate persistor={persistor}>
      <ReduxPersistenceContext.Provider value={authPersistenceContext}>
        <ModalProvider>
          <ErrorBoundary>
            <TabConnectionErrorBanner />
            <DatabaseUnresponsiveBanner />
            <DimensionGate>
              <RequireAuth LoginPage={LoginCard}>
                {/* eslint-disable-next-line react/jsx-max-depth -- Not worth simplifying */}
                <EditorLayout />
              </RequireAuth>
            </DimensionGate>
          </ErrorBoundary>
        </ModalProvider>
      </ReduxPersistenceContext.Provider>
    </PersistGate>
  );
};

export default PanelContent;

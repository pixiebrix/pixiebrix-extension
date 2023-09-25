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

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTabEventListener } from "@/hooks/events";
import { navigationEvent } from "@/pageEditor/events";
import { tabStateActions } from "@/pageEditor/tabState/tabStateSlice";
import { persistor } from "@/pageEditor/store";
import { ModalProvider } from "@/components/ConfirmationModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorBanner from "@/pageEditor/ErrorBanner";
import RequireAuth from "@/auth/RequireAuth";
import LoginCard from "@/pageEditor/components/LoginCard";
import EditorLayout from "@/pageEditor/EditorLayout";
import { PersistGate } from "redux-persist/integration/react";
import { logActions } from "@/components/logViewer/logSlice";
import { thisTab } from "@/pageEditor/utils";
import {
  removeInstalledExtension,
  updateDynamicElement,
} from "@/contentScript/messenger/api";
import { selectActiveElement } from "./slices/editorSelectors";
import { formStateToDynamicElement } from "./starterBricks/adapter";
import { shouldAutoRun } from "@/pageEditor/toolbar/ReloadToolbar";
import ReduxPersistenceContext, {
  type ReduxPersistenceContextType,
} from "@/store/ReduxPersistenceContext";
import type { StarterBrickType } from "@/starterBricks/types";
import type { EditorState } from "@/pageEditor/pageEditorTypes";

const STARTER_BRICKS_TO_EXCLUDE_FROM_CLEANUP: StarterBrickType[] = [
  "actionPanel",
  "panel",
];

// When selecting a starter brick in the Page Editor, remove any existing starter bricks
// to avoid adding duplicate starter bricks to the page.
// Issue doesn't apply to certain starter bricks, e.g. sidebar panels
// See https://github.com/pixiebrix/pixiebrix-extension/pull/5047
// and https://github.com/pixiebrix/pixiebrix-extension/pull/6372
const cleanUpStarterBrickForElement = (
  activeElement: EditorState["elements"][number] | null
) => {
  if (
    !activeElement ||
    STARTER_BRICKS_TO_EXCLUDE_FROM_CLEANUP.includes(activeElement.type)
  ) {
    return;
  }

  removeInstalledExtension(thisTab, activeElement.uuid);
};

const PanelContent: React.FC = () => {
  const dispatch = useDispatch();
  const activeElement = useSelector(selectActiveElement);

  useTabEventListener(thisTab.tabId, navigationEvent, () => {
    dispatch(tabStateActions.connectToContentScript());

    if (activeElement != null && shouldAutoRun(activeElement)) {
      const dynamicElement = formStateToDynamicElement(activeElement);
      void updateDynamicElement(thisTab, dynamicElement);
    }
  });

  useEffect(() => {
    // Automatically connect on load
    dispatch(tabStateActions.connectToContentScript());

    // Start polling logs
    dispatch(logActions.pollLogs());
  }, [dispatch]);

  useEffect(() => {
    cleanUpStarterBrickForElement(activeElement);
  }, [activeElement]);

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
            <ErrorBanner />
            <RequireAuth LoginPage={LoginCard}>
              <EditorLayout />
            </RequireAuth>
          </ErrorBoundary>
        </ModalProvider>
      </ReduxPersistenceContext.Provider>
    </PersistGate>
  );
};

export default PanelContent;

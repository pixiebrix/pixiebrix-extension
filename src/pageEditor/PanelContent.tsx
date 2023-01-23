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
  updateDynamicElement,
  removeExtension,
} from "@/contentScript/messenger/api";
import { selectActiveElement } from "./slices/editorSelectors";
import { formStateToDynamicElement } from "./extensionPoints/adapter";

const PanelContent: React.FC = () => {
  const dispatch = useDispatch();
  const activeElement = useSelector(selectActiveElement);

  useTabEventListener(thisTab.tabId, navigationEvent, () => {
    dispatch(tabStateActions.connectToContentScript());

    if (activeElement != null) {
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
    // Remove the installed extension
    if (activeElement != null) {
      removeExtension(thisTab, activeElement.uuid);
    }
  }, [activeElement]);

  return (
    <PersistGate persistor={persistor}>
      <ModalProvider>
        <ErrorBoundary>
          <ErrorBanner />
          <RequireAuth LoginPage={LoginCard}>
            <EditorLayout />
          </RequireAuth>
        </ErrorBoundary>
      </ModalProvider>
    </PersistGate>
  );
};

export default PanelContent;

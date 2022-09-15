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

import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
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

const PanelContent: React.FC = () => {
  const dispatch = useDispatch();
  const { tabId } = browser.devtools.inspectedWindow;
  useTabEventListener(tabId, navigationEvent, () => {
    dispatch(tabStateActions.connectToContentScript());
  });
  // Automatically connect on load
  useEffect(() => {
    dispatch(tabStateActions.connectToContentScript());
  }, [dispatch]);

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

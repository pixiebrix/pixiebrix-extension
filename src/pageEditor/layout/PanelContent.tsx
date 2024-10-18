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
import { useDispatch } from "react-redux";
import { tabStateActions } from "@/pageEditor/store/tabState/tabStateSlice";
import { persistor } from "@/pageEditor/store/store";
import { ModalProvider } from "@/components/ConfirmationModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import TabConnectionErrorBanner from "@/pageEditor/components/TabConnectionErrorBanner";
import RequireAuth from "@/auth/RequireAuth";
import LoginCard from "@/pageEditor/components/LoginCard";
import EditorLayout from "@/pageEditor/layout/EditorLayout";
import { PersistGate } from "redux-persist/integration/react";
import { logActions } from "@/components/logViewer/logSlice";
import ReduxPersistenceContext, {
  type ReduxPersistenceContextType,
} from "@/store/ReduxPersistenceContext";
import DimensionGate from "@/pageEditor/components/DimensionGate";
import DatabaseUnresponsiveBanner from "@/components/DatabaseUnresponsiveBanner";
import { InsertPaneProvider } from "@/pageEditor/panes/insert/InsertPane";
import TeamTrialBanner from "@/components/teamTrials/TeamTrialBanner";
import useTeamTrialStatus, {
  TeamTrialStatus,
} from "@/components/teamTrials/useTeamTrialStatus";
import { navigationEvent } from "@/pageEditor/events";

/**
 * Hook to connect to the content script on Page Editor mount and on navigation events.
 * @see navigationEvent
 */
function useConnectToContentScript(): void {
  const dispatch = useDispatch();

  useEffect(() => {
    const connect = () => {
      dispatch(tabStateActions.connectToContentScript());
    };

    // Automatically connect on mount
    connect();

    navigationEvent.add(connect);
    return () => {
      navigationEvent.remove(connect);
    };
  }, [dispatch]);
}

const PanelContent: React.FC = () => {
  const dispatch = useDispatch();
  const trialStatus = useTeamTrialStatus();

  useConnectToContentScript();

  useEffect(() => {
    // Start polling logs
    dispatch(logActions.pollLogs());
  }, [dispatch]);

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
            {trialStatus === TeamTrialStatus.EXPIRED && <TeamTrialBanner />}
            <TabConnectionErrorBanner />
            <DatabaseUnresponsiveBanner />
            <DimensionGate>
              <RequireAuth LoginPage={LoginCard}>
                <InsertPaneProvider>
                  {/* eslint-disable-next-line react/jsx-max-depth -- Not worth simplifying */}
                  <EditorLayout />
                </InsertPaneProvider>
              </RequireAuth>
            </DimensionGate>
          </ErrorBoundary>
        </ModalProvider>
      </ReduxPersistenceContext.Provider>
    </PersistGate>
  );
};

export default PanelContent;

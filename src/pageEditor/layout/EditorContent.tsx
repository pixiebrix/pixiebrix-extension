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
import { useSelector } from "react-redux";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { useGetMarketplaceListingsQuery } from "@/data/service/api";
import NoTabAccessPane from "@/pageEditor/panes/NoTabAccessPane";
import BetaPane from "@/pageEditor/panes/BetaPane";
import EditorPane from "@/pageEditor/panes/EditorPane";
import ModEditorPane from "@/pageEditor/panes/ModEditorPane";
import HomePane from "@/pageEditor/panes/HomePane";
import {
  selectActiveModComponentId,
  selectActiveModId,
  selectErrorState,
  selectModComponentAvailability,
} from "@/pageEditor/store/editor/editorSelectors";
import {
  selectTabHasPermissions,
  selectTabIsConnectingToContentScript,
} from "@/pageEditor/store/tabState/tabStateSelectors";
import { getErrorMessage } from "@/errors/errorHelpers";
import { selectPageEditorDimensions } from "@/pageEditor/utils";
import { DefaultErrorComponent } from "@/components/ErrorBoundary";

const EditorContent: React.FC = () => {
  const tabHasPermissions = useSelector(selectTabHasPermissions);
  const isConnectingToContentScript = useSelector(
    selectTabIsConnectingToContentScript,
  );
  const sessionId = useSelector(selectSessionId);
  const { isBetaError, editorError } = useSelector(selectErrorState);
  const activeModComponentId = useSelector(selectActiveModComponentId);
  const activeModId = useSelector(selectActiveModId);
  const {
    isPendingAvailableActivatedModComponents,
    isPendingDraftModComponents,
  } = useSelector(selectModComponentAvailability);

  const isPendingModComponents =
    isPendingAvailableActivatedModComponents || isPendingDraftModComponents;

  // Fetch-and-cache marketplace content for rendering in the Brick Selection modal
  useGetMarketplaceListingsQuery();

  useEffect(() => {
    reportEvent(Events.PAGE_EDITOR_SESSION_START, {
      sessionId,
      ...selectPageEditorDimensions(),
    });

    // Report session end before page unload instead of component unmount because closing the
    // devtools will prevent the component from unmounting
    window.addEventListener("beforeunload", () => {
      reportEvent(Events.PAGE_EDITOR_SESSION_END, {
        sessionId,
        ...selectPageEditorDimensions(),
      });
    });
  }, [sessionId]);

  // Always show the main error if present - keep this first
  if (editorError) {
    return (
      <DefaultErrorComponent
        hasError={true}
        error={editorError}
        errorMessage={getErrorMessage(editorError)}
        stack={editorError instanceof Error ? editorError.stack : undefined}
      />
    );
  }

  if (!tabHasPermissions && !isConnectingToContentScript) {
    // Check `connecting` to optimistically show the main interface while the devtools are connecting to the page.
    return <NoTabAccessPane />;
  }

  // Show generic error for beta features
  if (isBetaError) {
    return <BetaPane />;
  }

  if (activeModComponentId) {
    return <EditorPane />;
  }

  if (activeModId) {
    return <ModEditorPane />;
  }

  if (isPendingModComponents || isConnectingToContentScript) {
    // Avoid flashing the panes below while the state is loading. This condition should probably
    // not be moved below <HomePane>
    // It loads fast enough to not require a <Loader> either.
    // https://github.com/pixiebrix/pixiebrix-extension/pull/3611
    return null;
  }

  return <HomePane />;
};

export default EditorContent;

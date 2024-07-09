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

import React, { useCallback } from "react";
import { type TemporaryPanelEntry } from "@/types/sidebarTypes";
import { eventKeyForEntry } from "@/store/sidebar/eventKeyUtils";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { Tab } from "react-bootstrap";
import PanelBody from "@/sidebar/PanelBody";
import styles from "./Tabs.module.scss";
import cx from "classnames";
import { type SubmitPanelAction } from "@/bricks/errors";
import { useDispatch } from "react-redux";
import ErrorBoundary from "@/sidebar/SidebarErrorBoundary";
import resolveTemporaryPanel from "@/store/sidebar/thunks/resolveTemporaryPanel";
import { type AsyncDispatch } from "@/sidebar/store";
import UnavailableOverlay from "@/sidebar/UnavailableOverlay";
import removeTemporaryPanel from "@/store/sidebar/thunks/removeTemporaryPanel";

import { mapModComponentRefToMessageContext } from "@/utils/modUtils";

// Need to memoize this to make sure it doesn't rerender unless its entry actually changes
// This was part of the fix for issue: https://github.com/pixiebrix/pixiebrix-extension/issues/5646
export const TemporaryPanelTabPane: React.FC<{
  panel: TemporaryPanelEntry;
}> = React.memo(({ panel }) => {
  const dispatch = useDispatch<AsyncDispatch>();

  const onAction = useCallback(
    async (action: SubmitPanelAction) => {
      await dispatch(
        resolveTemporaryPanel({
          nonce: panel.nonce,
          action,
        }),
      );
    },
    [dispatch, panel.nonce],
  );
  const { type, modComponentRef, payload } = panel;

  return (
    <Tab.Pane
      className={cx("full-height flex-grow", styles.paneOverrides)}
      eventKey={eventKeyForEntry(panel)}
    >
      <ErrorBoundary
        onError={() => {
          reportEvent(Events.VIEW_ERROR, {
            ...mapModComponentRefToMessageContext(modComponentRef),
            panelType: type,
          });
        }}
      >
        {panel.isUnavailable && (
          <UnavailableOverlay
            onClose={async () => dispatch(removeTemporaryPanel(panel.nonce))}
          />
        )}
        <PanelBody
          isRootPanel={false}
          payload={payload}
          context={mapModComponentRefToMessageContext(modComponentRef)}
          onAction={onAction}
        />
      </ErrorBoundary>
    </Tab.Pane>
  );
});
TemporaryPanelTabPane.displayName = "TemporaryPanelTabPane";

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

import React, { useCallback } from "react";
import { type TemporaryPanelEntry } from "@/types/sidebarTypes";
import { eventKeyForEntry } from "@/sidebar/eventKeyUtils";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { Tab } from "react-bootstrap";
import PanelBody from "@/sidebar/PanelBody";
import styles from "./Tabs.module.scss";
import cx from "classnames";
import { type SubmitPanelAction } from "@/bricks/errors";
import { useDispatch } from "react-redux";
import sidebarSlice from "@/sidebar/sidebarSlice";
import ErrorBoundary from "@/sidebar/SidebarErrorBoundary";

// Need to memoize this to make sure it doesn't rerender unless its entry actually changes
// This was part of the fix for issue: https://github.com/pixiebrix/pixiebrix-extension/issues/5646
export const TemporaryPanelTabPane: React.FC<{
  panel: TemporaryPanelEntry;
}> = React.memo(({ panel }) => {
  const dispatch = useDispatch();
  const onAction = useCallback(
    (action: SubmitPanelAction) => {
      dispatch(
        sidebarSlice.actions.resolveTemporaryPanel({
          nonce: panel.nonce,
          action,
        }),
      );
    },
    [dispatch, panel.nonce],
  );
  const { type, extensionId, blueprintId, payload } = panel;

  return (
    <Tab.Pane
      className={cx("full-height flex-grow", styles.paneOverrides)}
      eventKey={eventKeyForEntry(panel)}
    >
      <ErrorBoundary
        onError={() => {
          reportEvent(Events.VIEW_ERROR, {
            panelType: type,
            extensionId,
            blueprintId,
          });
        }}
      >
        <PanelBody
          isRootPanel={false}
          payload={payload}
          context={{
            extensionId,
            blueprintId,
          }}
          onAction={onAction}
        />
      </ErrorBoundary>
    </Tab.Pane>
  );
});
TemporaryPanelTabPane.displayName = "TemporaryPanelTabPane";

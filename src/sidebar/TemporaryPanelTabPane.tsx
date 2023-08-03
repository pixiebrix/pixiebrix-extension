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
import ErrorBoundary from "@/sidebar/ErrorBoundary";

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
        })
      );
    },
    [dispatch, panel.nonce]
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

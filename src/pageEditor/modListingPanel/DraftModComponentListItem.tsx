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

import styles from "./Entry.module.scss";
import React, { useCallback } from "react";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { ListGroup } from "react-bootstrap";
import { getLabel } from "@/pageEditor/modListingPanel/common";
import {
  ModComponentIcon,
  NotAvailableIcon,
  UnsavedChangesIcon,
} from "@/pageEditor/modListingPanel/ModComponentIcons";
import { type UUID } from "@/types/stringTypes";
import {
  disableOverlay,
  enableOverlay,
  updateSidebar,
} from "@/contentScript/messenger/api";
import { openSidePanel } from "@/utils/sidePanelUtils";
import cx from "classnames";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import {
  selectActiveModComponentFormState,
  selectActiveModId,
  selectDraftModComponentIsAvailable,
  selectModComponentIsDirty,
} from "@/pageEditor/store/editor/editorSelectors";
import { inspectedTab } from "@/pageEditor/context/connection";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import DraftModComponentActionMenu from "@/pageEditor/modListingPanel/actionMenus/DraftModComponentActionMenu";

/**
 * A page editor sidebar menu entry corresponding to a touched mod component
 * @see ActivatedModComponentListItem
 * @see ModComponentListItem
 */
const DraftModComponentListItem: React.FunctionComponent<{
  modComponentFormState: ModComponentFormState;
}> = ({ modComponentFormState }) => {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const activeModId = useSelector(selectActiveModId);
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  const isActive =
    activeModComponentFormState?.uuid === modComponentFormState.uuid;
  const modId = modComponentFormState.modMetadata?.id;
  const isSiblingOfActiveListItem = activeModComponentFormState?.modMetadata?.id
    ? modId === activeModComponentFormState?.modMetadata?.id
    : false;
  const isChildOfActiveListItem = modId === activeModId;
  const isRelativeOfActiveListItem =
    !isActive && (isChildOfActiveListItem || isSiblingOfActiveListItem);
  const isDirty = useSelector(
    selectModComponentIsDirty(modComponentFormState.uuid),
  );
  const isAvailable = useSelector(
    selectDraftModComponentIsAvailable(modComponentFormState.uuid),
  );

  const isButton =
    modComponentFormState.starterBrick.definition.type ===
    StarterBrickTypes.BUTTON;

  const showOverlay = useCallback(async (uuid: UUID) => {
    await enableOverlay(inspectedTab, `[data-pb-uuid="${uuid}"]`);
  }, []);

  const hideOverlay = useCallback(async () => {
    await disableOverlay(inspectedTab);
  }, []);

  return (
    <ListGroup.Item
      className={cx(styles.root, {
        [styles.modBackground ?? ""]: isRelativeOfActiveListItem,
      })}
      as="div"
      active={isActive}
      key={`draft-${modComponentFormState.uuid}`}
      onMouseEnter={
        isButton
          ? async () => showOverlay(modComponentFormState.uuid)
          : undefined
      }
      onMouseLeave={isButton ? async () => hideOverlay() : undefined}
      onClick={async () => {
        reportEvent(Events.PAGE_EDITOR_OPEN, {
          sessionId,
          modComponentId: modComponentFormState.uuid,
        });

        dispatch(actions.setActiveModComponentId(modComponentFormState.uuid));

        if (
          modComponentFormState.starterBrick.definition.type ===
          StarterBrickTypes.SIDEBAR_PANEL
        ) {
          // Switch the sidepanel over to the panel. However, don't refresh because the user might be switching
          // frequently between mod components within the same mod.
          await openSidePanel(inspectedTab.tabId);
          updateSidebar(inspectedTab, {
            modComponentId: modComponentFormState.uuid,
            force: true,
            refresh: false,
          });
        }
      }}
    >
      <span className={cx(styles.icon, styles.nested)}>
        <ModComponentIcon
          type={modComponentFormState.starterBrick.definition.type}
        />
      </span>
      <span className={styles.name}>{getLabel(modComponentFormState)}</span>
      {!isAvailable && (
        <span className={styles.icon}>
          <NotAvailableIcon />
        </span>
      )}
      {isDirty && (
        <span className={cx(styles.icon, styles.unsaved, "text-danger")}>
          <UnsavedChangesIcon />
        </span>
      )}
      {isActive && (
        <DraftModComponentActionMenu
          modComponentFormState={modComponentFormState}
        />
      )}
    </ListGroup.Item>
  );
};

export default DraftModComponentListItem;

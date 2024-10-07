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
import React, { useCallback, useMemo } from "react";
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
  selectModComponentIsDirty,
} from "@/pageEditor/store/editor/editorSelectors";
import ActionMenu from "@/pageEditor/modListingPanel/ActionMenu";
import useClearModComponentChanges from "@/pageEditor/hooks/useClearModComponentChanges";
import {
  useRemoveModComponentFromStorage,
  DEACTIVATE_MOD_MODAL_PROPS,
  DELETE_STANDALONE_MOD_COMPONENT_MODAL_PROPS,
  DELETE_STARTER_BRICK_MODAL_PROPS,
} from "@/pageEditor/hooks/useRemoveModComponentFromStorage";
import { selectIsModComponentSavedOnCloud } from "@/store/modComponents/modComponentSelectors";
import { inspectedTab } from "@/pageEditor/context/connection";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

type DraftModComponentListItemProps = {
  modComponentFormState: ModComponentFormState;
  isAvailable: boolean;
  isNested?: boolean;
};

/**
 * A sidebar menu entry corresponding to a touched mod component
 * @see ActivatedModComponentListItem
 * @see ModComponentListItem
 */
const DraftModComponentListItem: React.FunctionComponent<
  DraftModComponentListItemProps
> = ({ modComponentFormState, isAvailable, isNested = false }) => {
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
  const isSavedOnCloud = useSelector(
    selectIsModComponentSavedOnCloud(modComponentFormState.uuid),
  );
  const removeModComponentFromStorage = useRemoveModComponentFromStorage();
  const isButton =
    modComponentFormState.starterBrick.definition.type ===
    StarterBrickTypes.BUTTON;

  const showOverlay = useCallback(async (uuid: UUID) => {
    await enableOverlay(inspectedTab, `[data-pb-uuid="${uuid}"]`);
  }, []);

  const hideOverlay = useCallback(async () => {
    await disableOverlay(inspectedTab);
  }, []);

  const clearModComponentChanges = useClearModComponentChanges();

  const deleteModComponent = async () =>
    removeModComponentFromStorage({
      modComponentId: modComponentFormState.uuid,
      showConfirmationModal: modId
        ? DELETE_STARTER_BRICK_MODAL_PROPS
        : DELETE_STANDALONE_MOD_COMPONENT_MODAL_PROPS,
    });
  const deactivateModComponent = async () =>
    removeModComponentFromStorage({
      modComponentId: modComponentFormState.uuid,
      showConfirmationModal: DEACTIVATE_MOD_MODAL_PROPS,
    });

  const onSave = useMemo(() => {
    if (modComponentFormState.modMetadata == null) {
      return async () => {
        dispatch(actions.setActiveModComponentId(modComponentFormState.uuid));
        dispatch(actions.showCreateModModal({ keepLocalCopy: false }));
      };
    }

    // eslint-disable-next-line unicorn/no-useless-undefined -- Code clarity, implicit returns are bad
    return undefined;
  }, [dispatch, modComponentFormState.modMetadata, modComponentFormState.uuid]);

  const onClearChanges = async () =>
    clearModComponentChanges({ modComponentId: modComponentFormState.uuid });

  const onDelete = modId || !isSavedOnCloud ? deleteModComponent : undefined;

  const onDeactivate = onDelete ? undefined : deactivateModComponent;

  const onClone = async () => {
    dispatch(actions.cloneActiveModComponent());
  };

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
      <span
        className={cx(styles.icon, {
          [styles.nested ?? ""]: isNested,
        })}
      >
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
      {isDirty &&
        // Don't show the dirty icon and save button at the same time
        !onSave && (
          <span className={cx(styles.icon, styles.unsaved, "text-danger")}>
            <UnsavedChangesIcon />
          </span>
        )}
      <ActionMenu
        isActive={isActive}
        labelRoot={`${getLabel(modComponentFormState)}`}
        onSave={onSave}
        onDelete={onDelete}
        onDeactivate={onDeactivate}
        onClone={onClone}
        onClearChanges={
          modComponentFormState.installed ? onClearChanges : undefined
        }
        isDirty={isDirty}
        onAddToMod={
          modComponentFormState.modMetadata
            ? undefined
            : async () => {
                dispatch(actions.showAddToModModal());
              }
        }
        onRemoveFromMod={
          modComponentFormState.modMetadata
            ? async () => {
                dispatch(actions.showRemoveFromModModal());
              }
            : undefined
        }
      />
    </ListGroup.Item>
  );
};

export default DraftModComponentListItem;

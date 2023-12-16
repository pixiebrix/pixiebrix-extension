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

import styles from "./Entry.module.scss";

import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAsyncState } from "@/hooks/common";
import {
  extensionToFormState,
  selectType,
} from "@/pageEditor/starterBricks/adapter";
import { actions } from "@/pageEditor/slices/editorSlice";
import reportError from "@/telemetry/reportError";
import { ListGroup } from "react-bootstrap";
import {
  NotAvailableIcon,
  ExtensionIcon,
} from "@/pageEditor/sidebar/ExtensionIcons";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { initRecipeOptionsIfNeeded } from "@/pageEditor/starterBricks/base";
import {
  disableOverlay,
  enableOverlay,
  showSidebar,
} from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import cx from "classnames";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import {
  selectActiveElement,
  selectActiveRecipeId,
} from "@/pageEditor/slices/editorSelectors";
import { type UUID } from "@/types/stringTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";

/**
 * A sidebar menu entry corresponding to an untouched mod component
 * @see DynamicModComponentListItem
 */
const ActivatedModComponentListItem: React.FunctionComponent<{
  modComponentBase: ModComponentBase;
  mods: ModDefinition[];
  isAvailable: boolean;
  isNested?: boolean;
}> = ({ modComponentBase, mods, isAvailable, isNested = false }) => {
  const sessionId = useSelector(selectSessionId);
  const dispatch = useDispatch();
  const [type] = useAsyncState(
    async () => selectType(modComponentBase),
    [modComponentBase.extensionPointId],
  );

  const activeRecipeId = useSelector(selectActiveRecipeId);
  const activeElement = useSelector(selectActiveElement);
  const isActive = activeElement?.uuid === modComponentBase.id;
  // Get the selected recipe id, or the recipe id of the selected item
  const recipeId = activeRecipeId ?? activeElement?.recipe?.id;
  // Set the alternate background if this item isn't active, but either its recipe or another item in its recipe is active
  const hasRecipeBackground =
    !isActive && recipeId && modComponentBase._recipe?.id === recipeId;

  const selectHandler = useCallback(
    async (modComponentBase: ModComponentBase) => {
      try {
        reportEvent(Events.PAGE_EDITOR_OPEN, {
          sessionId,
          extensionId: modComponentBase.id,
        });

        const state = await extensionToFormState(modComponentBase);
        initRecipeOptionsIfNeeded(state, mods);

        dispatch(actions.selectInstalled(state));
        dispatch(actions.checkActiveElementAvailability());

        if (type === "actionPanel") {
          // Switch the sidepanel over to the panel. However, don't refresh because the user might be switching
          // frequently between extensions within the same blueprint.
          void showSidebar(thisTab, {
            extensionId: modComponentBase.id,
            force: true,
            refresh: false,
          });
        }
      } catch (error) {
        reportError(error);
        dispatch(actions.adapterError({ uuid: modComponentBase.id, error }));
      }
    },
    [dispatch, sessionId, mods, type],
  );

  const isButton = type === "menuItem";

  const showOverlay = useCallback(async (uuid: UUID) => {
    await enableOverlay(thisTab, `[data-pb-uuid="${uuid}"]`);
  }, []);

  const hideOverlay = useCallback(async () => {
    await disableOverlay(thisTab);
  }, []);

  return (
    <ListGroup.Item
      className={cx(styles.root, {
        [styles.recipeBackground ?? ""]: hasRecipeBackground,
      })}
      action
      active={isActive}
      key={`installed-${modComponentBase.id}`}
      onMouseEnter={
        isButton ? async () => showOverlay(modComponentBase.id) : undefined
      }
      onMouseLeave={isButton ? async () => hideOverlay() : undefined}
      onClick={async () => selectHandler(modComponentBase)}
    >
      <span
        className={cx(styles.icon, {
          [styles.nested ?? ""]: isNested,
        })}
      >
        <ExtensionIcon type={type} />
      </span>
      <span className={styles.name}>
        {modComponentBase.label ?? modComponentBase.id}
      </span>
      {!isAvailable && (
        <span className={styles.icon}>
          <NotAvailableIcon />
        </span>
      )}
    </ListGroup.Item>
  );
};

export default ActivatedModComponentListItem;

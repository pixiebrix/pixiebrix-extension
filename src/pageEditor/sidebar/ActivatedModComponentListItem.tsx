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
import { useDispatch, useSelector } from "react-redux";
import {
  modComponentToFormState,
  selectType,
} from "@/pageEditor/starterBricks/adapter";
import { actions } from "@/pageEditor/slices/editorSlice";
import reportError from "@/telemetry/reportError";
import { ListGroup } from "react-bootstrap";
import {
  ModComponentIcon,
  NotAvailableIcon,
} from "@/pageEditor/sidebar/ModComponentIcons";
import {
  disableOverlay,
  enableOverlay,
  updateSidebar,
} from "@/contentScript/messenger/api";
import { openSidePanel } from "@/utils/sidePanelUtils";
import cx from "classnames";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import {
  selectActiveModComponentFormState,
  selectActiveModId,
} from "@/pageEditor/slices/editorSelectors";
import { type UUID } from "@/types/stringTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { appApi } from "@/data/service/api";
import { emptyModOptionsDefinitionFactory } from "@/utils/modUtils";
import { type Schema } from "@/types/schemaTypes";
import useAsyncState from "@/hooks/useAsyncState";
import { inspectedTab } from "@/pageEditor/context/connection";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

/**
 * A sidebar menu entry corresponding to an untouched mod component
 * @see DraftModComponentListItem
 */
const ActivatedModComponentListItem: React.FunctionComponent<{
  modComponent: ModComponentBase;
  isAvailable: boolean;
  isNested?: boolean;
}> = ({ modComponent, isAvailable, isNested = false }) => {
  const sessionId = useSelector(selectSessionId);
  const dispatch = useDispatch();
  const { data: type } = useAsyncState(
    async () => selectType(modComponent),
    [modComponent.extensionPointId],
  );

  const [getModDefinition] = appApi.endpoints.getModDefinition.useLazyQuery();

  const activeModId = useSelector(selectActiveModId);
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  const isActive = activeModComponentFormState?.uuid === modComponent.id;
  // Get the selected mod id, or the mod id of the selected mod component
  const modId = activeModId ?? activeModComponentFormState?.recipe?.id;
  // Set the alternate background if this item isn't active, but either its mod or another item in its mod is active
  const hasActiveModBackground =
    !isActive && modId && modComponent._recipe?.id === modId;

  const selectHandler = useCallback(
    async (modComponent: ModComponentBase) => {
      try {
        reportEvent(Events.PAGE_EDITOR_OPEN, {
          sessionId,
          extensionId: modComponent.id,
        });

        const modComponentFormState =
          await modComponentToFormState(modComponent);

        // Initialize mod options schema if needed
        if (modComponent._recipe) {
          const { data: modDefinition } = await getModDefinition(
            { modId: modComponent._recipe.id },
            true,
          );
          if (modDefinition) {
            modComponentFormState.optionsDefinition =
              modDefinition.options == null
                ? emptyModOptionsDefinitionFactory()
                : {
                    schema: modDefinition.options.schema.properties
                      ? modDefinition.options.schema
                      : ({
                          type: "object",
                          properties: modDefinition.options.schema,
                        } as Schema),
                    uiSchema: modDefinition.options.uiSchema,
                  };
          }
        }

        dispatch(actions.selectInstalled(modComponentFormState));
        dispatch(actions.checkActiveModComponentAvailability());

        if (type === "actionPanel") {
          // Switch the sidepanel over to the panel. However, don't refresh because the user might be switching
          // frequently between mod components within the same mod.
          await openSidePanel(inspectedTab.tabId);
          updateSidebar(inspectedTab, {
            extensionId: modComponent.id,
            force: true,
            refresh: false,
          });
        }
      } catch (error) {
        reportError(error);
        dispatch(actions.adapterError({ uuid: modComponent.id, error }));
      }
    },
    [sessionId, dispatch, type, getModDefinition],
  );

  const isButton = type === StarterBrickTypes.BUTTON;

  const showOverlay = useCallback(async (uuid: UUID) => {
    await enableOverlay(inspectedTab, `[data-pb-uuid="${uuid}"]`);
  }, []);

  const hideOverlay = useCallback(async () => {
    await disableOverlay(inspectedTab);
  }, []);

  return (
    <ListGroup.Item
      className={cx(styles.root, {
        [styles.modBackground ?? ""]: hasActiveModBackground,
      })}
      action
      active={isActive}
      key={`installed-${modComponent.id}`}
      onMouseEnter={
        isButton ? async () => showOverlay(modComponent.id) : undefined
      }
      onMouseLeave={isButton ? async () => hideOverlay() : undefined}
      onClick={async () => selectHandler(modComponent)}
    >
      <span
        className={cx(styles.icon, {
          [styles.nested ?? ""]: isNested,
        })}
      >
        {type ? <ModComponentIcon type={type} /> : null}
      </span>
      <span className={styles.name}>
        {modComponent.label ?? modComponent.id}
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

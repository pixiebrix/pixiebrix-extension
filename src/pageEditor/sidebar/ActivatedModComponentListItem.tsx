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
  ExtensionIcon,
  NotAvailableIcon,
} from "@/pageEditor/sidebar/ExtensionIcons";
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
import { appApi } from "@/services/api";
import { emptyModOptionsDefinitionFactory } from "@/utils/modUtils";
import { type Schema } from "@/types/schemaTypes";

/**
 * A sidebar menu entry corresponding to an untouched mod component
 * @see DynamicModComponentListItem
 */
const ActivatedModComponentListItem: React.FunctionComponent<{
  modComponent: ModComponentBase;
  isAvailable: boolean;
  isNested?: boolean;
}> = ({ modComponent, isAvailable, isNested = false }) => {
  const sessionId = useSelector(selectSessionId);
  const dispatch = useDispatch();
  const [type] = useAsyncState(
    async () => selectType(modComponent),
    [modComponent.extensionPointId],
  );

  const [getModDefinition] = appApi.endpoints.getRecipe.useLazyQuery();

  const activeModId = useSelector(selectActiveRecipeId);
  const activeElement = useSelector(selectActiveElement);
  const isActive = activeElement?.uuid === modComponent.id;
  // Get the selected recipe id, or the recipe id of the selected item
  const recipeId = activeModId ?? activeElement?.recipe?.id;
  // Set the alternate background if this item isn't active, but either its recipe or another item in its recipe is active
  const hasRecipeBackground =
    !isActive && recipeId && modComponent._recipe?.id === recipeId;

  const selectHandler = useCallback(
    async (extension: ModComponentBase) => {
      try {
        reportEvent(Events.PAGE_EDITOR_OPEN, {
          sessionId,
          extensionId: extension.id,
        });

        const state = await extensionToFormState(extension);

        // Initialize mod options schema if needed
        if (extension._recipe) {
          const { data: modDefinition } = await getModDefinition(
            { recipeId: extension._recipe.id },
            true,
          );
          if (modDefinition) {
            state.optionsDefinition =
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

        dispatch(actions.selectInstalled(state));
        dispatch(actions.checkActiveElementAvailability());

        if (type === "actionPanel") {
          // Switch the sidepanel over to the panel. However, don't refresh because the user might be switching
          // frequently between extensions within the same blueprint.
          void showSidebar(thisTab, {
            extensionId: extension.id,
            force: true,
            refresh: false,
          });
        }
      } catch (error) {
        reportError(error);
        dispatch(actions.adapterError({ uuid: extension.id, error }));
      }
    },
    [sessionId, dispatch, type, getModDefinition],
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
        <ExtensionIcon type={type} />
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

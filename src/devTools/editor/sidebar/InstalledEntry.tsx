/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { IExtension, UUID } from "@/core";
import { useDispatch } from "react-redux";
import { useAsyncState } from "@/hooks/common";
import {
  extensionToFormState,
  selectType,
} from "@/devTools/editor/extensionPoints/adapter";
import { actions } from "@/devTools/editor/slices/editorSlice";
import reportError from "@/telemetry/reportError";
import { ListGroup } from "react-bootstrap";
import {
  NotAvailableIcon,
  ExtensionIcon,
} from "@/devTools/editor/sidebar/ExtensionIcons";
import { RecipeDefinition } from "@/types/definitions";
import { initRecipeOptionsIfNeeded } from "@/devTools/editor/extensionPoints/base";
import {
  disableOverlay,
  enableOverlay,
  removeExtension,
} from "@/contentScript/messenger/api";
import { thisTab } from "@/devTools/utils";
import { resolveDefinitions } from "@/registry/internal";

/**
 * A sidebar menu entry corresponding to an installed/saved extension point
 * @see DynamicEntry
 */
const InstalledEntry: React.FunctionComponent<{
  extension: IExtension;
  recipes: RecipeDefinition[];
  active: boolean;
  available: boolean;
  isNested?: boolean;
}> = ({ extension, recipes, available, active, isNested = false }) => {
  const dispatch = useDispatch();
  const [type] = useAsyncState(async () => selectType(extension), [
    extension.extensionPointId,
  ]);

  const selectHandler = useCallback(
    async (extension: IExtension) => {
      try {
        // Remove the extension so that we don't get double-actions when editing a trigger.
        // At this point the extensionPointId can be a
        const resolved = await resolveDefinitions(extension);
        removeExtension(thisTab, resolved.extensionPointId, resolved.id);

        const state = await extensionToFormState(extension);
        initRecipeOptionsIfNeeded(state, recipes);

        // FIXME: is where we need to uninstall the extension because it will now be a dynamic element? Or should it
        //  be getting handled by lifecycle.ts? Need to add some logging to figure out how other ones work
        dispatch(actions.selectInstalled(state));
      } catch (error) {
        reportError(error);
        dispatch(actions.adapterError({ uuid: extension.id, error }));
      }
    },
    [dispatch, recipes]
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
      className={styles.root}
      action
      active={active}
      key={`installed-${extension.id}`}
      onMouseEnter={
        isButton ? async () => showOverlay(extension.id) : undefined
      }
      onMouseLeave={isButton ? async () => hideOverlay() : undefined}
      onClick={async () => selectHandler(extension)}
    >
      {isNested && <span className={styles.space} />}
      <span className={styles.icon}>
        <ExtensionIcon type={type} />
      </span>
      <span className={styles.name}>{extension.label ?? extension.id}</span>
      {!available && (
        <span className={styles.icon}>
          <NotAvailableIcon />
        </span>
      )}
    </ListGroup.Item>
  );
};

export default InstalledEntry;

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
import { actions } from "@/pageEditor/slices/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { ListGroup } from "react-bootstrap";
import { getLabel } from "@/pageEditor/sidebar/common";
import {
  ExtensionIcon,
  NotAvailableIcon,
  UnsavedChangesIcon,
} from "@/pageEditor/sidebar/ExtensionIcons";
import { UUID } from "@/core";
import {
  disableOverlay,
  enableOverlay,
  showSidebar,
} from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import cx from "classnames";
import { reportEvent } from "@/telemetry/events";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import {
  selectActiveElement,
  selectActiveRecipeId,
  selectElementIsDirty,
} from "@/pageEditor/slices/editorSelectors";
import ActionMenu from "@/components/sidebar/ActionMenu";
import useSaveExtension from "@/pageEditor/hooks/useSaveExtension";
import useResetExtension from "@/pageEditor/hooks/useResetExtension";
import useRemoveExtension from "@/pageEditor/hooks/useRemoveExtension";
import useSaveRecipe from "@/pageEditor/hooks/useSaveRecipe";
import { cloneActiveExtension } from "@/pageEditor/slices/editorThunks";

type DynamicEntryProps = {
  extension: FormState;
  isAvailable: boolean;
  isNested?: boolean;
};

/**
 * A sidebar menu entry corresponding to an extension that is new or is currently being edited.
 * @see InstalledEntry
 */
const DynamicEntry: React.FunctionComponent<DynamicEntryProps> = ({
  extension,
  isAvailable,
  isNested = false,
}) => {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const activeRecipeId = useSelector(selectActiveRecipeId);
  const activeElement = useSelector(selectActiveElement);
  const isActive = activeElement?.uuid === extension.uuid;
  // Get the selected recipe id, or the recipe id of the selected item
  const recipeId = activeRecipeId ?? activeElement?.recipe?.id;
  // Set the alternate background if this item isn't active, but either its recipe or another item in its recipe is active
  const hasRecipeBackground =
    !isActive && recipeId && extension.recipe?.id === recipeId;
  const isDirty = useSelector(selectElementIsDirty(extension.uuid));

  const isButton = extension.type === "menuItem";

  const showOverlay = useCallback(async (uuid: UUID) => {
    await enableOverlay(thisTab, `[data-pb-uuid="${uuid}"]`);
  }, []);

  const hideOverlay = useCallback(async () => {
    await disableOverlay(thisTab);
  }, []);

  const { save: saveExtension, isSaving: isSavingExtension } =
    useSaveExtension();
  const resetExtension = useResetExtension();
  const removeExtension = useRemoveExtension();
  const { save: saveRecipe, isSaving: isSavingRecipe } = useSaveRecipe();

  const onSave = async () => {
    if (extension.recipe) {
      await saveRecipe(extension.recipe?.id);
    } else {
      await saveExtension(extension);
    }
  };

  const isSaving = extension.recipe ? isSavingRecipe : isSavingExtension;

  const onReset = async () => resetExtension({ extensionId: extension.uuid });

  const onRemove = async () => removeExtension({ extensionId: extension.uuid });

  const onClone = async () => {
    dispatch(cloneActiveExtension());
  };

  return (
    <ListGroup.Item
      className={cx(styles.root, {
        [styles.recipeBackground]: hasRecipeBackground,
      })}
      as="div"
      active={isActive}
      key={`dynamic-${extension.uuid}`}
      onMouseEnter={
        isButton ? async () => showOverlay(extension.uuid) : undefined
      }
      onMouseLeave={isButton ? async () => hideOverlay() : undefined}
      onClick={() => {
        reportEvent("PageEditorOpen", {
          sessionId,
          extensionId: extension.uuid,
        });

        dispatch(actions.selectElement(extension.uuid));

        if (extension.type === "actionPanel") {
          // Switch the sidepanel over to the panel. However, don't refresh because the user might be switching
          // frequently between extensions within the same blueprint.
          void showSidebar(thisTab, {
            extensionId: extension.uuid,
            force: true,
            refresh: false,
          });
        }
      }}
    >
      <span
        className={cx(styles.icon, {
          [styles.nested]: isNested,
        })}
      >
        <ExtensionIcon type={extension.type} />
      </span>
      <span className={styles.name}>{getLabel(extension)}</span>
      {!isAvailable && (
        <span className={styles.icon}>
          <NotAvailableIcon />
        </span>
      )}
      {isDirty && !isActive && (
        <span className={cx(styles.icon, styles.unsaved, "text-danger")}>
          <UnsavedChangesIcon />
        </span>
      )}
      {isActive && (
        <ActionMenu
          onSave={onSave}
          onRemove={onRemove}
          onClone={onClone}
          onReset={extension.installed ? onReset : undefined}
          isDirty={isDirty}
          onAddToRecipe={
            extension.recipe
              ? undefined
              : async () => {
                  dispatch(actions.showAddToRecipeModal());
                }
          }
          onRemoveFromRecipe={
            extension.recipe
              ? async () => {
                  dispatch(actions.showRemoveFromRecipeModal());
                }
              : undefined
          }
          disabled={isSaving}
        />
      )}
    </ListGroup.Item>
  );
};

export default DynamicEntry;

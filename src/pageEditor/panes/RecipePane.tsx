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

import styles from "./RecipePane.module.scss";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveRecipe } from "@/pageEditor/slices/editorSelectors";
import { Alert } from "react-bootstrap";
import { RecipeDefinition } from "@/types/definitions";
import Centered from "@/pageEditor/components/Centered";
import EditorTabLayout, {
  ActionButton,
  TabItem,
} from "@/components/tabLayout/EditorTabLayout";
import {
  faHistory,
  faQuestionCircle,
  faSave,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import AskQuestionModal from "@/pageEditor/askQuestion/AskQuestionModal";
import useRecipeSaver from "@/pageEditor/panes/save/useRecipeSaver";
import useResetRecipe from "@/pageEditor/hooks/useResetRecipe";
import useRemoveRecipe from "@/pageEditor/hooks/useRemoveRecipe";
import Logs from "@/pageEditor/tabs/Logs";
import EditRecipe from "@/pageEditor/tabs/editRecipeTab/EditRecipe";
import { MessageContext } from "@/core";
import { logActions } from "@/components/logViewer/logSlice";
import useLogsBadgeState from "@/pageEditor/editor/tabs/logs/useLogsBadgeState";
import RecipeOptions from "@/pageEditor/editor/tabs/RecipeOptions";

const EDIT_ITEM_NAME = "Edit";

const RecipePane: React.FC<{ recipe: RecipeDefinition }> = () => {
  const recipe = useSelector(selectActiveRecipe);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [saveRecipe, isSavingRecipe] = useRecipeSaver();
  const resetRecipe = useResetRecipe(recipe);
  const removeRecipe = useRemoveRecipe(recipe);

  const dispatch = useDispatch();
  useEffect(() => {
    const messageContext: MessageContext = {
      blueprintId: recipe.metadata.id,
    };
    dispatch(logActions.setContext(messageContext));
  }, [dispatch, recipe.metadata.id]);

  const [unreadLogsCount, logsBadgeVariant] = useLogsBadgeState();

  const tabItems: TabItem[] = [
    {
      itemName: EDIT_ITEM_NAME,
      TabContent: EditRecipe,
    },
    {
      itemName: "Blueprint Options",
      TabContent: RecipeOptions,
    },
    {
      itemName: "Logs",
      badgeCount: unreadLogsCount,
      badgeVariant: logsBadgeVariant,
      TabContent: Logs,
      mountWhenActive: true,
    },
  ];

  const buttons = useMemo<ActionButton[]>(() => {
    const results: ActionButton[] = [];

    results.push(
      {
        // Ask a question
        variant: "info",
        onClick: () => {
          setShowQuestionModal(true);
        },
        caption: "Ask a question",
        icon: faQuestionCircle,
      },
      {
        // Save
        variant: "primary",
        onClick: saveRecipe,
        caption: "Save",
        disabled: isSavingRecipe,
        icon: faSave,
      },
      {
        // Reset
        variant: "warning",
        onClick: resetRecipe,
        caption: "Reset",
        disabled: isSavingRecipe,
        icon: faHistory,
      },
      {
        // Remove
        variant: "danger",
        onClick: removeRecipe,
        caption: "Remove",
        icon: faTrash,
      }
    );

    return results;
  }, [isSavingRecipe, removeRecipe, resetRecipe, saveRecipe]);

  if (!recipe) {
    return (
      <Centered>
        <Alert variant="danger">Recipe not found</Alert>
      </Centered>
    );
  }

  return (
    <div className={styles.root}>
      <EditorTabLayout
        items={tabItems}
        actionButtons={buttons}
        defaultItemName={EDIT_ITEM_NAME}
      />
      <AskQuestionModal
        showModal={showQuestionModal}
        setShowModal={setShowQuestionModal}
      />
    </div>
  );
};

export default RecipePane;

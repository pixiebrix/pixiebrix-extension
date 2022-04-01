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
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveRecipeId,
  selectRecipeIsDirty,
} from "@/pageEditor/slices/editorSelectors";
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
import useRemoveRecipe from "@/pageEditor/hooks/useRemoveRecipe";
import Logs from "@/pageEditor/tabs/Logs";
import EditRecipe from "@/pageEditor/tabs/editRecipeTab/EditRecipe";
import { MessageContext } from "@/core";
import { logActions } from "@/components/logViewer/logSlice";
import useLogsBadgeState from "@/pageEditor/tabs/logs/useLogsBadgeState";
import RecipeOptions from "@/pageEditor/tabs/RecipeOptions";
import { useGetRecipesQuery } from "@/services/api";
import { useModals } from "@/components/ConfirmationModal";
import { actions } from "@/pageEditor/slices/editorSlice";

const RecipePane: React.FC<{ recipe: RecipeDefinition }> = () => {
  const { data: recipes } = useGetRecipesQuery();
  const activeRecipeId = useSelector(selectActiveRecipeId);
  const recipe = recipes.find(
    (recipe) => recipe.metadata.id === activeRecipeId
  );
  const isRecipeDirty = useSelector(selectRecipeIsDirty(activeRecipeId));
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // We need to force the component to re-render when the recipe is reset
  // from the action button, or when a different recipe is selected, so
  // we'll use a key prop on the tab layout that is composed of a useState()
  // variable counter that we can increment manually, and the recipeId.
  const [layoutCounter, setLayoutCounter] = useState(0);
  const layoutKey = `${activeRecipeId}-${layoutCounter}`;
  const forceRefreshLayout = () => {
    setLayoutCounter(layoutCounter + 1);
  };

  const { save: saveRecipe, isSaving: isSavingRecipe } = useRecipeSaver();
  const { showConfirmation } = useModals();
  const dispatch = useDispatch();

  async function resetRecipe() {
    const confirmed = await showConfirmation({
      title: "Reset Blueprint?",
      message:
        "Unsaved changes to extensions within this blueprint, or to blueprint options, will be lost",
      submitCaption: "Reset",
    });
    if (!confirmed) {
      return;
    }

    dispatch(actions.resetRecipeMetadataAndOptions(recipe.metadata.id));
    forceRefreshLayout();
  }

  const removeRecipe = useRemoveRecipe();

  useEffect(() => {
    const messageContext: MessageContext = {
      blueprintId: recipe.metadata.id,
    };
    dispatch(logActions.setContext(messageContext));
  }, [dispatch, recipe.metadata.id]);

  const [unreadLogsCount, logsBadgeVariant] = useLogsBadgeState();

  const tabItems: TabItem[] = [
    {
      name: "Edit",
      TabContent: EditRecipe,
    },
    {
      name: "Blueprint Options",
      TabContent: RecipeOptions,
    },
    {
      name: "Logs",
      badgeCount: unreadLogsCount,
      badgeVariant: logsBadgeVariant,
      TabContent: Logs,
      mountWhenActive: true,
    },
  ];

  const buttons: ActionButton[] = [
    {
      // Ask a question
      variant: "info",
      onClick() {
        setShowQuestionModal(true);
      },
      caption: "Ask a question",
      icon: faQuestionCircle,
    },
    {
      // Save
      variant: "primary",
      onClick() {
        // Recipe saver has internal error handling, so we can fire-and-forget here
        void saveRecipe(activeRecipeId);
      },
      caption: "Save",
      disabled: isSavingRecipe || !isRecipeDirty,
      icon: faSave,
    },
    {
      // Reset
      variant: "warning",
      onClick: resetRecipe,
      caption: "Reset",
      disabled: isSavingRecipe || !isRecipeDirty,
      icon: faHistory,
    },
    {
      // Remove
      variant: "danger",
      onClick() {
        removeRecipe(recipe);
      },
      caption: "Remove",
      icon: faTrash,
    },
  ];

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
        key={layoutKey}
        tabs={tabItems}
        actionButtons={buttons}
      />
      <AskQuestionModal
        showModal={showQuestionModal}
        setShowModal={setShowQuestionModal}
      />
    </div>
  );
};

export default RecipePane;

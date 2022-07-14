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

import { ActionButton } from "@/components/tabLayout/EditorTabLayout";
import useRemoveExtension from "@/pageEditor/hooks/useRemoveExtension";
import useRemoveRecipe from "@/pageEditor/hooks/useRemoveRecipe";
import useResetExtension from "@/pageEditor/hooks/useResetExtension";
import useResetRecipe from "@/pageEditor/hooks/useResetRecipe";
import { selectActiveElement } from "@/pageEditor/slices/editorSelectors";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { reportEvent } from "@/telemetry/events";
import {
  faQuestionCircle,
  faSave,
  faHistory,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import useRecipeSaver from "../save/useRecipeSaver";
import useSavingWizard from "../save/useSavingWizard";

function useActions(showQuestionModal: () => void) {
  const element = useSelector(selectActiveElement);
  const sessionId = useSelector(selectSessionId);

  const { isSaving: isSavingElement, save: saveElement } = useSavingWizard();
  const { isSaving: isSavingRecipe, save: saveRecipe } = useRecipeSaver();
  const isSaving = isSavingRecipe || isSavingElement;

  const removeExtension = useRemoveExtension();
  const removeRecipe = useRemoveRecipe();
  const resetExtension = useResetExtension();
  const resetRecipe = useResetRecipe();

  // Although async, doesn't have to be awaited and can be used as click handler
  const onSave = async () => {
    try {
      if (element.recipe) {
        await saveRecipe(element.recipe.id);
      } else {
        await saveElement();
      }

      reportEvent("PageEditorSave", {
        sessionId,
        extensionId: element.uuid,
      });
    } catch (error) {
      // TODO status is a Formik thing, not available here
      // setStatus(error);
      console.error("Error saving element", error);
    }
  };

  // Although async, doesn't have to be awaited and can be used as click handler
  const onReset = async () => {
    if (element.recipe) {
      await resetRecipe(element.recipe.id);
    } else {
      await resetExtension({ element });
    }
  };

  // Although async, doesn't have to be awaited and can be used as click handler
  const onRemove = async () => {
    if (element.recipe) {
      await removeRecipe({ recipeId: element.recipe.id });
    } else {
      await removeExtension({ extensionId: element.uuid });
    }
  };

  const buttons: ActionButton[] = [
    {
      // Ask a question
      variant: "info",
      onClick: showQuestionModal,
      caption: "Ask a question",
      icon: faQuestionCircle,
    },
    {
      // Save
      variant: "primary",
      onClick: onSave,
      caption: "Save",
      disabled: isSaving,
      icon: faSave,
    },
    {
      // Reset
      variant: "warning",
      onClick: onReset,
      caption: "Reset",
      disabled: isSaving,
      icon: faHistory,
    },
    {
      // Remove
      variant: "danger",
      onClick: onRemove,
      caption: "Remove",
      icon: faTrash,
    },
  ];

  return buttons;
}

export default useActions;

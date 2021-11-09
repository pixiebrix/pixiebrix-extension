/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { actions as savingExtensionActions } from "./savingExtensionSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  selectIsWizardOpen,
  selectSavingExtensionId,
} from "./savingExtensionSelectors";
import { selectActiveElement } from "@/devTools/editor/slices/editorSelectors";
import useCreate from "@/devTools/editor/hooks/useCreate";
import Deferred from "@/utils/deferred";
import {
  actions as editorActions,
  FormState,
} from "@/devTools/editor/slices/editorSlice";
import { uuidv4 } from "@/types/helpers";
import useReset from "@/devTools/editor/hooks/useReset";

let savingDeferred: Deferred;

const useSavingWizard = () => {
  const dispatch = useDispatch();
  const create = useCreate();
  const reset = useReset();
  const isWizardOpen = useSelector(selectIsWizardOpen);
  const savingExtensionId = useSelector(selectSavingExtensionId);
  const element = useSelector(selectActiveElement);

  const save = async () => {
    if (!element.recipe) {
      saveNonRecipeElement();
    }

    savingDeferred = new Deferred();

    dispatch(savingExtensionActions.setWizardOpen(true));
    return savingDeferred.promise;
  };

  /**
   * Saves an extension that is not a part of a Recipe
   */
  const saveNonRecipeElement = () => {
    dispatch(savingExtensionActions.setSavingExtension(element.uuid));
    void create(element, closeWizard);
  };

  /**
   * Creating personal extension from the existing one
   * It will not be a part of the Recipe
   */
  const saveElementAsPersonalExtension = () => {
    const newExtensionUuid = uuidv4();
    dispatch(savingExtensionActions.setSavingExtension(newExtensionUuid));

    const { recipe, ...rest } = element;
    const personalElement: FormState = {
      ...rest,
      uuid: newExtensionUuid,
      // Detach from the recipe
      recipe: undefined,
    };

    dispatch(editorActions.addElement(personalElement));
    reset({ element, shouldShowConfirmation: false });
    void create(element, closeWizard);
  };

  const closeWizard = (errorMessage?: string | null) => {
    dispatch(savingExtensionActions.setWizardOpen(false));
    dispatch(savingExtensionActions.setSavingExtension(null));

    if (savingDeferred) {
      if (errorMessage) {
        savingDeferred.reject(errorMessage);
      } else {
        savingDeferred.resolve();
      }

      savingDeferred = null;
    }
  };

  return {
    isWizardOpen,
    savingExtensionId,
    element,
    save,
    saveElementAsPersonalExtension,
    closeWizard,
  };
};

export default useSavingWizard;

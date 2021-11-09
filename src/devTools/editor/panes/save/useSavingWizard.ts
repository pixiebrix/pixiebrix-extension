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
import { useCreate } from "@/devTools/editor/hooks/useCreate";
import Deferred from "@/utils/deferred";

let savingDeferred: Deferred;

const useSavingWizard = () => {
  const dispatch = useDispatch();
  const create = useCreate();
  const isWizardOpen = useSelector(selectIsWizardOpen);
  const savingExtensionId = useSelector(selectSavingExtensionId);
  const element = useSelector(selectActiveElement);

  const saveElement = async () => {
    dispatch(savingExtensionActions.setWizardOpen(true));

    if (!element.recipe) {
      dispatch(savingExtensionActions.setSavingExtension(element.uuid));
      void create(element, closeWizard);
    }

    savingDeferred = new Deferred();

    return savingDeferred.promise;
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
    saveElement,
    closeWizard,
  };
};

export default useSavingWizard;

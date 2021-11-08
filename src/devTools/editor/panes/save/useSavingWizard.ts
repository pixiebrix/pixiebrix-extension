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

let savingPromise: Promise<void>;
let resolveSavingPromise: () => void;
let rejectSavingPromise: (error: string) => void;

const useSavingWizard = () => {
  const dispatch = useDispatch();
  const create = useCreate();
  const isWizardOpen = useSelector(selectIsWizardOpen);
  const savingExtensionId = useSelector(selectSavingExtensionId);
  const element = useSelector(selectActiveElement);

  const saveElement = async () => {
    if (!element.recipe) {
      dispatch(savingExtensionActions.setSavingExtension(element.uuid));
      return new Promise<void>((resolve, reject) => {
        void create(element, (errorMessage) => {
          closeWizard();
          if (errorMessage) {
            reject(errorMessage);
          } else {
            resolve();
          }
        });
      });
    }

    savingPromise = new Promise((resolve, reject) => {
      resolveSavingPromise = resolve;
      rejectSavingPromise = reject;
    });

    dispatch(savingExtensionActions.setWizardOpen(true));

    return savingPromise;
  };

  const closeWizard = (errorMessage?: string | null) => {
    dispatch(savingExtensionActions.setWizardOpen(false));
    dispatch(savingExtensionActions.setSavingExtension(null));

    if (errorMessage) {
      if (rejectSavingPromise) {
        rejectSavingPromise(errorMessage);
      }
    } else if (resolveSavingPromise) {
      resolveSavingPromise();
    }

    savingPromise = null;
    resolveSavingPromise = null;
    rejectSavingPromise = null;
  };

  return {
    isWizardOpen,
    savingExtensionId,
    saveElement,
    closeWizard,
  };
};

export default useSavingWizard;

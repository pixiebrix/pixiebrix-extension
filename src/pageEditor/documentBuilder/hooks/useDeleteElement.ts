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

import { getIn, useFormikContext } from "formik";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import getElementCollectionName from "@/pageEditor/documentBuilder/edit/getElementCollectionName";
import { produce } from "immer";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/integrations/integrationDependencyFieldUtils";
import { useCallback } from "react";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { useDispatch } from "react-redux";

function useDeleteElement(documentBodyName: string) {
  const { values: formState, setValues: setFormState } =
    useFormikContext<ModComponentFormState>();

  const dispatch = useDispatch();

  return useCallback(
    async (elementName: string) => {
      dispatch(editorActions.setActiveBuilderPreviewElement(null));

      const { collectionName, elementIndex } = getElementCollectionName(
        [documentBodyName, elementName].join("."),
      );

      // Remove the element from the form state
      let nextState = produce(formState, (draft) => {
        const elementsCollection = getIn(draft, collectionName) as unknown[];
        elementsCollection.splice(Number(elementIndex), 1);
      });

      // If the element used a service, remove the service link as well
      nextState = produceExcludeUnusedDependencies(nextState);

      await setFormState(nextState);
    },
    [setFormState, formState, dispatch, documentBodyName],
  );
}

export default useDeleteElement;

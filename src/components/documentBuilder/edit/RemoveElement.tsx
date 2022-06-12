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

import { getIn, useFormikContext } from "formik";
import React from "react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import getElementCollectionName from "./getElementCollectionName";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/serviceFieldUtils";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { produce } from "immer";

type RemoveElementProps = {
  elementName: string;
  resetActiveElement: () => void;
};

const RemoveElement: React.FC<RemoveElementProps> = ({
  elementName,
  resetActiveElement,
}) => {
  const { values: formState, setValues: setFormState } =
    useFormikContext<FormState>();

  // Gives the name of the element's collection
  // In case of a list item element point to the collection of the list element,
  // i.e. removing the item of the list will actually remove the list itself.
  const { collectionName, elementIndex } =
    getElementCollectionName(elementName);

  const removeElement = () => {
    resetActiveElement();

    // Remove the element from the form state
    let nextState = produce(formState, (draft) => {
      const elementsCollection = getIn(draft, collectionName);
      elementsCollection.splice(Number(elementIndex), 1);
    });

    // If the element used a service, remove the service link as well
    nextState = produceExcludeUnusedDependencies(nextState);

    setFormState(nextState);
  };

  return (
    <Button onClick={removeElement} variant="danger" size="sm">
      <FontAwesomeIcon icon={faTrash} /> Remove element
    </Button>
  );
};

export default RemoveElement;

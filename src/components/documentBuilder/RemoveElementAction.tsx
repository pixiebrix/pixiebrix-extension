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

import { useField } from "formik";
import React from "react";
import { Button } from "react-bootstrap";
import { DocumentElement } from "./documentBuilderTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { getElementCollectionName } from "./documentBuilderHelpers";

type RemoveElementActionProps = {
  elementName: string;
};

const RemoveElementAction: React.FC<RemoveElementActionProps> = ({
  elementName,
}) => {
  const { collectionName, elementIndex } = getElementCollectionName(
    elementName
  );

  const [{ value: elementsCollection }, , { setValue }] = useField<
    DocumentElement[]
  >(collectionName);

  const removeElement = () => {
    const newElementsCollection = [...elementsCollection];
    newElementsCollection.splice(Number(elementIndex), 1);
    setValue(newElementsCollection);
  };

  return (
    <Button onClick={removeElement} variant="danger" size="sm">
      <FontAwesomeIcon icon={faTrash} /> Remove element
    </Button>
  );
};

export default RemoveElementAction;

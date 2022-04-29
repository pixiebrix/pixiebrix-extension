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

import { useField } from "formik";
import React from "react";
import FieldTemplate from "@/components/form/FieldTemplate";
import getElementCollectionName from "./getElementCollectionName";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import LayoutWidget from "@/components/LayoutWidget";

type MoveElementProps = {
  name: string;
  activeElement: string;
  setActiveElement: (activeElement: string) => void;
};

const MoveElement: React.FC<MoveElementProps> = ({
  name,
  activeElement,
  setActiveElement,
}) => {
  const { collectionName, elementIndex } =
    getElementCollectionName(activeElement);

  const fullCollectionName = `${name}.${collectionName}`;
  const [{ value: elementsCollection }, , { setValue }] =
    useField<DocumentElement[]>(fullCollectionName);

  const canMoveUp = elementIndex > 0;
  const canMoveDown = elementIndex < elementsCollection.length - 1;

  const moveElement = (direction: "up" | "down") => {
    const newElementsCollection = [...elementsCollection];
    const toIndex = direction === "up" ? elementIndex - 1 : elementIndex + 1;
    // eslint-disable-next-line security/detect-object-injection
    [newElementsCollection[elementIndex], newElementsCollection[toIndex]] = [
      newElementsCollection[toIndex],
      newElementsCollection[elementIndex],
    ];
    setValue(newElementsCollection);
    setActiveElement(`${collectionName}.${toIndex}`);
  };

  return (
    (canMoveUp || canMoveDown) && (
      <FieldTemplate
        name="layoutButtons"
        label="Element Order"
        as={LayoutWidget}
        canMoveUp={canMoveUp}
        moveUp={() => {
          moveElement("up");
        }}
        canMoveDown={canMoveDown}
        moveDown={() => {
          moveElement("down");
        }}
      />
    )
  );
};

export default MoveElement;

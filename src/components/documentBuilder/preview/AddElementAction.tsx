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
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import {
  DocumentElement,
  DocumentElementType,
  DOCUMENT_ELEMENT_TYPES,
} from "@/components/documentBuilder/documentBuilderTypes";
import styles from "./AddElementAction.module.scss";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";

type AddElementActionProps = {
  elementsCollectionName: string;
  allowedTypes?: DocumentElementType[];
  className?: string;
  menuBoundary?: Element;
};

const AddElementAction: React.FC<AddElementActionProps> = ({
  elementsCollectionName,
  allowedTypes = DOCUMENT_ELEMENT_TYPES,
  className,
  menuBoundary,
}) => {
  const [{ value: elementsCollection }, , { setValue }] = useField<
    DocumentElement[]
  >(elementsCollectionName);

  const addElement = (elementType: DocumentElementType) => {
    const element = createNewElement(elementType);
    setValue([...elementsCollection, element]);
  };

  return (
    <EllipsisMenu
      className={className}
      toggleClassName={styles.toggle}
      items={allowedTypes.map((elementType) => ({
        title: elementTypeLabels[elementType],
        action() {
          addElement(elementType);
        },
      }))}
      menuBoundary={menuBoundary}
    />
  );
};

export default AddElementAction;

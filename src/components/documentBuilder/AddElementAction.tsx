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
import { Dropdown, DropdownButton } from "react-bootstrap";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import {
  DocumentElement,
  DocumentElementType,
  DOCUMENT_ELEMENT_TYPES,
} from "./documentBuilderTypes";
import styles from "./AddElementAction.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type AddElementActionProps = {
  elementsCollectionName: string;
  allowedTypes?: DocumentElementType[];
  className?: string;
  as: "button" | "ellipsis";
};

const addButtonTitle = (
  <>
    <FontAwesomeIcon icon={faPlus} /> Add new field
  </>
);

const AddElementAction: React.FC<AddElementActionProps> = ({
  elementsCollectionName,
  allowedTypes = DOCUMENT_ELEMENT_TYPES,
  className,
  as,
}) => {
  const [{ value: elementsCollection }, , { setValue }] = useField<
    DocumentElement[]
  >(elementsCollectionName);

  const addElement = (elementType: DocumentElementType) => {
    const element: DocumentElement = {
      type: elementType,
      config: {},
    };

    switch (elementType) {
      case "header_1":
      case "header_2":
      case "header_3":
        element.config.title = "Header";
        break;

      case "text":
        element.config.text = "Paragraph text.";
        break;

      case "container":
      case "row":
      case "column":
        element.children = [];
        break;

      case "card":
        element.config.heading = "Header";
        element.children = [];
        break;

      case "block":
        element.config.pipeline = "!pipeline";
        break;

      case "button":
        element.config.title = "Click me";
        break;

      default:
        throw new Error(
          `Can't create new element. Type "${elementType} is not supported.`
        );
    }

    setValue([...elementsCollection, element]);
  };

  return as === "ellipsis" ? (
    <EllipsisMenu
      className={className}
      toggleClassName={styles.toggle}
      items={allowedTypes.map((elementType) => ({
        title: elementType,
        action: () => {
          addElement(elementType);
        },
      }))}
    />
  ) : (
    <DropdownButton
      title={addButtonTitle}
      className={className}
      variant="primary"
      size="sm"
    >
      {allowedTypes.map((elementType) => (
        <Dropdown.Item
          key={elementType}
          onClick={() => {
            addElement(elementType);
          }}
        >
          {elementType}
        </Dropdown.Item>
      ))}
    </DropdownButton>
  );
};

export default AddElementAction;

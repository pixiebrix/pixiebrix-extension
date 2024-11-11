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

import React, { type ChangeEventHandler } from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import KeyNameWidget from "@/components/form/widgets/KeyNameWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { getAllowedChildTypes } from "@/pageEditor/documentBuilder/allowedElementTypes";
import documentBuilderElementTypeLabels from "@/pageEditor/documentBuilder/elementTypeLabels";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import {
  type DocumentBuilderElementType,
  type ListElement,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { produce } from "immer";
import { createNewDocumentBuilderElement } from "@/pageEditor/documentBuilder/createNewDocumentBuilderElement";
import { useField } from "formik";
import { joinName } from "@/utils/formUtils";

type ListOptionsProps = {
  elementName: string;
};

const ListOptions: React.FC<ListOptionsProps> = ({ elementName }) => {
  const [{ value: documentElement }, , { setValue: setDocumentElement }] =
    useField<ListElement>(elementName);

  const arraySourceEdit: SchemaFieldProps = {
    name: joinName(elementName, "config", "array"),
    schema: { type: "array" },
    label: "Array",
    description: "An array/list of elements to render in the document",
  };

  const onElementTypeChange: ChangeEventHandler<HTMLInputElement> = async (
    event,
  ) => {
    const nextType = event.target.value as DocumentBuilderElementType;

    const nextDocumentElement = produce(
      documentElement,
      (draft: ListElement) => {
        draft.config.element.__value__ =
          createNewDocumentBuilderElement(nextType);
      },
    );

    await setDocumentElement(nextDocumentElement);
  };

  return (
    <>
      <SchemaField {...arraySourceEdit} />
      <ConnectedFieldTemplate
        label="Element Key"
        name={joinName(elementName, "config", "elementKey")}
        as={KeyNameWidget}
        description="The variable name to use for each element in the array/list"
      />
      <FieldTemplate
        label="Item type"
        name="elementType"
        value={documentElement.config.element.__value__.type}
        onChange={onElementTypeChange}
        as={SelectWidget}
        options={getAllowedChildTypes(documentElement).map((x) => ({
          // eslint-disable-next-line security/detect-object-injection -- x is a know string
          label: documentBuilderElementTypeLabels[x],
          value: x,
        }))}
      />
    </>
  );
};

export default ListOptions;

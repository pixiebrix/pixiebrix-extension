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

import React, { ChangeEventHandler } from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { joinName } from "@/utils";
import KeyNameWidget from "@/components/form/widgets/KeyNameWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { getAllowedChildTypes } from "@/components/documentBuilder/allowedElementTypes";
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import {
  DocumentElementType,
  ListDocumentElement,
} from "@/components/documentBuilder/documentBuilderTypes";
import { produce } from "immer";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import { useField } from "formik";

type ListOptionsProps = {
  elementName: string;
};

const ListOptions: React.FC<ListOptionsProps> = ({ elementName }) => {
  const [
    { value: documentElement },
    ,
    { setValue: setDocumentElement },
  ] = useField<ListDocumentElement>(elementName);

  const arraySourceEdit: SchemaFieldProps = {
    name: joinName(elementName, "config", "array"),
    schema: { type: "array" },
    label: "Array",
  };

  const onElementTypeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextType = event.target.value as DocumentElementType;

    const nextDocumentElement = produce(
      documentElement,
      (draft: ListDocumentElement) => {
        draft.config.element.__value__ = createNewElement(nextType);
      }
    );

    setDocumentElement(nextDocumentElement);
  };

  return (
    <>
      <SchemaField {...arraySourceEdit} />
      <ConnectedFieldTemplate
        label="Element key"
        name={joinName(elementName, "config", "elementKey")}
        as={KeyNameWidget}
      />
      <FieldTemplate
        label="Item type"
        name="elementType"
        value={documentElement.config.element.__value__.type}
        onChange={onElementTypeChange}
        as={SelectWidget}
        options={getAllowedChildTypes(documentElement).map((x) => ({
          // eslint-disable-next-line security/detect-object-injection -- x is a know string
          label: elementTypeLabels[x],
          value: x,
        }))}
      />
    </>
  );
};

export default ListOptions;

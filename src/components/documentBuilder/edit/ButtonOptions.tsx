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

import React, { useMemo } from "react";
import { ButtonDocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { Col, Row } from "react-bootstrap";
import ElementBlockEdit from "@/components/documentBuilder/edit/ElementBlockEdit";
import { useField } from "formik";
import { BlockConfig } from "@/blocks/types";
import { produce } from "immer";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import getElementEditSchemas from "@/components/documentBuilder/edit/getElementEditSchemas";

type ButtonOptionsProps = {
  elementName: string;
};

const ButtonOptions: React.FC<ButtonOptionsProps> = ({ elementName }) => {
  const [{ value: documentElement }, , { setValue: setDocumentElement }] =
    useField<ButtonDocumentElement>(elementName);

  const schemaFields = useMemo(
    () =>
      getElementEditSchemas(documentElement.type, elementName).map((schema) => (
        <SchemaField key={schema.name} {...schema} />
      )),
    [elementName]
  );

  const onClickValue = documentElement.config.onClick.__value__;

  if (onClickValue.length > 1) {
    return (
      <Row>
        <Col>Use Workshop to edit a pipeline made of multiple bricks.</Col>
      </Row>
    );
  }

  const buttonConfigName = `${elementName}.config.onClick.__value__.0`;
  const buttonConfig = onClickValue[0];

  const onButtonBlockSelected = (blockConfig: BlockConfig) => {
    const nextDocumentElement = produce(
      documentElement,
      (draft: ButtonDocumentElement) => {
        draft.config.onClick.__value__ = [blockConfig];
      }
    );

    setDocumentElement(nextDocumentElement);
  };

  return (
    <>
      {schemaFields}
      <ElementBlockEdit
        blockTypes={["effect", "transform"]}
        blockConfigName={buttonConfigName}
        blockConfig={buttonConfig}
        onBlockSelected={onButtonBlockSelected}
      />
    </>
  );
};

export default ButtonOptions;

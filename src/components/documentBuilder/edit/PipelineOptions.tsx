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

import React from "react";
import { PipelineDocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { Col, Row } from "react-bootstrap";
import ElementBlockEdit from "@/components/documentBuilder/edit/ElementBlockEdit";
import { useField } from "formik";
import { BlockConfig } from "@/blocks/types";
import { produce } from "immer";

type PipelineOptionsProps = {
  elementName: string;
};

const PipelineOptions: React.FC<PipelineOptionsProps> = ({ elementName }) => {
  const [
    { value: documentElement },
    ,
    { setValue: setDocumentElement },
  ] = useField<PipelineDocumentElement>(elementName);

  const pipelineValue = documentElement.config.pipeline.__value__;
  if (pipelineValue.length > 1) {
    return (
      <Row>
        <Col>Use Workshop to edit a pipeline made of multiple bricks.</Col>
      </Row>
    );
  }

  const pipelineConfigName = `${elementName}.config.pipeline.__value__.0`;
  const pipelineConfig = pipelineValue[0];

  const onPipelineBlockSelected = (blockConfig: BlockConfig) => {
    const nextDocumentElement = produce(
      documentElement,
      (draft: PipelineDocumentElement) => {
        draft.config.pipeline.__value__ = [blockConfig];
      }
    );

    setDocumentElement(nextDocumentElement);
  };

  return (
    <ElementBlockEdit
      blocksType="renderer"
      blockConfigName={pipelineConfigName}
      blockConfig={pipelineConfig}
      onBlockSelected={onPipelineBlockSelected}
    />
  );
};

export default PipelineOptions;

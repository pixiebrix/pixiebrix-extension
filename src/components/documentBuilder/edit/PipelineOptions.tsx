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

type PipelineOptionsProps = {
  elementName: string;
};

const PipelineOptions: React.FC<PipelineOptionsProps> = ({ elementName }) => {
  const [
    { value: documentElement },
    ,
    { setValue: setDocumentElement },
  ] = useField<PipelineDocumentElement>(elementName);

  if (documentElement.config.pipeline.__value__.length > 1) {
    return (
      <Row>
        <Col>Use Workshop to edit a pipeline made of multiple bricks.</Col>
      </Row>
    );
  }

  return (
    <ElementBlockEdit
      elementName={elementName}
      element={documentElement}
      setElement={setDocumentElement}
    />
  );
};

export default PipelineOptions;

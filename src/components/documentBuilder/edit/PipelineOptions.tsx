/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { joinPathParts } from "@/utils";
import React from "react";
import { Col, Row } from "react-bootstrap";

type PipelineOptionsProps = {
  elementName: string;
};

const PipelineOptions: React.FC<PipelineOptionsProps> = ({ elementName }) => (
  <>
    <Row>
      <Col>Use the Nodes Tree on the left to edit the nested pipeline.</Col>
    </Row>
    <ConnectedFieldTemplate
      name={joinPathParts(elementName, "config", "label")}
      label="Pipeline name"
      description="The pipeline label displayed in the Nodes Tree"
    />
  </>
);

export default PipelineOptions;

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

import { selectExtensionAnnotations } from "@/analysis/analysisSelectors";
import { AnnotationType } from "@/analysis/analysisTypes";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import {
  selectActiveElementId,
  selectActiveNodeInfo,
} from "@/pageEditor/slices/editorSelectors";
import React from "react";
import { Col, Row } from "react-bootstrap";
import { useSelector } from "react-redux";

const messageCssClasses = {
  [AnnotationType.Error]: "text-danger",
  [AnnotationType.Warning]: "text-warning",
  [AnnotationType.Info]: "text-info",
};

const AnalysisResult: React.FunctionComponent = () => {
  const activeElementId = useSelector(selectActiveElementId);
  const { path } = useSelector(selectActiveNodeInfo);
  // Removing the path of the root pipeline (accounting for ".")
  const relativeBlockPath = path.slice(PIPELINE_BLOCKS_FIELD_NAME.length + 1);
  const extensionAnnotations = useSelector(
    selectExtensionAnnotations(activeElementId)
  );

  const nodeAnalysis = extensionAnnotations.filter(
    ({ position }) => position.path === relativeBlockPath
  );
  if (nodeAnalysis.length === 0) {
    return null;
  }

  return (
    <>
      {/* TODO: remove the header, added for dev purposes only */}
      <Row>
        <Col>Trace analysis:</Col>
      </Row>
      {nodeAnalysis.map(({ message, type }, index) => (
        <Row key={index}>
          <Col className={messageCssClasses[type]}>{message}</Col>
        </Row>
      ))}
    </>
  );
};

export default AnalysisResult;

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

import AnnotationAlert from "@/components/annotationAlert/AnnotationAlert";
import {
  selectActiveNodeInfo,
  selectAnnotationsForPath,
} from "@/pageEditor/slices/editorSelectors";
import React from "react";
import { Col, Row } from "react-bootstrap";
import { useSelector } from "react-redux";

const AnalysisResult: React.FunctionComponent = () => {
  const { path } = useSelector(selectActiveNodeInfo);
  const annotations = useSelector(selectAnnotationsForPath(path));
  if (annotations.length === 0) {
    return null;
  }

  return (
    <Row className="mb-3">
      <Col>
        {annotations.map(({ message, type }, index) => (
          <AnnotationAlert
            key={`${message}-${index}`}
            message={message}
            type={type}
          />
        ))}
      </Col>
    </Row>
  );
};

export default AnalysisResult;

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

import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import {
  selectActiveNodeInfo,
  selectActiveModComponentAnalysisAnnotationsForPath,
} from "@/pageEditor/store/editor/editorSelectors";
import React from "react";

import { useSelector } from "react-redux";

const AnalysisResult: React.FunctionComponent<{ className?: string }> = ({
  className,
}) => {
  const { path } = useSelector(selectActiveNodeInfo) ?? {};
  const annotations = useSelector(
    selectActiveModComponentAnalysisAnnotationsForPath(path),
  );
  if (annotations.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {annotations.map(({ message, type }, index) => (
        <FieldAnnotationAlert
          // eslint-disable-next-line react/no-array-index-key -- Requires a refactor of the `FieldAnnotation` component to require specifying a key
          key={index}
          message={message}
          type={type}
        />
      ))}
    </div>
  );
};

export default AnalysisResult;

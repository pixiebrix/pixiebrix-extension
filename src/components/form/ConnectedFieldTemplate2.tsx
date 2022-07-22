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

import React from "react";
import { useField } from "formik";
import FieldTemplate, { FieldProps } from "./FieldTemplate";
import { selectExtensionAnnotations } from "@/analysis/analysisSelectors";
import { UUID } from "@/core";
import { RootState } from "@/pageEditor/pageEditorTypes";
import { selectActiveElementId } from "@/pageEditor/slices/editorSelectors";
import { createSelector } from "reselect";
import { useSelector } from "react-redux";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";

const selectAnnotationsForPath = (path: string) =>
  createSelector(
    selectActiveElementId,
    (state: RootState) => state,
    (activeElementId: UUID, state: RootState) => {
      const extensionAnnotations =
        selectExtensionAnnotations(activeElementId)(state);
      let relativeBlockPath: string;
      if (path.startsWith(PIPELINE_BLOCKS_FIELD_NAME)) {
        relativeBlockPath = path.slice(PIPELINE_BLOCKS_FIELD_NAME.length + 1);
      } else {
        relativeBlockPath = path;
      }

      const annotations = extensionAnnotations.filter(
        (x) => x.position.path === relativeBlockPath
      );

      return annotations;
    }
  );

const ConnectedFieldTemplate2: React.FunctionComponent<FieldProps> = ({
  name,
  ...restFieldProps
}) => {
  const [{ value, onBlur, onChange }, { touched }] = useField(name);
  const annotations = useSelector(selectAnnotationsForPath(name));
  const error =
    annotations.length > 0
      ? annotations.map(({ message }) => message).join(" ")
      : undefined;

  return (
    <FieldTemplate
      name={name}
      value={value}
      error={error}
      touched={touched}
      onChange={onChange}
      onBlur={onBlur}
      {...restFieldProps}
    />
  );
};

export default ConnectedFieldTemplate2;

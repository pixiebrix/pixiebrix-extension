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

import FieldTemplate from "@/components/form/FieldTemplate";
import SwitchButtonWidget, {
  type CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import React, { type ChangeEvent } from "react";
import { useField, useFormikContext } from "formik";
import { type PipelineExpression } from "@/types/runtimeTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";

import { makePipelineExpression } from "@/utils/expressionUtils";

/**
 * A Formik field for toggling a pipeline expression on or off.
 *
 * @see getPipelinePropNames
 */
const PipelineToggleField: React.VoidFunctionComponent<{
  name: string;
  label: string;
  description: string;
}> = ({ name, label, description }) => {
  const { setFieldValue } = useFormikContext<ModComponentFormState>();
  const [{ value }] = useField<PipelineExpression | null>(name);

  return (
    <FieldTemplate
      as={SwitchButtonWidget}
      label={label}
      description={description}
      name={name}
      value={Boolean(value)}
      onChange={async ({ target }: ChangeEvent<CheckBoxLike>) => {
        if (target.value) {
          await setFieldValue(name, makePipelineExpression([]));
        } else {
          await setFieldValue(name, null);
        }
      }}
    />
  );
};

export default PipelineToggleField;

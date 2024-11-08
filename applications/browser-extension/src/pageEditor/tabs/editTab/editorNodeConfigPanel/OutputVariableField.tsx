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

import ConnectedFieldTemplate from "../../../../components/form/ConnectedFieldTemplate";
import KeyNameWidget from "../../../../components/form/widgets/KeyNameWidget";
import React from "react";
import { brickTypeSupportsOutputKey } from "../../../../runtime/runtimeUtils";
import PopoverInfoLabel from "../../../../components/form/popoverInfoLabel/PopoverInfoLabel";
import { type TypedBrickPair } from "../../../../bricks/registry";
import { useField } from "formik";
import { type Nullishable } from "../../../../utils/nullishUtils";

/**
 * Field for output variable name.
 * @since 2.0.7 output keys are optional for bricks
 */
const OutputVariableField: React.FC<{
  name: string;
  className?: string;
  brickInfo: Nullishable<TypedBrickPair>;
}> = ({ name, className, brickInfo }) => {
  const [{ value }, , { setValue }] = useField<string | undefined>(name);

  const isOutputDisabled = !(
    brickInfo?.type && brickTypeSupportsOutputKey(brickInfo?.type)
  );

  const outputDescription = isOutputDisabled
    ? "Effect and renderer bricks do not return outputs"
    : "Provide an output variable name to refer to the output in other bricks";

  const PopoverOutputLabel = (
    <PopoverInfoLabel
      name="output-label"
      label="Output Variable"
      description={outputDescription}
    />
  );

  return (
    <ConnectedFieldTemplate
      name={name}
      label={PopoverOutputLabel}
      className={className}
      disabled={isOutputDisabled}
      as={KeyNameWidget}
      value={value ?? ""}
      onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        await setValue(
          typeof value === "string" && value.length > 0 ? value : undefined,
        );
      }}
      placeholder={
        isOutputDisabled ? "Not supported for brick" : "Enter a variable name"
      }
    />
  );
};

export default OutputVariableField;

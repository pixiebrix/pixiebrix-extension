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

import React, { useMemo } from "react";
import { IBlock } from "@/core";
import { getIn, useFormikContext } from "formik";
import { useBlockOptions } from "@/components/fields/BlockField";
import { Form, InputGroup } from "react-bootstrap";
import { RendererContext } from "@/components/fields/blockOptions";
import devtoolFields from "@/devTools/editor/fields/Fields";
import GridLoader from "react-spinners/GridLoader";
import { FormState } from "@/devTools/editor/editorSlice";
import HorizontalFormGroup from "@/components/fields/HorizontalFormGroup";

/**
 * Renders the configuration for a `BlockConfig` based on the inputSchema of that brick
 * @see BlockPipeline
 * @see BlockConfig
 */
const BlockConfiguration: React.FunctionComponent<{
  name: string;
  block: IBlock;
  showOutput: boolean;
}> = ({ name, block, showOutput }) => {
  const context = useFormikContext<FormState>();

  const blockErrors = getIn(context.errors, name);

  const [{ error }, BlockOptions] = useBlockOptions(block.id);

  const blockOptions = useMemo(() => {
    if (blockErrors?.id) {
      return (
        <div className="invalid-feedback d-block mb-4">
          Unknown block {block.id}
        </div>
      );
    }

    if (error) {
      return <div className="invalid-feedback d-block mb-4">{error}</div>;
    }

    if (BlockOptions) {
      return (
        <BlockOptions
          name={name}
          configKey="config"
          // We're showing the output key field ourselves
          showOutputKey={false}
        />
      );
    }

    return <GridLoader />;
  }, [name, block.id, error, BlockOptions, blockErrors?.id]);

  return (
    <RendererContext.Provider value={devtoolFields}>
      <div>
        <HorizontalFormGroup
          label="Step Name"
          description="A short name for the step"
          propsOrFieldName={[name, "label"].join(".")}
        >
          {(field, meta) => (
            <Form.Control
              {...field}
              placeholder={block.name}
              isInvalid={Boolean(meta.error)}
            />
          )}
        </HorizontalFormGroup>

        {showOutput && (
          <HorizontalFormGroup
            label="Output"
            description="A variable to reference the output of this brick"
            propsOrFieldName={[name, "outputKey"].join(".")}
          >
            {(field, meta) => (
              <InputGroup>
                <InputGroup.Text>@</InputGroup.Text>
                <Form.Control {...field} isInvalid={Boolean(meta.error)} />
              </InputGroup>
            )}
          </HorizontalFormGroup>
        )}

        {blockOptions}
      </div>
    </RendererContext.Provider>
  );
};

export default BlockConfiguration;

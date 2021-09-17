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
import { Form, InputGroup } from "react-bootstrap";
import { RegistryId } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { CustomFieldWidget, FieldProps } from "@/components/form/FieldTemplate";
import BlockConfiguration from "@/devTools/editor/tabs/effect/BlockConfiguration";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";

const OutputKeyWidget: CustomFieldWidget = (props: FieldProps) => (
  <InputGroup>
    <InputGroup.Prepend>
      <InputGroup.Text>@</InputGroup.Text>
    </InputGroup.Prepend>
    <Form.Control {...props} />
  </InputGroup>
);

const EditorNodeConfigPanel: React.FC<{
  blockFieldName: string;
  blockId: RegistryId;
}> = ({ blockFieldName, blockId }) => {
  const [block] = useAsyncState(async () => blockRegistry.lookup(blockId), [
    blockId,
  ]);

  return (
    <>
      <ConnectedFieldTemplate
        name={`${blockFieldName}.label`}
        layout="horizontal"
        label="Step Name"
        placeholder={block?.name}
      />
      <ConnectedFieldTemplate
        name={`${blockFieldName}.outputKey`}
        layout="horizontal"
        label="Output"
        as={OutputKeyWidget}
        description={
          <p>
            Provide a output key to refer to the outputs of this block later.
            For example, if you provide the name <code>myOutput</code>, you can
            use the output later with <code>@myOutput</code>.
          </p>
        }
      />

      <BlockConfiguration
        name={blockFieldName}
        blockId={blockId}
        showOutput={false}
      />
    </>
  );
};

export default EditorNodeConfigPanel;

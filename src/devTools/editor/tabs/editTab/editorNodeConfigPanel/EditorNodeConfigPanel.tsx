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
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { RegistryId } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { CustomFieldWidget, FieldProps } from "@/components/form/FieldTemplate";
import BlockConfiguration from "@/devTools/editor/tabs/effect/BlockConfiguration";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { getType } from "@/blocks/util";
import { showOutputKey } from "@/devTools/editor/tabs/editTab/editHelpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import styles from "./EditorNodeConfigPanel.module.scss";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import ErrorBoundary from "@/components/ErrorBoundary";

const OutputKeyWidget: CustomFieldWidget = (props: FieldProps) => (
  <InputGroup>
    <InputGroup.Prepend>
      <InputGroup.Text>@</InputGroup.Text>
    </InputGroup.Prepend>
    <Form.Control {...props} />
  </InputGroup>
);

const PopoverOutputLabel: React.FC<{
  description: string;
}> = ({ description }) => (
  <PopoverInfoLabel
    name="output-label"
    label="Output"
    description={description}
  />
);

const EditorNodeConfigPanel: React.FC<{
  /**
   * The block field name in the form
   * @see BlockConfig
   */
  blockFieldName: string;
  blockId: RegistryId;
  onRemoveNode: () => void;
}> = ({ blockFieldName, blockId, onRemoveNode }) => {
  const [blockInfo] = useAsyncState(async () => {
    const block = await blockRegistry.lookup(blockId);
    return {
      block,
      type: await getType(block),
    };
  }, [blockId]);

  const isOutputDisabled = !(
    blockInfo === null || showOutputKey(blockInfo?.type)
  );
  const outputDescription = isOutputDisabled
    ? "Effect and renderer bricks do not produce outputs"
    : "Provide an output key to refer to the outputs of this block later.";

  return (
    <>
      <Row className={styles.topRow}>
        <Col xl>
          <ConnectedFieldTemplate
            name={`${blockFieldName}.label`}
            label="Step Name"
            placeholder={blockInfo?.block.name}
          />
        </Col>
        <Col xl>
          <ConnectedFieldTemplate
            name={`${blockFieldName}.outputKey`}
            label={<PopoverOutputLabel description={outputDescription} />}
            disabled={isOutputDisabled}
            as={OutputKeyWidget}
          />
        </Col>
        <Col sm="auto">
          <Button
            variant="danger"
            onClick={onRemoveNode}
            className={styles.removeButton}
          >
            <FontAwesomeIcon icon={faTrash} />{" "}
            <span className={styles.removeText}>Remove</span>
          </Button>
        </Col>
      </Row>

      <ErrorBoundary>
        <BlockConfiguration name={blockFieldName} blockId={blockId} />
      </ErrorBoundary>
    </>
  );
};

export default EditorNodeConfigPanel;

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

import React, { useMemo } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { RegistryId } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import BlockConfiguration from "@/devTools/editor/tabs/effect/BlockConfiguration";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { getType } from "@/blocks/util";
import { showOutputKey } from "@/devTools/editor/tabs/editTab/editHelpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faTrash } from "@fortawesome/free-solid-svg-icons";
import styles from "./EditorNodeConfigPanel.module.scss";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import KeyNameWidget from "@/components/form/widgets/KeyNameWidget";

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
  blockError: string;
  copyBlock: () => void;
  onRemoveNode: () => void;
}> = ({ blockFieldName, blockId, blockError, copyBlock, onRemoveNode }) => {
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

  const outputKeyLabel = useMemo(
    () => <PopoverOutputLabel description={outputDescription} />,
    [outputDescription]
  );

  return (
    <Col>
      {blockError && (
        <Row>
          <Col className={styles.errorMessage}>{blockError}</Col>
        </Row>
      )}
      <Row className={styles.topRow}>
        <Col xl>
          <ConnectedFieldTemplate
            name={`${blockFieldName}.label`}
            label="Step Name"
            fitLabelWidth
            placeholder={blockInfo?.block.name}
          />
        </Col>
        <Col xl>
          <ConnectedFieldTemplate
            name={`${blockFieldName}.outputKey`}
            label={outputKeyLabel}
            fitLabelWidth
            disabled={isOutputDisabled}
            as={KeyNameWidget}
          />
        </Col>
      </Row>
      <Row className={styles.buttonRow}>
        <Col sm="auto">
          <Button type="button" variant="primary" onClick={copyBlock}>
            <span>
              <FontAwesomeIcon icon={faCopy} /> Copy Brick
            </span>
          </Button>
        </Col>
        <Col sm="auto">
          <Button type="button" variant="danger" onClick={onRemoveNode}>
            <span>
              <FontAwesomeIcon icon={faTrash} /> Remove Brick
            </span>
          </Button>
        </Col>
      </Row>

      <BlockConfiguration name={blockFieldName} blockId={blockId} />
    </Col>
  );
};

export default EditorNodeConfigPanel;

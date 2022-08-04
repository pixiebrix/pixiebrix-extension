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

import styles from "./EditorNodeConfigPanel.module.scss";

import React from "react";
import { Col, Row } from "react-bootstrap";
import { RegistryId } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import BlockConfiguration from "@/pageEditor/tabs/effect/BlockConfiguration";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { showOutputKey } from "@/pageEditor/tabs/editTab/editHelpers";
import KeyNameWidget from "@/components/form/widgets/KeyNameWidget";
import getType from "@/runtime/getType";
import { useSelector } from "react-redux";
import { selectActiveNodeError } from "@/pageEditor/slices/editorSelectors";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import { ErrorLevel } from "@/pageEditor/uiState/uiStateTypes";
import AnalysisResult from "@/pageEditor/tabs/editTab/AnalysisResult";

const EditorNodeConfigPanel: React.FC<{
  /**
   * The block field name in the form
   * @see BlockConfig
   */
  blockFieldName: string;
  blockId: RegistryId;
}> = ({ blockFieldName, blockId }) => {
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

  const PopoverOutputLabel = (
    <PopoverInfoLabel
      name="output-label"
      label="Output"
      description={outputDescription}
    />
  );

  const errorInfo = useSelector(selectActiveNodeError);
  const blockErrorMessage = errorInfo?.errors
    ?.filter((error) => error.level === ErrorLevel.Critical)
    ?.map((x) => x.message)
    .join(" ");
  const blockWarningMessage = errorInfo?.errors
    ?.filter((error) => error.level === ErrorLevel.Warning)
    ?.map((x) => x.message)
    .join(" ");

  return (
    <>
      {blockErrorMessage && (
        <Row>
          <Col className="text-danger">{blockErrorMessage}</Col>
        </Row>
      )}
      {blockWarningMessage && (
        <Row>
          <Col className="text-warning">{blockWarningMessage}</Col>
        </Row>
      )}
      <AnalysisResult />
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
            label={PopoverOutputLabel}
            fitLabelWidth
            disabled={isOutputDisabled}
            as={KeyNameWidget}
          />
        </Col>
      </Row>

      <BlockConfiguration name={blockFieldName} blockId={blockId} />
    </>
  );
};

export default EditorNodeConfigPanel;

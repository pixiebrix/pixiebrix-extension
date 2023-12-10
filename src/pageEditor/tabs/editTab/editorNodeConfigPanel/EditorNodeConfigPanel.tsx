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

import styles from "./EditorNodeConfigPanel.module.scss";

import React from "react";
import { Col, Row } from "react-bootstrap";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import BrickConfiguration from "@/pageEditor/tabs/effect/BrickConfiguration";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/bricks/registry";
import { showOutputKey } from "@/pageEditor/tabs/editTab/editHelpers";
import KeyNameWidget from "@/components/form/widgets/KeyNameWidget";
import getType from "@/runtime/getType";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import AnalysisResult from "@/pageEditor/tabs/editTab/AnalysisResult";
import { useSelector } from "react-redux";
import { selectActiveNodeInfo } from "@/pageEditor/slices/editorSelectors";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import cx from "classnames";
import { MARKETPLACE_URL } from "@/urlConstants";

const EditorNodeConfigPanel: React.FC = () => {
  const { blockId, path: blockFieldName } = useSelector(selectActiveNodeInfo);
  const [blockInfo] = useAsyncState(async () => {
    const block = await blockRegistry.lookup(blockId);
    return {
      block,
      type: await getType(block),
    };
  }, [blockId]);

  const { data: listings = {} } = useGetMarketplaceListingsQuery({
    package__name: blockId,
  });

  const { instructions: listingInstructions, id: listingId } =
    listings[blockId] ?? {};

  const isOutputDisabled = !(
    blockInfo === null || showOutputKey(blockInfo?.type)
  );
  const outputDescription = isOutputDisabled
    ? "Effect and renderer bricks do not produce outputs"
    : "Provide an output variable name to refer to the outputs of this brick later.";

  const PopoverOutputLabel = (
    <PopoverInfoLabel
      name="output-label"
      label="Output"
      description={outputDescription}
    />
  );

  const showDocumentationLink = listingInstructions && listingId;

  return (
    <>
      <AnalysisResult />
      <Row className={cx(styles.brickInfo, "justify-content-between")}>
        <Col>
          <p>{blockInfo?.block.name}</p>
        </Col>
        {showDocumentationLink && (
          <Col xs="auto">
            <a
              href={`${MARKETPLACE_URL}${listingId}/?utm_source=pixiebrix&utm_medium=page_editor&utm_campaign=docs&utm_content=view_docs_link`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Documentation
            </a>
          </Col>
        )}
      </Row>
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

      <BrickConfiguration name={blockFieldName} brickId={blockId} />
    </>
  );
};

export default EditorNodeConfigPanel;

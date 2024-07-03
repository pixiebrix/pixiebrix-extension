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

import React from "react";
import cx from "classnames";
import styles from "./EditorNodeConfigPanel.module.scss";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import BrickConfiguration from "@/pageEditor/tabs/effect/BrickConfiguration";
import blockRegistry from "@/bricks/registry";
import { showOutputKey } from "@/pageEditor/tabs/editTab/editHelpers";
import KeyNameWidget from "@/components/form/widgets/KeyNameWidget";
import getType from "@/runtime/getType";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import AnalysisResult from "@/pageEditor/tabs/editTab/AnalysisResult";
import { useSelector } from "react-redux";
import { selectActiveNodeInfo } from "@/pageEditor/store/editor/editorSelectors";
import { useGetMarketplaceListingsQuery } from "@/data/service/api";
import { MARKETPLACE_URL } from "@/urlConstants";
import CommentsPreview from "@/pageEditor/tabs/editTab/editorNodeConfigPanel/CommentsPreview";
import useAsyncState from "@/hooks/useAsyncState";

const EditorNodeConfigPanel: React.FC = () => {
  const {
    blockId: brickId,
    path: brickFieldName,
    blockConfig,
  } = useSelector(selectActiveNodeInfo) ?? {};
  const { comments } = blockConfig ?? {};

  const { data: brickInfo } = useAsyncState(async () => {
    if (brickId == null) {
      return null;
    }

    const brick = await blockRegistry.lookup(brickId);
    return {
      block: brick,
      type: await getType(brick),
    };
  }, [brickId]);

  const { data: listings = {} } = useGetMarketplaceListingsQuery({
    package__name: brickId,
  });

  const { instructions: listingInstructions, id: listingId } =
    listings[brickId] ?? {};

  const isOutputDisabled = !(
    brickInfo == null || showOutputKey(brickInfo?.type)
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
      <AnalysisResult className="mb-3" />

      <h6 className="mb-3 d-flex justify-content-between flex-wrap gap-2">
        {brickInfo?.block.name}
        {showDocumentationLink && (
          <a
            href={`${MARKETPLACE_URL}${listingId}/?utm_source=pixiebrix&utm_medium=page_editor&utm_campaign=docs&utm_content=view_docs_link`}
          >
            View Documentation
          </a>
        )}
      </h6>

      <div className={cx("mb-3", styles.coreFields)}>
        {/* Do not merge divs, the outer div is a CSS @container */}
        <div className="gap-column-4">
          <ConnectedFieldTemplate
            name={`${brickFieldName}.label`}
            label="Step Name"
            className="flex-grow-1"
            placeholder={brickInfo?.block.name}
          />
          <ConnectedFieldTemplate
            name={`${brickFieldName}.outputKey`}
            label={PopoverOutputLabel}
            className="flex-grow-1"
            disabled={isOutputDisabled}
            as={KeyNameWidget}
          />
        </div>
      </div>

      {comments && <CommentsPreview comments={comments} />}

      <BrickConfiguration name={brickFieldName} brickId={brickId} />
    </>
  );
};

export default EditorNodeConfigPanel;

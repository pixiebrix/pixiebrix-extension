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
import brickRegistry from "@/bricks/registry";
import getType from "@/runtime/getType";
import AnalysisResult from "@/pageEditor/tabs/editTab/AnalysisResult";
import { useSelector } from "react-redux";
import { selectActiveNodeInfo } from "@/pageEditor/store/editor/editorSelectors";
import { useGetMarketplaceListingsQuery } from "@/data/service/api";
import { MARKETPLACE_URL } from "@/urlConstants";
import CommentsPreview from "@/pageEditor/tabs/editTab/editorNodeConfigPanel/CommentsPreview";
import useAsyncState from "@/hooks/useAsyncState";
import OutputVariableField from "@/pageEditor/tabs/editTab/editorNodeConfigPanel/OutputVariableField";

const EditorNodeConfigPanel: React.FC = () => {
  const {
    blockId: brickId,
    path: brickFieldName,
    blockConfig: brickConfig,
  } = useSelector(selectActiveNodeInfo) ?? {};
  const { comments } = brickConfig ?? {};

  const { data: brickInfo } = useAsyncState(async () => {
    if (brickId == null) {
      return null;
    }

    const brick = await brickRegistry.lookup(brickId);
    return {
      brick,
      type: await getType(brick),
    };
  }, [brickId]);

  const { data: listings = {} } = useGetMarketplaceListingsQuery({
    package__name: brickId,
  });

  const { instructions: listingInstructions, id: listingId } =
    listings[brickId] ?? {};

  const showDocumentationLink = listingInstructions && listingId;

  return (
    <>
      <AnalysisResult className="mb-3" />

      <h6 className="mb-3 d-flex justify-content-between flex-wrap gap-2">
        {brickInfo?.brick.name}
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
            placeholder={brickInfo?.brick.name}
          />
          <OutputVariableField
            brickInfo={brickInfo}
            name={`${brickFieldName}.outputKey`}
            className="flex-grow-1"
          />
        </div>
      </div>

      {comments && <CommentsPreview comments={comments} />}

      <BrickConfiguration name={brickFieldName} brickId={brickId} />
    </>
  );
};

export default EditorNodeConfigPanel;

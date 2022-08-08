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

import React from "react";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { get, isEmpty } from "lodash";
import styles from "./ConfigurationTitle.module.scss";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import {
  selectActiveNodeId,
  selectNodePreviewActiveElement,
  selectPipelineMap,
} from "@/pageEditor/slices/editorSelectors";
import { useSelector } from "react-redux";
import { DocumentRenderer } from "@/blocks/renderers/document";
import { getProperty, joinPathParts } from "@/utils";
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";
import { Button } from "react-bootstrap";
import { actions as pageEditorActions } from "@/pageEditor/slices/editorSlice";
import useReduxState from "@/hooks/useReduxState";
import useAllBlocks from "@/pageEditor/hooks/useAllBlocks";

const DOCUMENT_BODY_PATH = "config.body";

const PlainTitle: React.FC = () => <span className={styles.title}>Input</span>;
const TextTitle: React.FC<{ title: string }> = ({ title }) => (
  <span className={styles.title}>
    Input: <span className={styles.blockName}>{title}</span>
  </span>
);
const BreadcrumbTitle: React.FC<{
  crumbTitle: string;
  crumbAction: () => void;
  title: string;
}> = ({ crumbTitle, crumbAction, title }) => (
  <span className={styles.title}>
    Input:
    <span className={styles.blockName}>
      <Button
        className={styles.parentBlockName}
        onClick={crumbAction}
        variant="link"
      >
        {crumbTitle}
      </Button>{" "}
      / {title}
    </span>
  </span>
);

const ConfigurationTitle: React.FunctionComponent = () => {
  const { allBlocks, isLoading: isLoadingAllBlocks } = useAllBlocks();

  const nodesPipelineMap = useSelector(selectPipelineMap);
  const [activeNodeId, setActiveNodeId] = useReduxState(
    selectActiveNodeId,
    pageEditorActions.setElementActiveNodeId
  );
  const activeNodeInfo = nodesPipelineMap[activeNodeId];
  const { blockConfig: activeNode, parentNodeId } = activeNodeInfo;
  const blockId = activeNode.id;
  const block = allBlocks.get(blockId)?.block;
  const { data: listings = {} } = useGetMarketplaceListingsQuery();
  const listing = listings[blockId];

  const [activeNodePreviewElementName, setActiveNodePreviewElementName] =
    useReduxState(
      selectNodePreviewActiveElement,
      pageEditorActions.setNodePreviewActiveElement
    );

  let title: JSX.Element;
  if (isLoadingAllBlocks) {
    // Not ready yet
    title = <PlainTitle />;
  } else if (
    blockId === DocumentRenderer.BLOCK_ID &&
    !isEmpty(activeNodePreviewElementName)
  ) {
    // An element is selected in the document preview
    const activeDocumentElement = get(
      activeNode,
      joinPathParts(DOCUMENT_BODY_PATH, activeNodePreviewElementName)
    );
    const activeDocumentElementName =
      getProperty<string>(elementTypeLabels, activeDocumentElement.type) ??
      "Unknown element";
    title = (
      <BreadcrumbTitle
        crumbTitle={block?.name}
        crumbAction={() => {
          setActiveNodePreviewElementName(null);
        }}
        title={activeDocumentElementName}
      />
    );
  } else if (
    parentNodeId != null &&
    nodesPipelineMap[parentNodeId].blockId === DocumentRenderer.BLOCK_ID
  ) {
    // Editing a direct descendant of a document node
    const documentBlock = allBlocks.get(DocumentRenderer.BLOCK_ID)?.block;
    title = (
      <BreadcrumbTitle
        crumbTitle={documentBlock?.name}
        crumbAction={() => {
          setActiveNodeId(parentNodeId);
        }}
        title={block?.name}
      />
    );
  } else if (isEmpty(activeNode?.label)) {
    // A brick with no label
    title = <PlainTitle />;
  } else {
    // A brick with a label - show the brick type in the title
    title = <TextTitle title={block?.name} />;
  }

  return isEmpty(listing?.instructions) && isEmpty(listing?.assets) ? (
    title
  ) : (
    <div className={styles.root}>
      {title}
      <a
        href={`https://www.pixiebrix.com/marketplace/${listing.id}/?utm_source=pixiebrix&utm_medium=page_editor&utm_campaign=docs&utm_content=view_docs_link`}
        target="_blank"
        rel="noreferrer"
        className={styles.documentationLink}
      >
        <FontAwesomeIcon icon={faExternalLinkAlt} /> View Documentation
      </a>
    </div>
  );
};

export default ConfigurationTitle;

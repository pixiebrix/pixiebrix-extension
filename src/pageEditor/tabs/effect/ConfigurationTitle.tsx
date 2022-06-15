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
import { IBlock } from "@/core";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isEmpty } from "lodash";
import styles from "./ConfigurationTitle.module.scss";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import {
  selectActiveElement,
  selectActiveNode,
} from "@/pageEditor/slices/editorSelectors";
import { useSelector } from "react-redux";

type ConfigurationTitleProps = {
  block: IBlock | null;
};

const ConfigurationTitle: React.FunctionComponent<ConfigurationTitleProps> = ({
  block,
}) => {
  const activeNode = useSelector(selectActiveNode);
  const blockId = activeNode.id;
  const { data: listings = {} } = useGetMarketplaceListingsQuery();
  const listing = listings[blockId];
  const showBlockLabel = !isEmpty(activeNode?.label);

  console.log("ConfigurationTitle", {
    activeNode,
    showBlockLabel,
  });

  const configurationTitle = showBlockLabel ? (
    <span className={styles.title}>
      Input: <span className={styles.blockName}>{block?.name}</span>
    </span>
  ) : (
    <span>Input</span>
  );

  return isEmpty(listing?.instructions) && isEmpty(listing?.assets) ? (
    configurationTitle
  ) : (
    <div className="d-flex justify-content-between">
      {configurationTitle}
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

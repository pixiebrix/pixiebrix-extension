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

import { IBlock } from "@/core";
import { MarketplaceListing } from "@/types/contract";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isEmpty } from "lodash";
import React from "react";

type ConfigurationTitleProps = {
  block: IBlock | null;
  listing: MarketplaceListing | null;
};

const ConfigurationTitle: React.FunctionComponent<ConfigurationTitleProps> = ({
  block,
  listing,
}) => {
  const configurationTitle = (
    <span>
      Input: <span className="text-muted">{block?.name}</span>
    </span>
  );

  return isEmpty(listing?.instructions) && isEmpty(listing?.assets) ? (
    configurationTitle
  ) : (
    <div className="d-flex justify-content-between">
      {configurationTitle}
      <a
        href={`https://www.pixiebrix.com/marketplace/${listing.id}/`}
        target="_blank"
        rel="noreferrer"
      >
        <FontAwesomeIcon icon={faExternalLinkAlt} /> View Documentation
      </a>
    </div>
  );
};

export default ConfigurationTitle;

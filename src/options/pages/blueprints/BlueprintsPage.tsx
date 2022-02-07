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
import Page from "@/layout/Page";
import { faExternalLinkAlt, faScroll } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import BlueprintsCard from "@/options/pages/blueprints/BlueprintsCard";
import useInstallables from "@/options/pages/blueprints/useInstallables";
import ExtensionLogsModal from "@/options/pages/installed/ExtensionLogsModal";
import { useSelector } from "react-redux";
import { RootState } from "@/options/store";
import {
  LogsContext,
  ShareContext,
} from "@/options/pages/installed/installedPageSlice";
import {
  selectShowLogsContext,
  selectShowShareContext,
} from "@/options/pages/installed/installedPageSelectors";
import ShareExtensionModal from "@/options/pages/installed/ShareExtensionModal";

const BlueprintsPage: React.FunctionComponent = () => {
  const { installables, isLoading, error } = useInstallables();
  const showLogsContext = useSelector<RootState, LogsContext>(
    selectShowLogsContext
  );
  const showShareContext = useSelector<RootState, ShareContext>(
    selectShowShareContext
  );

  return (
    <Page
      icon={faScroll}
      title="Blueprints"
      toolbar={
        <a
          href="https://www.pixiebrix.com/marketplace"
          className="btn btn-info"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon icon={faExternalLinkAlt} /> Open Public Marketplace
        </a>
      }
      isPending={isLoading}
      error={error}
    >
      {showLogsContext && (
        <ExtensionLogsModal
          title={showLogsContext.title}
          context={showLogsContext.messageContext}
        />
      )}
      {showShareContext && (
        <ShareExtensionModal extensionId={showShareContext.extensionId} />
      )}
      {installables.length > 0 && (
        <BlueprintsCard installables={installables} />
      )}
    </Page>
  );
};

export default BlueprintsPage;

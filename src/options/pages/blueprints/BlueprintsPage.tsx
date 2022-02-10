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
import ShareLinkModal from "@/options/pages/installed/ShareLinkModal";
import { faScroll } from "@fortawesome/free-solid-svg-icons";

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
      headerless
      title={"Blueprints"}
      icon={faScroll}
      isPending={isLoading}
      error={error}
    >
      {showLogsContext && (
        <ExtensionLogsModal
          title={showLogsContext.title}
          context={showLogsContext.messageContext}
        />
      )}
      {showShareContext?.extensionId && (
        <ShareExtensionModal extensionId={showShareContext.extensionId} />
      )}

      {showShareContext?.blueprintId && (
        <ShareLinkModal blueprintId={showShareContext.blueprintId} />
      )}

      {installables.length > 0 && (
        <BlueprintsCard installables={installables} />
      )}
    </Page>
  );
};

export default BlueprintsPage;

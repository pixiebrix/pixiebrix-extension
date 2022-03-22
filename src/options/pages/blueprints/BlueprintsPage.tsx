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
import BlueprintsCard from "@/options/pages/blueprints/BlueprintsCard";
import useInstallables from "@/options/pages/blueprints/useInstallables";
import ExtensionLogsModal from "@/options/pages/blueprints/modals/ExtensionLogsModal";
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
import ShareExtensionModal from "@/options/pages/blueprints/modals/ShareExtensionModal";
import ShareLinkModal from "@/options/pages/blueprints/modals/ShareLinkModal";
import { useTitle } from "@/hooks/title";
import Loader from "@/components/Loader";
import { ErrorDisplay } from "@/layout/Page";

const BlueprintsPage: React.FunctionComponent = () => {
  useTitle("Blueprints");
  const { installables, isLoading, error } = useInstallables();
  const showLogsContext = useSelector<RootState, LogsContext>(
    selectShowLogsContext
  );
  const showShareContext = useSelector<RootState, ShareContext>(
    selectShowShareContext
  );

  const body = useMemo(() => {
    if (isLoading) {
      return <Loader />;
    }

    if (error) {
      return <ErrorDisplay error={error} />;
    }

    return <BlueprintsCard installables={installables} />;
  }, [installables, isLoading, error]);

  return (
    <div className="h-100">
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

      {body}
    </div>
  );
};

export default BlueprintsPage;

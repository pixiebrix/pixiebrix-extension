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

import React, { useMemo, useEffect } from "react";
import BlueprintsCard from "@/options/pages/blueprints/BlueprintsCard";
import useInstallables from "@/options/pages/blueprints/useInstallables";
import ExtensionLogsModal from "@/options/pages/blueprints/modals/ExtensionLogsModal";
import { useSelector } from "react-redux";
import { RootState } from "@/store/optionsStore";
import {
  type LogsContext,
  type ShareContext,
} from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import {
  selectShowLogsContext,
  selectShowShareContext,
} from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { useTitle } from "@/hooks/title";
import { ErrorDisplay } from "@/layout/ErrorDisplay";
import ConvertToRecipeModal from "./modals/ConvertToRecipeModal";
import ShareRecipeModal from "./modals/ShareRecipeModal/ShareRecipeModal";
import { reportEvent } from "@/telemetry/events";

const BlueprintsPage: React.FunctionComponent = () => {
  useTitle("Blueprints");
  const { installables, error } = useInstallables();
  const showLogsContext = useSelector<RootState, LogsContext>(
    selectShowLogsContext
  );
  const showShareContext = useSelector<RootState, ShareContext>(
    selectShowShareContext
  );

  useEffect(() => {
    reportEvent("BlueprintsPageView");
  }, []);

  const body = useMemo(() => {
    if (error) {
      return <ErrorDisplay error={error} />;
    }

    return <BlueprintsCard installables={installables} />;
  }, [installables, error]);

  return (
    <div className="h-100">
      {showLogsContext && (
        <ExtensionLogsModal
          title={showLogsContext.title}
          context={showLogsContext.messageContext}
        />
      )}
      {showShareContext?.extensionId && <ConvertToRecipeModal />}
      {showShareContext?.blueprintId && <ShareRecipeModal />}
      {body}
    </div>
  );
};

export default BlueprintsPage;

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

import React, { useContext, useEffect } from "react";
import ModsPageTableLayout from "@/extensionConsole/pages/mods/ModsPageTableLayout";
import useSetDocumentTitle from "@/hooks/useSetDocumentTitle";
import { ErrorDisplay } from "@/layout/ErrorDisplay";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import Modals from "./modals/Modals";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import {
  useGetEditablePackagesQuery,
  useGetFeatureFlagsQuery,
  useGetMarketplaceListingsQuery,
} from "@/data/service/api";
import DeploymentsContext from "@/extensionConsole/pages/deployments/DeploymentsContext";
import { useDispatch } from "react-redux";
import modsPageSlice from "@/extensionConsole/pages/mods/modsPageSlice";

const ModsPage: React.FunctionComponent = () => {
  useSetDocumentTitle("Mods");

  const dispatch = useDispatch();

  // Ensure all the data is loaded
  // Note: We only need to show a loading indicator until mods are loaded
  const { isLoading, error: modsError } = useAllModDefinitions();
  const { error: listingsError } = useGetMarketplaceListingsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  useGetFeatureFlagsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  useGetEditablePackagesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const error = modsError || listingsError;

  const { isAutoDeploying } = useContext(DeploymentsContext);

  useEffect(() => {
    reportEvent(Events.MODS_PAGE_VIEW);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAutoDeploying) {
      dispatch(modsPageSlice.actions.setIsLoadingData(false));
    }
  }, [dispatch, isAutoDeploying, isLoading]);

  return (
    <div className="h-100">
      {error ? <ErrorDisplay error={error} /> : <ModsPageTableLayout />}
      <Modals />
    </div>
  );
};

export default ModsPage;

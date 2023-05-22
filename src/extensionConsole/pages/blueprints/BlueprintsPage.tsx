/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { useEffect } from "react";
import BlueprintsPageLayout from "@/extensionConsole/pages/blueprints/BlueprintsPageLayout";
import useInstallables from "@/extensionConsole/pages/blueprints/useInstallables";
import { useTitle } from "@/hooks/title";
import { ErrorDisplay } from "@/layout/ErrorDisplay";
import { reportEvent } from "@/telemetry/events";
import Modals from "./modals/Modals";
import { useLocation } from "react-router";
import {
  blueprintModalsSlice,
  type PublishContext,
} from "@/extensionConsole/pages/blueprints/modals/blueprintModalsSlice";
import { useDispatch } from "react-redux";

const useShowPublishUrlEffect = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const params = new URLSearchParams(location.search);
  const showPublish = params.get("publish") === "1";
  const blueprintId = params.get("blueprintId");
  const extensionId = params.get("extensionId");

  useEffect(() => {
    if (blueprintId && extensionId) {
      // Should never happen
      return;
    }

    if (showPublish && (blueprintId || extensionId)) {
      dispatch(
        blueprintModalsSlice.actions.setShareContext({
          ...(blueprintId ? { blueprintId } : {}),
          ...(extensionId ? { extensionId } : {}),
        } as PublishContext)
      );
    }
  }, []);
};

const BlueprintsPage: React.FunctionComponent = () => {
  useTitle("Mods");
  const { installables, error } = useInstallables();
  useShowPublishUrlEffect();

  useEffect(() => {
    reportEvent("BlueprintsPageView");
  }, []);

  return (
    <div className="h-100">
      {error ? (
        <ErrorDisplay error={error} />
      ) : (
        <BlueprintsPageLayout installables={installables} />
      )}
      <Modals />
    </div>
  );
};

export default BlueprintsPage;

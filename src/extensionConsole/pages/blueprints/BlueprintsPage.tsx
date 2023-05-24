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
import useInstallables from "@/installables/useInstallables";
import { useTitle } from "@/hooks/title";
import { ErrorDisplay } from "@/layout/ErrorDisplay";
import { reportEvent } from "@/telemetry/events";
import Modals from "./modals/Modals";
import useShowPublishUrlEffect from "@/extensionConsole/pages/blueprints/useShowPublishUrlEffect";

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

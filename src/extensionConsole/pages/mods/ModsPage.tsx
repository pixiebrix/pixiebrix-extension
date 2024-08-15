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

import React, { useEffect } from "react";
import ModsPageLayout from "@/extensionConsole/pages/mods/ModsPageLayout";
import useMods from "@/mods/useMods";
import useSetDocumentTitle from "@/hooks/useSetDocumentTitle";
import { ErrorDisplay } from "@/layout/ErrorDisplay";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import Modals from "./modals/Modals";

const ModsPage: React.FunctionComponent = () => {
  useSetDocumentTitle("Mods");
  const { mods, error } = useMods();

  useEffect(() => {
    reportEvent(Events.MODS_PAGE_VIEW);
  }, []);

  return (
    <div className="h-100">
      {error ? <ErrorDisplay error={error} /> : <ModsPageLayout mods={mods} />}
      <Modals />
    </div>
  );
};

export default ModsPage;

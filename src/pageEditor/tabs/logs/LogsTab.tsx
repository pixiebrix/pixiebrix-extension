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
import { Tab } from "react-bootstrap";
import LogCard from "@/components/logViewer/LogCard";

export const LOGS_EVENT_KEY = "logs";

const LogsTab: React.FunctionComponent<{
  eventKey: string;
}> = ({ eventKey = LOGS_EVENT_KEY }) => (
  <Tab.Pane eventKey={eventKey} mountOnEnter unmountOnExit className="h-100">
    <LogCard />
  </Tab.Pane>
);

export default LogsTab;

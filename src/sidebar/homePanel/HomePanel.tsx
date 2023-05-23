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
import React from "react";
import { type StaticPanelEntry } from "@/types/sidebarTypes";
import { Container, Row } from "react-bootstrap";
import useInstallables from "@/extensionConsole/pages/blueprints/useInstallables";
import { ErrorDisplay } from "@/layout/ErrorDisplay";
import { ActiveModsList } from "@/sidebar/homePanel/ActiveModsList";

const HomePanel: React.FunctionComponent = () => {
  const { installables, error } = useInstallables();

  return (
    <div className="full-height h-100">
      <Container className="scrollable-area">
        Active mods
        <Row>
          {error ? (
            <ErrorDisplay error={error} />
          ) : (
            <ActiveModsList installables={installables} />
          )}
        </Row>
      </Container>
    </div>
  );
};

export const HOME_PANEL: StaticPanelEntry = {
  type: "staticPanel",
  heading: "Home",
  key: "home",
};

export default HomePanel;

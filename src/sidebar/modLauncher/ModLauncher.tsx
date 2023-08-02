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
import { Container } from "react-bootstrap";
import useMods from "@/mods/useMods";
import { ErrorDisplay } from "@/layout/ErrorDisplay";
import { ActiveSidebarModsList } from "@/sidebar/modLauncher/ActiveSidebarModsList";

const ModLauncher: React.FunctionComponent = () => {
  const { mods, error } = useMods();

  return (
    <div className="full-height h-100">
      <Container className="scrollable-area">
        {error ? (
          <ErrorDisplay error={error} />
        ) : (
          <ActiveSidebarModsList mods={mods} />
        )}
      </Container>
    </div>
  );
};

export const MOD_LAUNCHER: StaticPanelEntry = {
  type: "staticPanel",
  heading: "Mods",
  key: "modLauncher",
};

export default ModLauncher;

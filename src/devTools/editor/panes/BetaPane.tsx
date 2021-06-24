/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import Centered from "@/devTools/editor/components/Centered";
import React from "react";

const BetaPane: React.FunctionComponent = () => {
  return (
    <Centered>
      <div className="PaneTitle">
        This Page Editor feature is currently in private beta
      </div>

      <div className="text-left">
        <p>
          To request access, contact{" "}
          <a href="mailto:support@pixiebrix.com">support@pixiebrix.com</a>
        </p>

        <p>
          In the meantime, you can create extensions that depend on this feature
          in the Workshop.
        </p>
      </div>
    </Centered>
  );
};

export default BetaPane;

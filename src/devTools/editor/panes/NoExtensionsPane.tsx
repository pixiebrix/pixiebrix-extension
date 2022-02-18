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

import styles from "@/devTools/editor/panes/Pane.module.scss";

import React from "react";
import Centered from "@/devTools/editor/components/Centered";
import IntroButtons from "./IntroButtons";

const NoExtensionsPane: React.FunctionComponent<{
  unavailableCount: number;
}> = ({ unavailableCount }) => (
  <Centered isScrollable>
    <div className={styles.title}>No custom extensions on the page</div>

    <div className="text-left">
      <p>
        Click <span className="text-info">Add</span> in the sidebar to add an
        element to the page.
      </p>

      <p>
        Check the &ldquo;Show {unavailableCount ?? 1} unavailable&rdquo; box to
        list extensions that are activated but aren&apos;t available on this
        page.
      </p>

      <IntroButtons />
    </div>
  </Centered>
);

export default NoExtensionsPane;

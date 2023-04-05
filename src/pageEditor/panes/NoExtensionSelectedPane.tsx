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

import styles from "@/pageEditor/panes/Pane.module.scss";

import React from "react";
import Centered from "@/components/Centered";
import IntroButtons from "./IntroButtons";

const NoExtensionSelectedPane: React.FunctionComponent = () => (
  <Centered>
    <div className={styles.title}>No mod selected</div>

    <div className="text-left">
      <p>Select a mod in the sidebar to edit</p>
      <p>
        Or, click the <span className="text-info">Add</span> button in the
        sidebar to add a mod to the page.
      </p>

      <IntroButtons />
    </div>
  </Centered>
);

export default NoExtensionSelectedPane;

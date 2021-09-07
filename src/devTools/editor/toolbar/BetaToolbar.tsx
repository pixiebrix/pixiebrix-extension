/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import styles from "./BetaToolbar.module.scss"

/**
 * Simple toggle switch to enable the node-based page editor beta mode
 */
const BetaToolbar: React.FC<{
  isBeta: boolean;
  setIsBeta: (isBeta: boolean) => void;
}> = ({isBeta, setIsBeta}) => (
  <div className={styles.root}>
    <label className={styles.label}>
      Beta UI
    </label>
    <BootstrapSwitchButton
      onstyle="info"
      offstyle="light"
      checked={isBeta}
      onChange={setIsBeta}
    />
  </div>
);

export default BetaToolbar;

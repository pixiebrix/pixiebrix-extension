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

import React, { useContext } from "react";
import AuthContext from "@/auth/AuthContext";
import { DevToolsContext } from "@/devTools/context";
import BeatLoader from "react-spinners/BeatLoader";
import styles from "./Footer.module.scss";

const Footer: React.FunctionComponent = () => {
  const { scope } = useContext(AuthContext);
  const { connecting } = useContext(DevToolsContext);

  return (
    <div className={styles.root}>
      <div className={styles.scope}>
        Scope: <code>{scope}</code>
      </div>
      {connecting && <BeatLoader size={7} />}
    </div>
  );
};

export default Footer;

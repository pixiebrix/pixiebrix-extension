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

import styles from "./Footer.module.scss";

import React, { useContext } from "react";
import { PageEditorTabContext } from "@/pageEditor/context";
import BeatLoader from "react-spinners/BeatLoader";
import useScope from "@/auth/useScope";

const Footer: React.FunctionComponent = () => {
  const scope = useScope();
  const { connecting } = useContext(PageEditorTabContext);

  return (
    <div className={styles.root}>
      {scope && (
        <div className={styles.scope}>
          Scope: <code>{scope}</code>
        </div>
      )}
      {connecting && <BeatLoader size={7} />}
    </div>
  );
};

export default Footer;

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
import styles from "@/pageEditor/tabs/editTab/UpgradedToApiV3.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { Alert } from "react-bootstrap";

const WorkshopMessage: React.FC = () => (
  <Alert variant="info" className={styles.alert}>
    <FontAwesomeIcon icon={faExclamationCircle} size="lg" className="mt-1" />
    <p>
      This brick configuration uses advanced features not yet supported in the
      Page Editor. To make changes, please open the source blueprint in the
      Workshop.{" "}
      <a
        href="https://docs.pixiebrix.com/developer-guide"
        target="_blank"
        rel="noreferrer"
      >
        Read more in the Developer Guide
      </a>
    </p>
  </Alert>
);

export default WorkshopMessage;

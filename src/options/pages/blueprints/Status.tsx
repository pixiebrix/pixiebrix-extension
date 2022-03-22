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

import styles from "./Status.module.scss";

import React from "react";
import { Button } from "react-bootstrap";
import { InstallableViewItem } from "./blueprintsTypes";
import useInstallableActions from "./useInstallableActions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faShieldAlt,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";

const Status: React.VoidFunctionComponent<InstallableViewItem> = ({
  status,
  installable,
  hasUpdate,
  installedVersionNumber,
}) => {
  const { activate, reinstall, requestPermissions } =
    useInstallableActions(installable);

  if (status === "Inactive") {
    return (
      <Button size="sm" variant="outline-info" onClick={activate}>
        Activate
      </Button>
    );
  }

  if (hasUpdate) {
    return (
      <Button size="sm" variant="info" onClick={reinstall}>
        <FontAwesomeIcon icon={faSync} /> Update
      </Button>
    );
  }

  if (requestPermissions) {
    // Use "Allow" for caption because the original "Grant Permissions" was too long
    return (
      <AsyncButton size="sm" variant="info" onClick={requestPermissions}>
        <FontAwesomeIcon icon={faShieldAlt} /> Allow
      </AsyncButton>
    );
  }

  return (
    <div className="text-success w-100">
      <div className={styles.root}>
        <FontAwesomeIcon icon={faCheck} />
        <span className={styles.activeStatus}>
          Active
          {installedVersionNumber && (
            <span className={styles.versionNumber}>
              version {installedVersionNumber}
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default Status;

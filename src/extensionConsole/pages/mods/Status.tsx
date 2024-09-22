/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faExclamationTriangle,
  faPause,
  faShieldAlt,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";
import { type ModViewItem } from "@/types/modTypes";
import useModPermissions from "@/mods/hooks/useModPermissions";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { useHistory } from "react-router";
import { UI_PATHS } from "@/data/service/urlPaths";
import { TrialAwareButton } from "@/extensionConsole/pages/teamTrials/TrialAwareButton";
import useFindModInstance from "@/mods/hooks/useFindModInstance";
import { compact } from "lodash";

const Status: React.VoidFunctionComponent<{
  modViewItem: ModViewItem;
}> = ({ modViewItem }) => {
  const history = useHistory();

  const {
    modId,
    hasUpdate,
    status,
    sharingSource,
    activatedModVersion,
    isUnavailable,
    modActions: { showActivate, showReactivate },
  } = modViewItem;

  const modInstance = useFindModInstance(modId);

  const { hasPermissions, requestPermissions } = useModPermissions(
    compact([modInstance]),
  );

  if (isUnavailable) {
    return (
      <div className="text-warning">
        <div className={styles.root}>
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span className={styles.textStatus}>
            Active
            <span className={styles.versionNumber}>No longer available</span>
          </span>
        </div>
      </div>
    );
  }

  if (showActivate) {
    return (
      <TrialAwareButton
        modId={modId}
        size="sm"
        variant="outline-primary"
        onClick={() => {
          reportEvent(Events.START_MOD_ACTIVATE, {
            modId,
            screen: "extensionConsole",
            reinstall: false,
          });
          history.push(UI_PATHS.MOD_ACTIVATE(modId));
        }}
      >
        Activate
      </TrialAwareButton>
    );
  }

  if (hasUpdate && showReactivate && !(sharingSource.type === "Deployment")) {
    return (
      <TrialAwareButton
        modId={modId}
        icon={faSync}
        size="sm"
        variant="info"
        className="text-nowrap"
        onClick={() => {
          reportEvent(Events.START_MOD_ACTIVATE, {
            modId,
            screen: "extensionConsole",
            reinstall: true,
          });
          history.push(UI_PATHS.MOD_ACTIVATE(modId, true));
        }}
      >
        Update
      </TrialAwareButton>
    );
  }

  if (!hasPermissions) {
    // Use "Allow" for caption because the original "Grant Permissions" was too long
    return (
      <AsyncButton size="sm" variant="info" onClick={requestPermissions}>
        <FontAwesomeIcon icon={faShieldAlt} /> Allow
      </AsyncButton>
    );
  }

  if (status === "Paused") {
    return (
      <div className="text-muted">
        <div className={styles.root}>
          <FontAwesomeIcon icon={faPause} />
          <span className={styles.textStatus}>
            Paused
            <span className={styles.versionNumber}>
              version {activatedModVersion}
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-success">
      <div className={styles.root}>
        <FontAwesomeIcon icon={faCheck} />
        <span className={styles.textStatus}>
          Active
          <span className={styles.versionNumber}>
            version {activatedModVersion}
          </span>
        </span>
      </div>
    </div>
  );
};

export default Status;

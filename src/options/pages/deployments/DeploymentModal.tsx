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

import React, { useCallback, useEffect, useState } from "react";
import { DeploymentState } from "@/hooks/useDeployments";
import AsyncButton from "@/components/AsyncButton";
import { Alert, Dropdown, DropdownButton, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import settingsSlice from "@/store/settingsSlice";
import notify from "@/utils/notify";
import { useUpdateAvailable } from "@/options/pages/UpdateBanner";
import { reportEvent } from "@/telemetry/events";
import { selectAuth } from "@/auth/authSelectors";
import { noop } from "lodash";
import {
  selectUpdatePromptState,
  StateWithSettings,
} from "@/store/settingsSelectors";
import pluralize from "@/utils/pluralize";

const FIFTEEN_MINUTES_MILLIS = 900_000;
const ONE_HOUR_MILLIS = FIFTEEN_MINUTES_MILLIS * 4;
const ONE_DAY_MILLIS = ONE_HOUR_MILLIS * 24;
const MINUTES_TO_MILLIS = 60 * 1000;

/**
 * Countdown time that automatically calls `onFinish` on countdown.
 */
export const CountdownTimer: React.FunctionComponent<{
  duration: number;
  start: number;
  onFinish?: () => void;
}> = ({ duration, start, onFinish = noop }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [duration, start]);

  const remaining = duration - (now - start);
  const isExpired = remaining < 0;

  useEffect(() => {
    if (isExpired && onFinish) {
      onFinish();
    }
  }, [isExpired, onFinish]);

  if (remaining > 0) {
    const minutes = Math.floor(remaining / MINUTES_TO_MILLIS);
    const seconds = Math.floor(
      (remaining - minutes * MINUTES_TO_MILLIS) / 1000
    );
    return (
      <Alert variant="info">
        You have {minutes} {pluralize(minutes, "minute")} and {seconds}{" "}
        {pluralize(seconds, "second")} remaining to update.
      </Alert>
    );
  }

  return (
    <Alert variant="info">
      Your team admin has set a policy requiring you to apply updates.
    </Alert>
  );
};

const SnoozeButton: React.FC<{
  disabled: boolean;
  snooze: (durationMillis: number) => void;
}> = ({ disabled, snooze }) => (
  <DropdownButton
    aria-disabled={disabled}
    disabled={disabled}
    variant="info"
    id="dropdown-snooze"
    title="Remind Me Later"
  >
    <Dropdown.Item
      onClick={() => {
        snooze(FIFTEEN_MINUTES_MILLIS);
      }}
    >
      15 Minutes
    </Dropdown.Item>
    <Dropdown.Item
      onClick={() => {
        snooze(ONE_HOUR_MILLIS);
      }}
    >
      1 Hour
    </Dropdown.Item>
    <Dropdown.Item
      onClick={() => {
        snooze(ONE_DAY_MILLIS);
      }}
    >
      1 Day
    </Dropdown.Item>
    <Dropdown.Item
      onClick={() => {
        snooze(ONE_DAY_MILLIS * 3);
      }}
    >
      3 Days
    </Dropdown.Item>
  </DropdownButton>
);

/**
 * Modal to update the browser extension and/or deployments. Can be snoozed
 * @see DeploymentBanner
 * @see UpdateBanner
 */
const DeploymentModal: React.FC<
  Pick<
    DeploymentState,
    "extensionUpdateRequired" | "update" | "updateExtension"
  >
> = ({ extensionUpdateRequired, updateExtension, update }) => {
  const dispatch = useDispatch();
  const hasUpdatesAvailable = useUpdateAvailable();
  const { enforceUpdateMillis } = useSelector(selectAuth);

  const currentTime = Date.now();

  const {
    isSnoozed,
    isBrowserExtensionOverdue,
    isDeploymentUpdateOverdue,
    deploymentsTimestamp,
    browserExtensionTimestamp,
  } = useSelector((state: StateWithSettings) =>
    selectUpdatePromptState(state, { now: currentTime, enforceUpdateMillis })
  );

  useEffect(() => {
    if (hasUpdatesAvailable || extensionUpdateRequired) {
      dispatch(settingsSlice.actions.updateBrowserExtensionPromptTimestamp());
    } else {
      dispatch(settingsSlice.actions.updateDeploymentsPromptTimestamp());
    }
  }, [dispatch, hasUpdatesAvailable, extensionUpdateRequired, isSnoozed]);

  const snooze = useCallback(
    (durationMillis: number) => {
      notify.success("Snoozed extensions and deployment updates");
      reportEvent("SnoozeUpdates");
      dispatch(settingsSlice.actions.snoozeUpdates({ durationMillis }));
    },
    [dispatch]
  );

  if (isSnoozed) {
    return null;
  }

  if (hasUpdatesAvailable) {
    return (
      <Modal show>
        <Modal.Header>
          <Modal.Title>Update Available</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          An update to the PixieBrix browser extension is available. After
          updating, you will need need to reload any pages where PixieBrix is
          running.
        </Modal.Body>

        {enforceUpdateMillis && (
          <Modal.Body>
            <CountdownTimer
              duration={enforceUpdateMillis}
              start={browserExtensionTimestamp}
              onFinish={() => {
                browser.runtime.reload();
              }}
            />
          </Modal.Body>
        )}

        <Modal.Footer>
          <SnoozeButton disabled={isBrowserExtensionOverdue} snooze={snooze} />

          <AsyncButton variant="primary" onClick={updateExtension}>
            Update
          </AsyncButton>
        </Modal.Footer>
      </Modal>
    );
  }

  if (extensionUpdateRequired) {
    return (
      <Modal show>
        <Modal.Header>
          <Modal.Title>Update Available</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Update the PixieBrix Browser Extension to activate team deployments.
          After updating, you will need need to reload any pages where PixieBrix
          is running
        </Modal.Body>

        {enforceUpdateMillis && (
          <Modal.Body>
            <CountdownTimer
              duration={enforceUpdateMillis}
              start={deploymentsTimestamp}
              onFinish={() => {
                browser.runtime.reload();
              }}
            />
          </Modal.Body>
        )}

        <Modal.Footer>
          <SnoozeButton disabled={isDeploymentUpdateOverdue} snooze={snooze} />
          <AsyncButton variant="primary" onClick={updateExtension}>
            Update
          </AsyncButton>
        </Modal.Footer>
      </Modal>
    );
  }

  return (
    <Modal show>
      <Modal.Header>
        <Modal.Title>Team Deployments Available</Modal.Title>
      </Modal.Header>
      <Modal.Body>Team deployments are ready to activate</Modal.Body>

      {enforceUpdateMillis && (
        <Modal.Body>
          <CountdownTimer
            duration={enforceUpdateMillis}
            start={deploymentsTimestamp}
          />
        </Modal.Body>
      )}

      <Modal.Footer>
        <SnoozeButton disabled={isDeploymentUpdateOverdue} snooze={snooze} />
        <AsyncButton variant="primary" onClick={update}>
          Activate
        </AsyncButton>
      </Modal.Footer>
    </Modal>
  );
};

export default DeploymentModal;

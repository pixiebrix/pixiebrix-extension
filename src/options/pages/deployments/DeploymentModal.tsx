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
import { DeploymentState } from "@/hooks/useDeployments";
import AsyncButton from "@/components/AsyncButton";
import { DropdownButton, Dropdown, Modal } from "react-bootstrap";

const FIFTEEN_MINUTES_MILLIS = 900_000;
const ONE_HOUR_MILLIS = 3_600_000;
const ONE_DAY_MILLIS = 86_400_000;

const SnoozeButton: React.FC<{ snooze: DeploymentState["snooze"] }> = ({
  snooze,
}) => (
  <DropdownButton variant="info" id="dropdown-snooze" title="Remind Me Later">
    <Dropdown.Item onClick={async () => snooze(FIFTEEN_MINUTES_MILLIS)}>
      15 Minutes
    </Dropdown.Item>
    <Dropdown.Item onClick={async () => snooze(ONE_HOUR_MILLIS)}>
      1 Hour
    </Dropdown.Item>
    <Dropdown.Item onClick={async () => snooze(ONE_DAY_MILLIS)}>
      1 Day
    </Dropdown.Item>
  </DropdownButton>
);

/**
 * Modal to install deployments. Can be snoozed
 * @see DeploymentBanner
 */
const DeploymentModal: React.FC<DeploymentState> = ({
  extensionUpdateRequired,
  isSnoozed,
  snooze,
  updateExtension,
  update,
}) => {
  // FIXME: how does this interact with our onboarding modals? Does it?

  if (isSnoozed) {
    return null;
  }

  if (extensionUpdateRequired) {
    return (
      <Modal show>
        <Modal.Header>
          <Modal.Title>Update Available</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Update the PixieBrix Browser Extension to activate team deployments
        </Modal.Body>
        <Modal.Footer>
          <SnoozeButton snooze={snooze} />

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
      <Modal.Footer>
        <SnoozeButton snooze={snooze} />
        <AsyncButton variant="primary" onClick={update}>
          Activate
        </AsyncButton>
      </Modal.Footer>
    </Modal>
  );
};

export default DeploymentModal;

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

import React, { useCallback } from "react";
import useDeployments from "@/hooks/useDeployments";
import AsyncButton from "@/components/AsyncButton";
import { Modal, Dropdown } from "react-bootstrap";
import { useRouteMatch } from "react-router";
import browser from "webextension-polyfill";
import chromeP from "webext-polyfill-kinda";

const ONE_HOUR_MILLIS = 3_600_000;
const ONE_DAY_MILLIS = 86_400_000;

const SnoozeButton: React.FC = () => {
  // FIXME: how does this interact with our onboarding modals? Does it?

  const snooze = useCallback(async (timeMillis: number) => {
    // NOP
  }, []);

  return (
    <Dropdown>
      <Dropdown.Toggle variant="info" id="dropdown-snooze">
        Remind Me Later
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={async () => snooze(ONE_HOUR_MILLIS)}>
          One Hour
        </Dropdown.Item>
        <Dropdown.Item onClick={async () => snooze(ONE_DAY_MILLIS)}>
          Tomorrow
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

/**
 * Modal to install deployments. Can be snoozed
 * @see DeploymentBanner
 */
const DeploymentModal: React.FunctionComponent = () => {
  const { hasUpdate, update, extensionUpdateRequired } = useDeployments();

  // Only show on certain pages where the user expects to see a top-level install button. It's especially confusing
  // to show the banner on other pages with an activate button (e.g., the marketplace wizard, in the workshop, etc.)
  const matchRoot = useRouteMatch({ path: "/", exact: true });
  const matchInstalled = useRouteMatch({ path: "/installed", exact: true });
  const matchMarketplace = useRouteMatch({ path: "/blueprints", exact: true });

  const updateExtension = useCallback(async () => {
    await chromeP.runtime.requestUpdateCheck();
    browser.runtime.reload();
  }, []);

  if (!hasUpdate) {
    return null;
  }

  if (!(matchRoot || matchInstalled || matchMarketplace)) {
    return null;
  }

  if (extensionUpdateRequired) {
    return (
      <Modal show>
        <Modal.Header>
          <Modal.Title className="text-danger">Update Available</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Update the PixieBrix extension to activate team deployments
        </Modal.Body>
        <Modal.Footer>
          <SnoozeButton />

          <AsyncButton
            className="info ml-3"
            size="sm"
            onClick={updateExtension}
          >
            Update
          </AsyncButton>
        </Modal.Footer>
      </Modal>
    );
  }

  return (
    <Modal show>
      <Modal.Header>
        <Modal.Title className="text-danger">
          Team Deployments Available
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>Team deployments are ready to activate</Modal.Body>
      <Modal.Footer>
        <SnoozeButton />

        <AsyncButton className="info ml-3" size="sm" onClick={update}>
          Update
        </AsyncButton>
      </Modal.Footer>
    </Modal>
  );
};

export default DeploymentModal;

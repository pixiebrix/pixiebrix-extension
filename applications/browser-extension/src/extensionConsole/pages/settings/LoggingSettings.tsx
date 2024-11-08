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

import React from "react";
import { useLoggingConfig } from "@/hooks/logging";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Card, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faTrash } from "@fortawesome/free-solid-svg-icons";
import Loader from "@/components/Loader";
import AsyncButton from "@/components/AsyncButton";
import useUserAction from "@/hooks/useUserAction";
import { clearTraces } from "../../../telemetry/trace";
import { clearLogs } from "../../../telemetry/logging";
import SettingToggle from "./SettingToggle";
import useMessengerLogging from "@/development/hooks/useMessengerLogging";

const LoggingSettings: React.FunctionComponent = () => {
  const [logValues, setLogValues] = useLoggingConfig();
  const [logMessenger, setLogMessenger] = useMessengerLogging();

  const clearAction = useUserAction(
    async () => {
      await Promise.all([clearLogs(), clearTraces()]);
    },
    {
      successMessage: "Cleared local logs",
      errorMessage: "Error clearing local logs",
    },
    [],
  );

  return (
    <Card>
      <Card.Header>Developer Settings</Card.Header>
      <Card.Body>
        <Card.Text className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> Enable value logging to
          include brick inputs/outputs in the brick logs. You can access the
          logs from the Active Bricks screen, the Workshop, or the Page Editor.
        </Card.Text>
        <Card.Text className="text-info font-italic">
          Brick logs are never transmitted from your browser.
        </Card.Text>

        <Form>
          {logValues ? (
            <>
              <SettingToggle
                controlId="logging"
                label="Log values"
                isEnabled={logValues?.logValues}
                onChange={async (value: boolean) => {
                  await setLogValues({ ...logValues, logValues: value });
                }}
              />
              <hr />
            </>
          ) : (
            <Loader />
          )}
          <Card.Text className="text-info">
            <FontAwesomeIcon icon={faInfoCircle} /> Internal messaging can be
            temporarily logged to the browser console for debugging purposes.
          </Card.Text>
          <SettingToggle
            controlId="messenger-logging"
            label="Display messaging in browser console"
            isEnabled={logMessenger ?? false}
            onChange={setLogMessenger}
          />
        </Form>
      </Card.Body>
      <Card.Footer>
        <AsyncButton variant="info" onClick={clearAction}>
          <FontAwesomeIcon icon={faTrash} /> Clear Local Brick Logs
        </AsyncButton>
      </Card.Footer>
    </Card>
  );
};

export default LoggingSettings;

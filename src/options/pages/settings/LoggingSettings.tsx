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
import { useLoggingConfig } from "@/hooks/logging";
import { useToasts } from "react-toast-notifications";
import { Button, Card, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import Spinner from "@/components/Spinner";
import { clearLogs } from "@/background/logging";
import { reportError } from "@/telemetry/logging";
import { getErrorMessage } from "@/errors";

const LoggingSettings: React.FunctionComponent = () => {
  const [config, setConfig] = useLoggingConfig();
  const { addToast } = useToasts();

  return (
    <Card>
      <Card.Header>Developer Settings</Card.Header>
      <Card.Body>
        <Card.Text className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> Enable value logging to
          include brick inputs/outputs in the brick logs. Brick logs are never
          transmitted from your browser
        </Card.Text>

        {config ? (
          <Form>
            <Form.Group controlId="logging">
              <div>
                <Form.Label>
                  Log values: <i>{config.logValues ? "Enabled" : "Disabled"}</i>
                </Form.Label>
              </div>
              <BootstrapSwitchButton
                size="sm"
                onstyle="info"
                offstyle="light"
                onlabel=" "
                offlabel=" "
                checked={config.logValues}
                onChange={async (value) =>
                  setConfig({ ...config, logValues: value })
                }
              />
            </Form.Group>
          </Form>
        ) : (
          <Spinner />
        )}
      </Card.Body>
      <Card.Footer>
        <Button
          variant="info"
          onClick={async () => {
            try {
              await clearLogs();
              addToast("Cleared local logs", {
                appearance: "success",
                autoDismiss: true,
              });
            } catch (error: unknown) {
              reportError(error);
              addToast(`Error clearing local logs: ${getErrorMessage(error)}`, {
                appearance: "error",
                autoDismiss: true,
              });
            }
          }}
        >
          Clear Local Logs
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default LoggingSettings;

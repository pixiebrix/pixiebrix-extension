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
import { Card, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faTrash } from "@fortawesome/free-solid-svg-icons";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import GridLoader from "react-spinners/GridLoader";
import { clearLogs } from "@/background/logging";
import AsyncButton from "@/components/AsyncButton";
import useUserAction from "@/hooks/useUserAction";

const LoggingSettings: React.FunctionComponent = () => {
  const [config, setConfig] = useLoggingConfig();

  const clearAction = useUserAction(
    async () => {
      await clearLogs();
    },
    {
      successMessage: "Cleared local logs",
      errorMessage: "Error clearing local logs",
    },
    []
  );

  return (
    <Card>
      <Card.Header>Developer Settings</Card.Header>
      <Card.Body>
        <Card.Text className="text-info">
          <p>
            <FontAwesomeIcon icon={faInfoCircle} /> Enable value logging to
            include brick inputs/outputs in the brick logs. You can access the
            logs from the Active Bricks screen, the Workshop, or the Page
            Editor.
          </p>

          <p>
            <i>Brick logs are never transmitted from your browser.</i>
          </p>
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
          <GridLoader />
        )}
      </Card.Body>
      <Card.Footer>
        <AsyncButton variant="info" onClick={clearAction}>
          <FontAwesomeIcon icon={faTrash} /> Clear Local Logs
        </AsyncButton>
      </Card.Footer>
    </Card>
  );
};

export default LoggingSettings;

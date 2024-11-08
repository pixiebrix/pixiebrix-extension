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
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Card, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { useDNT } from "../../../telemetry/dnt";
import SettingToggle from "./SettingToggle";

const PrivacySettings: React.FunctionComponent = () => {
  const [dnt, setDNT] = useDNT();

  return (
    <Card>
      <Card.Header>Privacy</Card.Header>
      <Card.Body>
        <Card.Text className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> PixieBrix collects error
          telemetry and usage metrics to help us improve the product.
        </Card.Text>

        <Card.Text>
          We never collect any browser content or history. See our{" "}
          <a href="https://www.pixiebrix.com/privacy/">Privacy Policy</a> for a
          detailed list of what information we track and why.
        </Card.Text>

        <Form>
          <SettingToggle
            controlId="telemetry"
            label="Telemetry"
            isEnabled={!dnt}
            onChange={async (value: boolean) => setDNT(!value)}
          />
        </Form>
      </Card.Body>
    </Card>
  );
};

export default PrivacySettings;

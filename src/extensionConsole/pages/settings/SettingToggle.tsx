/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { Form } from "react-bootstrap";
import BootstrapSwitchButton from "bootstrap-switch-button-react";

const SettingToggle: React.FunctionComponent<{
  controlId: string;
  label: string;
  description?: string;
  isEnabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({ controlId, label, description, isEnabled, onChange, disabled }) => (
  <Form.Group controlId={controlId}>
    <div>
      <Form.Label>
        {label}: <i>{isEnabled ? "Enabled" : "Disabled"}</i>
      </Form.Label>
      {description && (
        <Form.Text muted className="mb-2">
          {description}
        </Form.Text>
      )}
    </div>
    {!disabled && (
      <BootstrapSwitchButton
        size="sm"
        onstyle="info"
        offstyle="light"
        onlabel=" "
        offlabel=" "
        checked={isEnabled}
        onChange={onChange}
      />
    )}
  </Form.Group>
);

export default SettingToggle;

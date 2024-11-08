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
import { Form } from "react-bootstrap";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { type SettingsFlags } from "../../../store/settings/settingsTypes";
import reportEvent from "../../../telemetry/reportEvent";
import { Events } from "../../../telemetry/events";
import settingsSlice from "../../../store/settings/settingsSlice";
import { useDispatch } from "react-redux";

interface CommonProps {
  controlId: string;
  label: string;
  description?: string;
  isEnabled: boolean;
  disabled?: boolean;
}

type ToggleOverrideProps = CommonProps & {
  flag?: never;
  onChange: (checked: boolean) => void;
};

type FlagProps = CommonProps & {
  flag: keyof SettingsFlags;
  onChange?: never;
};

type SettingToggleProps = ToggleOverrideProps | FlagProps;

const SettingToggle: React.FunctionComponent<SettingToggleProps> = ({
  flag,
  controlId,
  label,
  description,
  isEnabled,
  onChange,
  disabled,
}) => {
  const dispatch = useDispatch();

  const flagChangeHandlerFactory =
    (flag: keyof SettingsFlags) => (value: boolean) => {
      reportEvent(Events.SETTINGS_EXPERIMENTAL_CONFIGURE, {
        name: flag,
        value,
      });

      dispatch(
        settingsSlice.actions.setFlag({
          flag,
          value,
        }),
      );
    };

  return (
    <Form.Group controlId={controlId}>
      <div>
        <Form.Label>
          {label}: <em>{isEnabled ? "Enabled" : "Disabled"}</em>
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
          onChange={onChange ?? flagChangeHandlerFactory(flag)}
        />
      )}
    </Form.Group>
  );
};

export default SettingToggle;

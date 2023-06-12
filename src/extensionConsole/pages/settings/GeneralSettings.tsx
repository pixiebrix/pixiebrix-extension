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
import { Card, Form } from "react-bootstrap";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import settingsSlice from "@/store/settingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import { reportEvent } from "@/telemetry/events";

const GeneralSettings: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { isFloatingActionButtonEnabled } = useSelector(selectSettings);
  return (
    <Card>
      <Card.Header>General Settings</Card.Header>
      <Card.Body>
        <Form>
          <Form.Group controlId="floating-action-button">
            <div>
              <Form.Label>
                Floating action button{" "}
                <i>{isFloatingActionButtonEnabled ? "Enabled" : "Disabled"}</i>
              </Form.Label>
              <Form.Text muted className="mb-2">
                Toggle on to enable floating button that opens the Quick Bar
              </Form.Text>
            </div>
            <BootstrapSwitchButton
              size="sm"
              onstyle="info"
              offstyle="light"
              onlabel=" "
              offlabel=" "
              checked={isFloatingActionButtonEnabled}
              onChange={(enable) => {
                reportEvent("EnableFloatingQuickBarButton", {
                  enabled: enable,
                });
                dispatch(
                  settingsSlice.actions.setFloatingActionButtonEnabled(enable)
                );
              }}
            />
          </Form.Group>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default GeneralSettings;

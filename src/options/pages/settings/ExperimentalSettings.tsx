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
import { Card, Form } from "react-bootstrap";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { useDispatch, useSelector } from "react-redux";
import settingsSlice from "@/store/settingsSlice";
import { faFlask } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { selectSettings } from "@/store/settingsSelectors";

const ExperimentalSettings: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { suggestElements, excludeRandomClasses } = useSelector(selectSettings);

  return (
    <Card>
      <Card.Header>
        Skunkworks <FontAwesomeIcon icon={faFlask} />
      </Card.Header>
      <Card.Body>
        <Form>
          <Form.Group controlId="suggestElements">
            <div>
              <Form.Label>
                Suggest Elements in Selection Mode:{" "}
                <i>{suggestElements ? "Enabled" : "Disabled"}</i>
              </Form.Label>
              <Form.Text muted className="mb-2">
                Toggle on to enable element suggestions/filtering in Page Editor
                selection mode
              </Form.Text>
            </div>
            <BootstrapSwitchButton
              size="sm"
              onstyle="info"
              offstyle="light"
              onlabel=" "
              offlabel=" "
              checked={suggestElements}
              onChange={async (value) => {
                dispatch(
                  settingsSlice.actions.setFlag({
                    flag: "suggestElements",
                    value,
                  })
                );
              }}
            />
          </Form.Group>
          <Form.Group controlId="excludeRandomClasses">
            <div>
              <Form.Label>
                Detect and Exclude Random Classes from Selectors:{" "}
                <i>{excludeRandomClasses ? "Enabled" : "Disabled"}</i>
              </Form.Label>
              <Form.Text muted className="mb-2">
                Toggle on to avoid using randomly-generated classes when picking
                elements from a website
              </Form.Text>
            </div>
            <BootstrapSwitchButton
              size="sm"
              onstyle="info"
              offstyle="light"
              onlabel=" "
              offlabel=" "
              checked={excludeRandomClasses}
              onChange={async (value) => {
                dispatch(
                  settingsSlice.actions.setFlag({
                    flag: "excludeRandomClasses",
                    value,
                  })
                );
              }}
            />
          </Form.Group>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ExperimentalSettings;

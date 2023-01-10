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
import { useDispatch, useSelector } from "react-redux";
import settingsSlice from "@/store/settingsSlice";
import { faFlask } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { selectSettings } from "@/store/settingsSelectors";
import { type SkunkworksSettings } from "@/store/settingsTypes";

const ExperimentalFeature: React.FunctionComponent<{
  id: keyof SkunkworksSettings;
  label: string;
  description: string;
  isEnabled: boolean;
  onChange: (value: boolean) => void;
}> = ({ id, label, description, isEnabled, onChange }) => (
  <Form.Group controlId={id}>
    <div>
      <Form.Label>
        {label} <i>{isEnabled ? "Enabled" : "Disabled"}</i>
      </Form.Label>
      <Form.Text muted className="mb-2">
        {description}
      </Form.Text>
    </div>
    <BootstrapSwitchButton
      size="sm"
      onstyle="info"
      offstyle="light"
      onlabel=" "
      offlabel=" "
      checked={isEnabled}
      onChange={onChange}
    />
  </Form.Group>
);

const ExperimentalSettings: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const {
    suggestElements,
    excludeRandomClasses,
    selectionTools,
    varAnalysis,
    varAutosuggest,
  } = useSelector(selectSettings);

  return (
    <Card>
      <Card.Header>
        Skunkworks <FontAwesomeIcon icon={faFlask} />
      </Card.Header>
      <Card.Body>
        <Form>
          <ExperimentalFeature
            id="suggestElements"
            label="Suggest Elements in Selection Mode:"
            description="Toggle on to enable element suggestions/filtering in Page Editor
            selection mode"
            isEnabled={suggestElements}
            onChange={(value) => {
              dispatch(
                settingsSlice.actions.setFlag({
                  flag: "suggestElements",
                  value,
                })
              );
            }}
          />
          <ExperimentalFeature
            id="excludeRandomClasses"
            label="Detect and Exclude Random Classes from Selectors:"
            description="Toggle on to avoid using randomly-generated classes when picking
            elements from a website"
            isEnabled={excludeRandomClasses}
            onChange={(value) => {
              dispatch(
                settingsSlice.actions.setFlag({
                  flag: "excludeRandomClasses",
                  value,
                })
              );
            }}
          />
          <ExperimentalFeature
            id="selectionTools"
            label="Detect and Support Multi-Element Selection Tools:"
            description="Toggle on to support multi-element selection tools"
            isEnabled={selectionTools}
            onChange={(value) => {
              dispatch(
                settingsSlice.actions.setFlag({
                  flag: "selectionTools",
                  value,
                })
              );
            }}
          />
          <ExperimentalFeature
            id="varAnalysis"
            label="Perform Analysis of Variables in Page Editor:"
            description="Toggle on to enable validation of variables in Page Editor. Shows a warning if use of an undefined variable is detected"
            isEnabled={varAnalysis}
            onChange={(value) => {
              dispatch(
                settingsSlice.actions.setFlag({
                  flag: "varAnalysis",
                  value,
                })
              );
            }}
          />
          <ExperimentalFeature
            id="varAutosuggest"
            label="Autosuggest Variables in Page Editor. You must also enable Analysis of Variables to use this feature:"
            description="Toggle on to enable variable autosuggest for variable and text template entry modes"
            isEnabled={varAutosuggest}
            onChange={(value) => {
              dispatch(
                settingsSlice.actions.setFlag({
                  flag: "varAutosuggest",
                  value,
                })
              );
            }}
          />
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ExperimentalSettings;

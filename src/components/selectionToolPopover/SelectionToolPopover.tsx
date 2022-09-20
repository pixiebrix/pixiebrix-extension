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

import React, { ChangeEvent, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import ReactShadowRoot from "react-shadow-root";
import bootstrap from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import Draggable from "react-draggable";

import FieldSection from "@/pageEditor/fields/FieldSection";
import SwitchButtonWidget, {
  CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import switchStyle from "@/components/form/widgets/switchButton/SwitchButtonWidget.module.scss?loadAsUrl";
import switchButtonStyle from "bootstrap-switch-button-react/src/style.css?loadAsUrl";
import custom from "./SelectionToolPopover.module.scss?loadAsUrl";
import { Stylesheets } from "@/components/Stylesheets";
import { Button } from "react-bootstrap";
import { FormLabel } from "react-bootstrap";

export type SelectionHandlerType = (count: number) => void;
type SetSelectionHandlerType = (handler: SelectionHandlerType) => void;

export const SelectionToolPopover: React.FC<{
  onCancel: () => void;
  onDone: () => void;
  onChangeMultiSelection: (value: boolean) => void;
  setSelectionHandler: SetSelectionHandlerType;
}> = ({ onCancel, onDone, onChangeMultiSelection, setSelectionHandler }) => {
  const [enabled, setEnabled] = useState(false);
  const [matchingCount, setMatchingCount] = useState(0);

  useEffect(() => {
    const handler = (newCount: number) => {
      setMatchingCount(newCount);
    };

    setSelectionHandler(handler);
    return () => {
      setSelectionHandler(null);
    };
  }, [setSelectionHandler]);

  return (
    <ReactShadowRoot mode="closed">
      <Stylesheets href={[bootstrap, switchStyle, switchButtonStyle, custom]}>
        <Draggable>
          <div className="popover-wrapper">
            <FieldSection
              title={`Selection Tool: ${matchingCount} matching Elements`}
            >
              <div className="d-flex align-items-center">
                <SwitchButtonWidget
                  name="allowMulti"
                  value={enabled}
                  onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
                    setEnabled(target.value);
                    onChangeMultiSelection(target.value);
                  }}
                />
                <FormLabel className="align-middle mx-3">
                  Select Multiple
                </FormLabel>

                <Button size="sm" variant="info" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  className="info ml-1"
                  size="sm"
                  variant="primary"
                  onClick={onDone}
                >
                  Done
                </Button>
              </div>
            </FieldSection>
          </div>
        </Draggable>
      </Stylesheets>
    </ReactShadowRoot>
  );
};

export const showSelectionToolPopover = ({
  rootElement,
  handleCancel,
  handleDone,
  handleChange,
  setSelectionHandler,
}: {
  rootElement: HTMLElement;
  handleCancel: () => void;
  handleDone: () => void;
  handleChange: (value: boolean) => void;
  setSelectionHandler: SetSelectionHandlerType;
}) => {
  ReactDOM.render(
    <SelectionToolPopover
      onDone={handleDone}
      onCancel={handleCancel}
      onChangeMultiSelection={handleChange}
      setSelectionHandler={setSelectionHandler}
    />,
    rootElement
  );
};

export default SelectionToolPopover;

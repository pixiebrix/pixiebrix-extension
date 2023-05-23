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

import React, { type ChangeEvent, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import bootstrap from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import Draggable from "react-draggable";
import EmotionShadowRoot from "react-shadow/emotion";
import SwitchButtonWidget, {
  type CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import switchStyle from "@/components/form/widgets/switchButton/SwitchButtonWidget.module.scss?loadAsUrl";
import switchButtonStyle from "bootstrap-switch-button-react/src/style.css?loadAsUrl";
import custom from "./SelectionToolPopover.module.scss?loadAsUrl";
import { Stylesheets } from "@/components/Stylesheets";
import { Button, FormLabel } from "react-bootstrap";
import pluralize from "@/utils/pluralize";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripHorizontal } from "@fortawesome/free-solid-svg-icons";

export type SelectionHandlerType = (count: number) => void;
type SetSelectionHandlerType = (handler: SelectionHandlerType) => void;

const SelectionToolPopover: React.FC<{
  onCancel: () => void;
  onDone: () => void;
  onChangeMultiSelection: (value: boolean) => void;
  onChangeSimilarSelection: (value: boolean) => void;
  setSelectionHandler: SetSelectionHandlerType;
}> = ({
  onCancel,
  onDone,
  onChangeMultiSelection,
  onChangeSimilarSelection,
  setSelectionHandler,
}) => {
  const [multiEnabled, setMultiEnabled] = useState(false);
  const [similarEnabled, setSimilarEnabled] = useState(false);
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
    <EmotionShadowRoot.div>
      <Stylesheets href={[bootstrap, switchStyle, switchButtonStyle, custom]}>
        <Draggable>
          <div className="popover-wrapper">
            <div className="popover-wrapper-header">
              <FontAwesomeIcon icon={faGripHorizontal} size="1x" />
              {`Selection Tool: ${matchingCount} ${pluralize(
                matchingCount,
                "matching element",
                "matching elements"
              )}`}
            </div>
            <div className="d-flex align-items-center popover-wrapper-body">
              <SwitchButtonWidget
                name="allowMulti"
                value={multiEnabled}
                onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
                  setMultiEnabled(target.value);
                  if (!target.value) {
                    setSimilarEnabled(false);
                  }

                  onChangeMultiSelection(target.value);
                }}
              />
              <FormLabel className="align-middle mx-3 mb-0">
                Select Multiple
              </FormLabel>

              {multiEnabled && (
                <>
                  <SwitchButtonWidget
                    name="allowSimilar"
                    value={similarEnabled}
                    onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
                      setSimilarEnabled(target.value);
                      onChangeSimilarSelection(target.value);
                    }}
                  />
                  <FormLabel className="align-middle mx-3 mb-0">
                    Select Similar
                  </FormLabel>
                </>
              )}

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
          </div>
        </Draggable>
      </Stylesheets>
    </EmotionShadowRoot.div>
  );
};

export const showSelectionToolPopover = ({
  rootElement,
  handleCancel,
  handleDone,
  handleMultiChange,
  handleSimilarChange,
  setSelectionHandler,
}: {
  rootElement: HTMLElement;
  handleCancel: () => void;
  handleDone: () => void;
  handleMultiChange: (value: boolean) => void;
  handleSimilarChange: (value: boolean) => void;
  setSelectionHandler: SetSelectionHandlerType;
}) => {
  ReactDOM.render(
    <SelectionToolPopover
      onDone={handleDone}
      onCancel={handleCancel}
      onChangeMultiSelection={handleMultiChange}
      onChangeSimilarSelection={handleSimilarChange}
      setSelectionHandler={setSelectionHandler}
    />,
    rootElement
  );
};

export default SelectionToolPopover;

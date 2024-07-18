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
import "@/vendors/bootstrapWithoutRem.css";
import "bootstrap-switch-button-react/src/style.css";
import styles from "./SelectionToolPopover.module.scss";

import React, { type ChangeEvent, useEffect, useState } from "react";
import Draggable from "react-draggable";
import SwitchButtonWidget, {
  type CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { Button, FormLabel } from "react-bootstrap";
import pluralize from "@/utils/pluralize";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripHorizontal } from "@fortawesome/free-solid-svg-icons";

export type SelectionHandlerType = (count: number) => void;
export type SetSelectionHandlerType = (
  handler: SelectionHandlerType | null,
) => void;

const SelectionToolPopover: React.FC<{
  isMulti: boolean;
  onCancel: () => void;
  onDone: () => void;
  onChangeMultiSelection: (value: boolean) => void;
  onChangeSimilarSelection: (value: boolean) => void;
  setSelectionHandler: SetSelectionHandlerType;
}> = ({
  isMulti,
  onCancel,
  onDone,
  onChangeMultiSelection,
  onChangeSimilarSelection,
  setSelectionHandler,
}) => {
  const [multiEnabled, setMultiEnabled] = useState(isMulti);
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
    <Draggable>
      <div className={styles.root}>
        <div className={styles.header}>
          <FontAwesomeIcon icon={faGripHorizontal} size="1x" />
          {`Selection Tool: ${matchingCount} ${pluralize(
            matchingCount,
            "matching element",
            "matching elements",
          )}`}
        </div>
        <div className={styles.body}>
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
            onClick={() => {
              // Avoid passing event to onDone method in case the provided method takes an optional argument
              onDone();
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </Draggable>
  );
};

export default SelectionToolPopover;

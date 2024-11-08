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

import React, { useMemo, useState } from "react";
import { type SchemaFieldProps } from "../../propTypes";
import { type InputModeOption } from "../templateToggleWidgetTypes";
import styles from "./CssSpacingWidget.module.scss";
import { UnstyledButton } from "../../../../UnstyledButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import {
  calculateNextSpacing,
  extractSpacing,
  parseValue,
} from "./utils";
import {
  type Spacing,
  type Value,
} from "./types";
import { useField } from "formik";

import Select from "react-select";
import { type Option } from "../../../../form/widgets/SelectWidget";
import cx from "classnames";

export interface CssSpacingWidgetControls {
  margin: boolean;
  padding: boolean;
}

const defaultOptions: CssSpacingWidgetControls = {
  margin: true,
  padding: true,
};

const spacingSides = [
  { label: "Top", side: "t" },
  { label: "Right", side: "r" },
  { label: "Bottom", side: "b" },
  { label: "Left", side: "l" },
];

const paddingOptions: Option[] = [
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
];

const marginOptions: Option[] = [
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "-5", value: "-5" },
  { label: "-4", value: "-4" },
  { label: "-3", value: "-3" },
  { label: "-2", value: "-2" },
  { label: "-1", value: "-1" },
];

function getValue(options: Option[], spacing: Spacing[], side: string | null) {
  const numberValue = spacing.find((x) => x.side === side)?.size;
  return (
    options.find((option) => option.value === numberValue?.toString()) ?? null
  );
}

const SpacingControl: React.VFC<{
  prefix: string;
  label: string;
  className?: string;
  classes: string[];
  disabled: boolean;
  onUpdate: (update: Spacing) => void;
  options: Option[];
  placeholder: string;
}> = ({
  prefix,
  label,
  className,
  classes,
  disabled,
  onUpdate,
  options,
  placeholder,
}) => {
  const [expand, setExpand] = useState(false);

  const spacing = useMemo(
    () => extractSpacing(prefix, classes),
    [prefix, classes],
  );

  return (
    <div className={className}>
      <div className={styles.spacingControlContainer}>
        <UnstyledButton
          className={styles.expandButton}
          onClick={() => {
            setExpand(!expand);
          }}
        >
          <label htmlFor={`${prefix}-input`}>
            {label}&nbsp;
            <FontAwesomeIcon icon={expand ? faCaretDown : faCaretRight} />
          </label>
        </UnstyledButton>
        <div className="ml-5">
          <Select
            inputId={`${prefix}-input`}
            options={options}
            value={getValue(options, spacing, null)}
            className={styles.spacingControlSelect}
            isClearable
            isDisabled={disabled}
            menuPlacement="auto"
            placeholder={placeholder}
            onChange={(event) => {
              onUpdate({
                side: null,
                size: event ? Number(event.value) : null,
              });
            }}
          />
        </div>
      </div>
      {expand && (
        <div className="pl-5">
          {spacingSides.map((direction) => (
            <div
              key={direction.side}
              className={styles.spacingControlContainer}
            >
              <label htmlFor={`${prefix}-${direction.side}-input`}>
                {direction.label}
              </label>
              <Select
                options={options}
                inputId={`${prefix}-${direction.side}-input`}
                value={getValue(options, spacing, direction.side)}
                className={styles.spacingControlSelect}
                isClearable
                isDisabled={disabled}
                menuPlacement="auto"
                placeholder={placeholder}
                onChange={(option) => {
                  onUpdate({
                    side: direction.side,
                    size: option ? Number(option.value) : null,
                  });
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CssSpacingWidget: React.VFC<
  SchemaFieldProps & { inputModeOptions: InputModeOption[] }
> = (props) => {
  const { name, uiSchema } = props;

  const controlOptions: CssSpacingWidgetControls = {
    ...defaultOptions,
    ...uiSchema?.["ui:options"],
  };

  const [{ value }, , { setValue }] = useField<Value>(name);

  const { classes, isVar, includesTemplate } = useMemo(
    () => parseValue(value),
    [value],
  );

  const disableControls = isVar || includesTemplate;

  return controlOptions.margin || controlOptions.padding ? (
    <div className={cx("d-flex", styles.spacingControlWrapper)}>
      {controlOptions.margin && (
        <SpacingControl
          prefix="m"
          label="Margin"
          placeholder="Select -5 to 5"
          classes={classes}
          disabled={disableControls}
          options={marginOptions}
          onUpdate={async (option) => {
            try {
              await setValue(calculateNextSpacing(value, "m", option));
            } catch (error) {
              reportError(error);
            }
          }}
        />
      )}

      {controlOptions.padding && (
        <SpacingControl
          prefix="p"
          label="Padding"
          placeholder="Select 0 to 5"
          classes={classes}
          disabled={disableControls}
          options={paddingOptions}
          onUpdate={async (option) => {
            try {
              await setValue(calculateNextSpacing(value, "p", option));
            } catch (error) {
              reportError(error);
            }
          }}
        />
      )}
    </div>
  ) : null;
};

export default CssSpacingWidget;

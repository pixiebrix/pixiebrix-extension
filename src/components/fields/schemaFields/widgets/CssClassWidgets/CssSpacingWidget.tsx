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

import React, { useMemo, useState } from "react";
import { parseValue } from "@/components/fields/schemaFields/widgets/CssClassWidgets/CssClassWidget";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { type InputModeOption } from "@/components/fields/schemaFields/widgets/templateToggleWidgetTypes";
import styles from "./CssSpacingWidget.module.scss";
import { UnstyledButton } from "@/components/UnstyledButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import {
  calculateNextSpacing,
  extractSpacing,
  type Spacing,
  type Value,
} from "@/components/fields/schemaFields/widgets/CssClassWidgets/utils";
import {
  // eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
  Form,
} from "react-bootstrap";
import { useField } from "formik";

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

const SpacingControl: React.VFC<{
  prefix: string;
  label: string;
  className?: string;
  classes: string[];
  disabled: boolean;
  onUpdate: (update: Spacing) => void;
}> = ({ prefix, label, className, classes, disabled, onUpdate }) => {
  const [expand, setExpand] = useState(false);

  const spacing = extractSpacing(prefix, classes);

  return (
    <div className={className}>
      <div className={styles.spacingControlContainer}>
        <UnstyledButton
          onClick={() => {
            setExpand(!expand);
          }}
        >
          {label}&nbsp;
          <FontAwesomeIcon icon={expand ? faCaretDown : faCaretRight} />
        </UnstyledButton>
        <div className="ml-1">
          <Form.Control
            type="number"
            min="0"
            max="5"
            value={spacing.find((x) => x.side == null)?.size}
            disabled={disabled}
            onChange={(event) => {
              onUpdate({
                side: null,
                size: Number(event.target.value),
              });
            }}
          />
        </div>
      </div>
      {expand && (
        <div className="pl-2">
          {spacingSides.map((direction) => (
            <div
              key={direction.side}
              className={styles.spacingControlContainer}
            >
              <div>
                {label} {direction.label}
              </div>
              <div className="ml-1">
                <Form.Control
                  type="number"
                  min="0"
                  max="5"
                  value={spacing.find((x) => x.side === direction.side)?.size}
                  disabled={disabled}
                  onChange={(event) => {
                    onUpdate({
                      side: direction.side,
                      size: Number(event.target.value),
                    });
                  }}
                />
              </div>
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
    ...uiSchema,
  };

  const [{ value }, , { setValue }] = useField<Value>(name);

  const { classes, isVar, includesTemplate } = useMemo(
    () => parseValue(value),
    [value]
  );

  const disableControls = isVar || includesTemplate;

  return (
    (controlOptions.margin || controlOptions.padding) && (
      <div>
        <div className="d-flex my-2">
          {controlOptions.margin && (
            <SpacingControl
              prefix="m"
              label="Margin"
              className="mr-2"
              classes={classes}
              disabled={disableControls}
              onUpdate={async (update) => {
                await setValue(calculateNextSpacing(value, "m", update));
              }}
            />
          )}
          {controlOptions.padding && (
            <SpacingControl
              prefix="p"
              label="Padding"
              className="mx-2"
              classes={classes}
              disabled={disableControls}
              onUpdate={async (update) => {
                await setValue(calculateNextSpacing(value, "p", update));
              }}
            />
          )}
        </div>
      </div>
    )
  );
};

export default CssSpacingWidget;

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

import React, { useCallback, useMemo } from "react";
import { type SchemaFieldProps } from "../../propTypes";
import { Button, ButtonGroup, Dropdown, DropdownButton } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignCenter,
  faAlignJustify,
  faAlignLeft,
  faAlignRight,
  faBold,
  faBorderStyle,
  faCheck,
  faFill,
  faFont,
  faItalic,
} from "@fortawesome/free-solid-svg-icons";
import { useField } from "formik";
import TemplateToggleWidget from "../TemplateToggleWidget";
import { type InputModeOption } from "../templateToggleWidgetTypes";
import styles from "./CssClassWidget.module.scss";
import { type Expression } from "../../../../../types/runtimeTypes";
import {
  calculateNextValue,
  parseValue,
} from "./utils";
import { type ClassFlag } from "./types";

export const optionsGroups = {
  textAlign: [
    { className: "text-left", title: <FontAwesomeIcon icon={faAlignLeft} /> },
    {
      className: "text-center",
      title: <FontAwesomeIcon icon={faAlignCenter} />,
    },
    { className: "text-right", title: <FontAwesomeIcon icon={faAlignRight} /> },
    {
      className: "text-justify",
      title: <FontAwesomeIcon icon={faAlignJustify} />,
    },
  ],
  textVariant: [
    {
      className: "text-default",
      title: <span className="text-default">Default</span>,
    },
    {
      className: "text-primary",
      title: <span className="text-primary">Primary</span>,
    },
    {
      className: "text-secondary",
      title: <span className="secondary">Secondary</span>,
    },
    { className: "text-info", title: <span className="text-info">Info</span> },
    {
      className: "text-warning",
      title: <span className="text-warning">Warning</span>,
    },
    {
      className: "text-danger",
      title: <span className="text-danger">Danger</span>,
    },
    {
      className: "text-success",
      title: <span className="text-success">Success</span>,
    },
    {
      className: "text-muted",
      title: <span className="text-muted">Muted</span>,
    },
    {
      className: "text-white",
      title: <span>White</span>,
    },
  ],
  backgroundColor: [
    {
      className: "bg-primary",
      title: <span className="bg-primary text-white">Primary</span>,
    },
    {
      className: "bg-secondary",
      title: <span className="bg-secondary text-white">Secondary</span>,
    },
    {
      className: "bg-success",
      title: <span className="bg-success text-white">Success</span>,
    },
    {
      className: "bg-info",
      title: <span className="bg-info text-white">Info</span>,
    },
    {
      className: "bg-warning",
      title: <span className="bg-warning">Warning</span>,
    },
    {
      className: "bg-danger",
      title: <span className="bg-danger text-white">Danger</span>,
    },
    {
      className: "bg-dark",
      title: <span className="bg-dark text-white">Dark</span>,
    },
    {
      className: "bg-light",
      title: <span className="bg-light">Light</span>,
    },
    {
      className: "bg-white",
      title: <span className="bg-white">White</span>,
    },
  ],
  borders: [
    {
      className: "border",
      title: "All Borders",
      implies: ["border-top", "border-right", "border-bottom", "border-left"],
      exclusive: true,
    },
    {
      className: "border-top",
      title: "Border Top",
      exclusive: false,
    },
    {
      className: "border-right",
      title: "Border Right",
      exclusive: false,
    },
    {
      className: "border-bottom",
      title: "Border Bottom",
      exclusive: false,
    },
    {
      className: "border-left",
      title: "Border Left",
      exclusive: false,
    },
  ],
};

type Value = string | Expression;

const FlagButton: React.VFC<
  ClassFlag & {
    disabled: boolean;
    classes: string[];
    toggleClass: (className: string, on: boolean, group?: ClassFlag[]) => void;
    group?: ClassFlag[];
  }
> = ({ className, classes, title, toggleClass, group, disabled }) => {
  const active = classes.includes(className);

  return (
    <Button
      className={styles.flagButton}
      disabled={disabled}
      variant="light"
      size="sm"
      active={active}
      aria-label={className}
      onClick={() => {
        toggleClass(className, !active, group);
      }}
    >
      {title}
    </Button>
  );
};

const FlagItem: React.VFC<
  ClassFlag & {
    classes: string[];
    toggleClass: (className: string, on: boolean, group?: ClassFlag[]) => void;
    group?: ClassFlag[];
  }
> = ({ className, classes, title, toggleClass, group }) => {
  const active = classes.includes(className);

  return (
    <Dropdown.Item
      active={active}
      onClick={() => {
        toggleClass(className, !active, group);
      }}
    >
      {active ? (
        <FontAwesomeIcon icon={faCheck} fixedWidth />
      ) : (
        <FontAwesomeIcon
          icon={faCheck}
          fixedWidth
          style={{ visibility: "hidden" }}
        />
      )}
      <span className="ml-2">{title}</span>
    </Dropdown.Item>
  );
};

export interface CssClassWidgetControls {
  textAlign: boolean;
  bold: boolean;
  italic: boolean;
  textVariant: boolean;
  backgroundColor: boolean;
  borders: boolean;
}

const defaultOptions: CssClassWidgetControls = {
  textAlign: true,
  bold: true,
  italic: true,
  textVariant: true,
  backgroundColor: true,
  borders: true,
};

/**
 * A widget for customizing Bootstrap 4 utility classes.
 *
 * CSS classes are available in the document builder.
 */
const CssClassWidget: React.VFC<
  SchemaFieldProps & { inputModeOptions: InputModeOption[] }
> = (props) => {
  const { name, uiSchema } = props;

  const controlOptions: CssClassWidgetControls = {
    ...defaultOptions,
    ...uiSchema?.["ui:options"],
  };

  const [{ value }, , { setValue }] = useField<Value>(name);

  const { classes, isVar, includesTemplate } = useMemo(
    () => parseValue(value),
    [value],
  );

  const toggleClass = useCallback(
    async (className: string, on: boolean, group?: ClassFlag[]) => {
      await setValue(calculateNextValue(value, className, on, group));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Formik bug where setValue changes on each render
    [value],
  );

  const disableControls = isVar || includesTemplate;

  return (
    <div>
      <div className="mt-2">
        {controlOptions.textAlign && (
          <ButtonGroup>
            {optionsGroups.textAlign.map((flag) => (
              <FlagButton
                key={flag.className}
                disabled={disableControls}
                {...flag}
                classes={classes}
                toggleClass={toggleClass}
                group={optionsGroups.textAlign}
              />
            ))}
          </ButtonGroup>
        )}

        {(controlOptions.bold || controlOptions.italic) && (
          <ButtonGroup className="mx-2">
            {controlOptions.bold && (
              <FlagButton
                className="font-weight-bold"
                title={<FontAwesomeIcon icon={faBold} />}
                disabled={disableControls}
                classes={classes}
                toggleClass={toggleClass}
              />
            )}
            {controlOptions.italic && (
              <FlagButton
                className="font-italic"
                title={<FontAwesomeIcon icon={faItalic} />}
                disabled={disableControls}
                classes={classes}
                toggleClass={toggleClass}
              />
            )}
          </ButtonGroup>
        )}

        {controlOptions.textVariant && (
          <ButtonGroup className="mx-2">
            <DropdownButton
              title={
                <span
                  className={
                    optionsGroups.textVariant.find((x) =>
                      classes.includes(x.className),
                    )?.className
                  }
                >
                  <FontAwesomeIcon icon={faFont} />
                </span>
              }
              disabled={disableControls}
              variant="light"
              size="sm"
            >
              {optionsGroups.textVariant.map((flag) => (
                <FlagItem
                  key={flag.className}
                  {...flag}
                  classes={classes}
                  toggleClass={toggleClass}
                  group={optionsGroups.textVariant}
                />
              ))}
            </DropdownButton>
          </ButtonGroup>
        )}

        {controlOptions.backgroundColor && (
          <ButtonGroup className="mx-2">
            <DropdownButton
              title={
                <span
                  className={
                    optionsGroups.backgroundColor.find((x) =>
                      classes.includes(x.className),
                    )?.className
                  }
                >
                  <FontAwesomeIcon icon={faFill} />
                </span>
              }
              disabled={disableControls}
              variant="light"
              size="sm"
            >
              {optionsGroups.backgroundColor.map((flag) => (
                <FlagItem
                  key={flag.className}
                  {...flag}
                  classes={classes}
                  toggleClass={toggleClass}
                  group={optionsGroups.backgroundColor}
                />
              ))}
            </DropdownButton>
          </ButtonGroup>
        )}

        {controlOptions.borders && (
          <ButtonGroup className="mx-2">
            <DropdownButton
              title={<FontAwesomeIcon icon={faBorderStyle} />}
              disabled={disableControls}
              variant="light"
              size="sm"
            >
              {optionsGroups.borders.map((flag) => (
                <FlagItem
                  key={flag.className}
                  {...flag}
                  classes={classes}
                  toggleClass={toggleClass}
                  group={optionsGroups.borders}
                />
              ))}
            </DropdownButton>
          </ButtonGroup>
        )}
      </div>

      <div>
        <div className="text-muted">
          Advanced: use a variable or text template to apply conditional
          formatting. PixieBrix supports the{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://getbootstrap.com/docs/4.6/utilities/"
          >
            Bootstrap utilities
          </a>
        </div>
        <TemplateToggleWidget
          {...props}
          defaultType="string"
          setFieldDescription={() => "CSS class names for the element"}
        />
      </div>
    </div>
  );
};

export default CssClassWidget;

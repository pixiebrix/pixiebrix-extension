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

import React, { useCallback, useMemo } from "react";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { Button, ButtonGroup, Dropdown, DropdownButton } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignCenter,
  faAlignJustify,
  faAlignLeft,
  faAlignRight,
  faBold,
  faFont,
  faItalic,
} from "@fortawesome/free-solid-svg-icons";
import { useField } from "formik";
import { Expression, TemplateEngine } from "@/core";
import { isTemplateExpression, isVarExpression } from "@/runtime/mapArgs";
import { uniq } from "lodash";
import TemplateToggleWidget from "@/components/fields/schemaFields/widgets/TemplateToggleWidget";
import { InputModeOption } from "@/components/fields/schemaFields/widgets/templateToggleWidgetTypes";

/**
 * An independent class name
 */
type ClassFlag = {
  /**
   * The Bootstrap 4 class name
   */
  className: string;

  /**
   * Title node to render for the element (in a button/dropdown)
   */
  title: React.ReactNode;
};

const flags = {
  bold: {
    className: "font-weight-bold",
    title: <FontAwesomeIcon icon={faBold} />,
  },
  italic: {
    className: "font-italic",
    title: <FontAwesomeIcon icon={faItalic} />,
  },
};

const optionsGroups = {
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
      disabled={disabled}
      variant="light"
      size="sm"
      active={active}
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
      {title}
    </Dropdown.Item>
  );
};

/**
 * Return utility classes from the value
 * @param value
 */
export function parseValue(value: Value): {
  classes: string[];
  isVar: boolean;
  isTemplate: boolean;
  includesTemplate: boolean;
} {
  if (value == null) {
    return {
      classes: [],
      isVar: false,
      isTemplate: false,
      includesTemplate: false,
    };
  }

  if (isVarExpression(value)) {
    return {
      classes: [],
      isVar: true,
      isTemplate: false,
      includesTemplate: false,
    };
  }

  if (isTemplateExpression(value)) {
    if (value.__value__.includes("{{") || value.__value__.includes("{%")) {
      return {
        classes: value.__value__.split(" "),
        isVar: false,
        isTemplate: true,
        includesTemplate: true,
      };
    }

    return {
      classes: value.__value__.split(" "),
      isVar: false,
      isTemplate: true,
      includesTemplate: false,
    };
  }

  if (typeof value === "string") {
    return {
      classes: value.split(" "),
      isVar: false,
      isTemplate: false,
      includesTemplate: false,
    };
  }

  throw new Error("Unexpected value");
}

function calculateNextValue(
  previousValue: Value,
  className: string,
  on: boolean,
  group?: ClassFlag[]
): Value {
  const { isVar, isTemplate, classes, includesTemplate } =
    parseValue(previousValue);

  if (isVar || includesTemplate) {
    throw new Error("Not supported");
  }

  let nextClasses;

  if (on && group) {
    const inactiveClasses = group
      .map((x) => x.className)
      .filter((x) => x !== className);
    nextClasses = [
      ...classes.filter((x) => !inactiveClasses.includes(x)),
      className,
    ];
  } else if (on) {
    nextClasses = [...classes, className];
  } else {
    nextClasses = classes.filter((x) => x !== className);
  }

  const nextValue = uniq(nextClasses).join(" ");

  if (isTemplate) {
    return {
      __type__: (previousValue as Expression).__type__ as TemplateEngine,
      __value__: nextValue,
    };
  }

  return nextValue;
}

/**
 * A widget for customizing Bootstrap 4 utility classes.
 *
 * CSS classes are available in the document builder.
 */
const CssClassWidget: React.VFC<
  SchemaFieldProps & { inputModeOptions: InputModeOption[] }
> = (props) => {
  const [{ value }, , { setValue }] = useField<Value>(props.name);

  const { classes, isVar, includesTemplate } = useMemo(
    () => parseValue(value),
    [value]
  );

  const toggleClass = useCallback(
    (className: string, on: boolean, group?: ClassFlag[]) => {
      setValue(calculateNextValue(value, className, on, group));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Formik bug where setValue changes on each render
    [value]
  );

  const disableControls = isVar || includesTemplate;

  return (
    <div>
      <TemplateToggleWidget
        {...props}
        defaultType="string"
        setFieldDescription={() => "CSS class names for the element"}
      />

      <div className="mt-2">
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

        <ButtonGroup className="mx-2">
          {[flags.bold, flags.italic].map((flag) => (
            <FlagButton
              key={flag.className}
              {...flag}
              disabled={disableControls}
              classes={classes}
              toggleClass={toggleClass}
            />
          ))}
        </ButtonGroup>

        <ButtonGroup className="mx-2">
          <DropdownButton
            title={
              <span
                className={
                  optionsGroups.textVariant.find((x) =>
                    classes.includes(x.className)
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
      </div>
    </div>
  );
};

export default CssClassWidget;

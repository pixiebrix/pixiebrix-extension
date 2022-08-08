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

import React, {
  KeyboardEventHandler,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useField } from "formik";
import { Form, FormControlProps } from "react-bootstrap";
import fitTextarea from "fit-textarea";
import { Schema, TemplateEngine } from "@/core";
import { isTemplateExpression } from "@/runtime/mapArgs";
import { trim } from "lodash";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { isMustacheOnly } from "@/components/fields/fieldUtils";
import {
  getToggleOptions,
  isKeyStringField,
} from "@/components/fields/schemaFields/getToggleOptions";
import useUndo from "@/hooks/useUndo";

function schemaSupportsTemplates(schema: Schema): boolean {
  const options = getToggleOptions({
    fieldSchema: schema,
    isRequired: false,
    customToggleModes: [],
    isObjectProperty: false,
    isArrayItem: false,
    allowExpressions: true,
  });
  return options.some(
    (option) => option.value === "string" && option.label === "Text"
  );
}

function isVarValue(value: string): boolean {
  return value.startsWith("@") && !value.includes(" ");
}

const TextWidget: React.VFC<SchemaFieldProps & FormControlProps> = ({
  name,
  schema,
  validationSchema,
  isRequired,
  label,
  description,
  uiSchema,
  hideLabel,
  isObjectProperty,
  isArrayItem,
  onClick,
  focusInput,
  ...formControlProps
}) => {
  const [{ value, ...restInputProps }, , { setValue }] = useField(name);

  const { allowExpressions: allowExpressionsContext } =
    useContext(FieldRuntimeContext);
  const allowExpressions = allowExpressionsContext && !isKeyStringField(schema);

  const textAreaRef = useRef<HTMLTextAreaElement>();

  useEffect(() => {
    if (textAreaRef.current) {
      fitTextarea.watch(textAreaRef.current);
    }
  }, []);

  useEffect(() => {
    const { current } = textAreaRef;
    if (focusInput && current) {
      // We need to use a setTimeout here in order to override the default
      // behavior of Bootstrap DropdownButton in the field type toggle.
      // The standard w3c behavior of a dropdown/select is that the button
      // is re-focused after making an option selection. Since our dropdown
      // is tightly coupled with the field input itself, we want to focus the
      // input on selection instead, so that users do not need to click into
      // the field every time after making a toggle selection. Unfortunately,
      // the DropdownButton grabs focus back after it runs all the
      // "on select option" handlers (and thus, after this field is rendered),
      // so we need to wait a bit to make sure we can focus the input after
      // this happens.
      // See: https://github.com/react-bootstrap/react-bootstrap/issues/2553
      setTimeout(() => {
        current.focus();
        current.selectionStart = current.textLength;
        current.selectionEnd = current.textLength;
      }, 150);
    }
  }, [focusInput]);

  const supportsTemplates = useMemo(
    () => schemaSupportsTemplates(schema),
    [schema]
  );

  const undo = useUndo(value, setValue);

  const keyDownHandler: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "z") {
      undo();
    }
  };

  const onChangeForTemplate = useCallback(
    (templateEngine: TemplateEngine) => {
      const onChange: React.ChangeEventHandler<HTMLInputElement> = ({
        target,
      }) => {
        const changeValue = target.value;
        // Automatically switch to var if user types "@" in the input
        if (templateEngine !== "var" && isVarValue(changeValue)) {
          setValue({
            __type__: "var",
            __value__: changeValue,
          });
        } else if (
          templateEngine === "var" &&
          supportsTemplates &&
          !isVarValue(changeValue)
        ) {
          const trimmed = trim(changeValue);
          const templateValue = isVarValue(trimmed)
            ? changeValue.replace(trimmed, `{{${trimmed}}}`)
            : changeValue;
          setValue({
            __type__: "nunjucks",
            __value__: templateValue,
          });
        } else {
          setValue({
            __type__: templateEngine,
            __value__: changeValue,
          });
        }
      };

      return onChange;
    },
    [setValue, supportsTemplates]
  );

  const [fieldInputValue, fieldOnChange] = useMemo(() => {
    if (isTemplateExpression(value)) {
      // Convert mustache templates to nunjucks if possible, because the page editor only
      // supports nunjucks, and it doesn't show the template engine anywhere to the user anymore.
      const shouldChangeToNunjucks =
        value.__type__ === "mustache" && !isMustacheOnly(value.__value__);
      return [
        value.__value__,
        shouldChangeToNunjucks
          ? onChangeForTemplate("nunjucks")
          : onChangeForTemplate(value.__type__),
      ];
    }

    const fieldValue = typeof value === "string" ? value : "";
    const onChange: React.ChangeEventHandler<HTMLInputElement> =
      allowExpressions
        ? onChangeForTemplate("nunjucks")
        : (event) => {
            setValue(event.target.value);
          };

    return [fieldValue, onChange];
  }, [allowExpressions, onChangeForTemplate, setValue, value]);

  if (
    value !== null &&
    !isTemplateExpression(value) &&
    typeof value === "object"
  ) {
    console.warn("Cannot edit object/array as text", { schema, value });
    return <div>Cannot edit object value as text</div>;
  }

  return (
    <Form.Control
      as="textarea"
      rows="1"
      {...restInputProps}
      {...formControlProps}
      value={fieldInputValue}
      onChange={fieldOnChange}
      ref={textAreaRef}
      onKeyDown={keyDownHandler}
    />
  );
};

export default TextWidget;

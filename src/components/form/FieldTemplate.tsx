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

import React, { type ReactNode, useMemo, useState } from "react";
import {
  Collapse,
  FormControl,
  type FormControlProps,
  FormGroup,
  FormLabel,
  FormText,
} from "react-bootstrap";
import styles from "./FieldTemplate.module.scss";
import cx from "classnames";
import { isEmpty, isPlainObject } from "lodash";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types/annotationTypes";
import { type FieldAnnotation } from "@/components/form/FieldAnnotation";
import { DESCRIPTION_ALLOWED_TAGS } from "@/types/schemaTypes";
import MarkdownInline from "@/components/MarkdownInline";
import { type Except } from "type-fest";
import { type ActionMeta } from "react-select";
import { freeze } from "@/utils/objectUtils";
import FieldTemplateLocalErrorContext from "@/components/form/widgets/FieldTemplateLocalErrorContext";

export type FieldProps<
  As extends React.ElementType = React.ElementType,
  T = Element,
> = Except<FormControlProps, "onChange" | "value"> &
  Except<React.ComponentProps<As>, "name"> & {
    name: string;
    label?: ReactNode;
    fitLabelWidth?: boolean;
    description?: ReactNode;
    annotations?: FieldAnnotation[];
    onChange?:
      | React.ChangeEventHandler<T>
      | ((args: React.FormEvent<T>) => void)
      | ((option: unknown, actionMeta: ActionMeta<unknown>) => void);

    /**
     * This value is regarded as absence of value, unset property.
     * It will be passed to the UI input control when the value is undefined.
     */
    // TODO: the goal of this type was to use the type of "value", but instead it's returning any
    blankValue?: React.ComponentProps<As>["value"];
  };

type WidgetElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export type CustomFieldWidgetProps<
  TValue = string | string[] | number,
  TInputElement = WidgetElement,
> = {
  id?: string;
  name: string;
  disabled?: boolean;
  value: TValue | null;
  onChange: React.ChangeEventHandler<TInputElement>;
  isInvalid?: boolean;
};
export type CustomFieldWidget<
  TValue = string | string[] | number,
  TInputElement = WidgetElement,
  TFieldWidgetProps extends CustomFieldWidgetProps<
    TValue,
    TInputElement
  > = CustomFieldWidgetProps<TValue, TInputElement>,
> = React.ComponentType<TFieldWidgetProps>;

const EMPTY_ANNOTATIONS = freeze<FieldAnnotation[]>([]);

const FieldTemplate: <As extends React.ElementType, T = Element>(
  p: FieldProps<As, T>,
) => React.ReactElement<FieldProps<As, T>> = ({
  name,
  label,
  fitLabelWidth,
  description,
  annotations = EMPTY_ANNOTATIONS,
  value,
  children,
  blankValue = "",
  as: AsControl,
  className,
  ...restFieldProps
}) => {
  const [localError, setLocalError] = useState<string | null>(null);
  const localErrorAnnotation = useMemo<FieldAnnotation | null>(() => {
    if (localError == null) {
      return null;
    }

    return {
      message: localError,
      type: AnnotationType.Error,
    };
  }, [localError]);

  const fieldAnnotations = useMemo<FieldAnnotation[]>(
    () => [
      ...annotations,
      ...(localErrorAnnotation ? [localErrorAnnotation] : []),
    ],
    [annotations, localErrorAnnotation],
  );

  const isInvalid = !isEmpty(
    fieldAnnotations.filter(
      (annotation) => annotation.type === AnnotationType.Error,
    ),
  );

  // Prevent undefined values to keep the HTML `input` tag from becoming uncontrolled
  const nonUndefinedValue: string | number | string[] =
    value === undefined ? blankValue : value;

  const isBuiltinControl =
    AsControl === undefined || typeof AsControl === "string";

  if (isBuiltinControl && isPlainObject(nonUndefinedValue)) {
    console.warn(
      "RenderedField received an object value to a built-in control",
      {
        as: AsControl,
        nonUndefinedValue,
        blankValue,
        value,
      },
    );
  }

  // Note on `controlId` and Bootstrap FormGroup.
  // If we set `controlId` on the Bootstrap FormGroup, we must not set `id` on `FormLabel` and `FormControl`.
  // This makes it impossible to use a FormControl as a CustomWidget,
  // because it gets both `controlId` from Group and `id` from props of `AsControl`.
  // See their logic at https://github.com/react-bootstrap/react-bootstrap/blob/v1.6.4/src/FormControl.tsx#L179:L182
  // The most simple solution is to manually set `htmlFor` on the Label and `id` on the Control.
  const controlId = name;

  const formControl = isBuiltinControl ? (
    <FormControl
      id={controlId}
      name={name}
      isInvalid={isInvalid}
      value={nonUndefinedValue}
      as={AsControl}
      {...restFieldProps}
    >
      {children}
    </FormControl>
  ) : (
    <AsControl
      id={controlId}
      name={name}
      isInvalid={isInvalid}
      value={nonUndefinedValue}
      {...restFieldProps}
    >
      {children}
    </AsControl>
  );

  return (
    <FormGroup
      data-testid="field-template-form-group"
      className={cx(styles.formGroup, className)}
    >
      <Collapse in={fieldAnnotations.length > 0}>
        <div className="mb-2 w-100">
          {fieldAnnotations.length === 0 ? (
            <div className={styles.annotationPlaceholder} />
          ) : (
            fieldAnnotations.map(({ message, type, actions }, index) => (
              <FieldAnnotationAlert
                // eslint-disable-next-line react/no-array-index-key -- Requires a refactor of the `FieldAnnotation` component to require specifying a key
                key={index}
                message={message}
                type={type}
                actions={actions}
              />
            ))
          )}
        </div>
      </Collapse>
      {label && (
        <FormLabel
          className={cx(styles.label, {
            [styles.labelFitContent ?? ""]: fitLabelWidth,
          })}
          htmlFor={controlId}
        >
          {label}
        </FormLabel>
      )}
      <div className={styles.formField}>
        <FieldTemplateLocalErrorContext.Provider value={{ setLocalError }}>
          {formControl}
        </FieldTemplateLocalErrorContext.Provider>
        {description && (
          <FormText className="text-muted">
            {typeof description === "string" ? (
              <MarkdownInline
                markdown={description}
                sanitizeConfig={DESCRIPTION_ALLOWED_TAGS}
                as="span"
              />
            ) : (
              description
            )}
          </FormText>
        )}
      </div>
    </FormGroup>
  );
};

export default React.memo(FieldTemplate);

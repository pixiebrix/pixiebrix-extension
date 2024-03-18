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

import React, {
  type ChangeEventHandler,
  type FocusEventHandler,
  type KeyboardEventHandler,
  useCallback,
  useContext,
} from "react";
import { type WidgetProps } from "@rjsf/utils";
import { isNumber } from "lodash";
import RjsfSubmitContext from "@/components/formBuilder/RjsfSubmitContext";
import { Button } from "react-bootstrap";
import styles from "./TextAreaWidget.module.scss";
import cx from "classnames";
import Icon from "@/icons/Icon";
import { type IconValue } from "@/components/fields/IconWidget";

type SubmitToolbar =
  | {
      show?: boolean;
      icon?: IconValue;
    }
  | undefined;

const TextAreaWidget: React.FC<WidgetProps> = ({
  id,
  options,
  placeholder,
  value,
  required,
  disabled,
  readonly,
  onChange,
  onFocus,
  onBlur,
}) => {
  const { submitForm } = useContext(RjsfSubmitContext);
  const { submitOnEnter, submitToolbar, rows } = options;
  const showSubmitToolbar = (submitToolbar as SubmitToolbar)?.show ?? false;
  const submitToolbarIcon = (submitToolbar as SubmitToolbar)?.icon;

  const onKeyPress = useCallback<KeyboardEventHandler<HTMLTextAreaElement>>(
    async (event) => {
      if (
        submitOnEnter &&
        event.key === "Enter" &&
        !(event.shiftKey || event.altKey || event.ctrlKey) // Do not submit on enter when a modifier key is held
      ) {
        event.preventDefault();
        event.stopPropagation();
        // Can submit directly without calling onChange because prior key-presses would already be synced
        // via the onChange handler.
        await submitForm();
      }
    },
    [submitOnEnter, submitForm],
  );

  const onFocusHandler = useCallback<FocusEventHandler<HTMLTextAreaElement>>(
    (event) => {
      onFocus(id, event.target.value);
    },
    [id, onFocus],
  );

  const onBlurHandler = useCallback<FocusEventHandler<HTMLTextAreaElement>>(
    (event) => {
      onBlur(id, event.target.value);
    },
    [id, onBlur],
  );

  const onChangeHandler = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
    (event) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  // @see @rjsf/core/lib/components/widgets/TextareaWidget.js
  return (
    <div
      className={cx({ [styles.submitToolbarRoot ?? ""]: showSubmitToolbar })}
    >
      <textarea
        id={id}
        className={cx("form-control", {
          [styles.hasSubmitToolbar ?? ""]: showSubmitToolbar,
        })}
        value={String(value ?? "")}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readonly}
        rows={isNumber(rows) ? rows : undefined}
        onKeyPress={onKeyPress}
        onChange={onChangeHandler}
        onFocus={onFocusHandler}
        onBlur={onBlurHandler}
      />
      {showSubmitToolbar && (
        <div
          className={cx("d-flex justify-content-between", styles.submitToolbar)}
        >
          <Button
            variant="link"
            type="button"
            onClick={() => {
              onChange("");
            }}
          >
            Clear
          </Button>
          <Button type="submit" variant="link" aria-label="submit">
            <Icon
              icon={submitToolbarIcon?.id}
              library={submitToolbarIcon?.library}
              size={submitToolbarIcon?.size}
              color="#807691" // See colors.scss:$N300
            />
          </Button>
        </div>
      )}
    </div>
  );
};

export default TextAreaWidget;

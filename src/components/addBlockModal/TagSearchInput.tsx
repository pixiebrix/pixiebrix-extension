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

import React, { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import styles from "./TagSearchInput.module.scss";
import { useDebouncedCallback } from "use-debounce";
import useAutoFocus from "@/hooks/useAutoFocus";

const TagBadge: React.VFC<{
  tag: string;
  onClear: () => void;
}> = ({ tag, onClear }) => (
  <span className={styles.badge}>
    {tag} <FontAwesomeIcon icon={faTimesCircle} onClick={onClear} />
  </span>
);

const TagSearchInput: React.VFC<{
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  tag: string | null;
  onClearTag: () => void;
  placeholder?: string;
  focusInput?: boolean;
  className?: string;
}> = ({
  name,
  value,
  onValueChange,
  tag,
  onClearTag,
  placeholder,
  focusInput,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>();
  useAutoFocus(inputRef, focusInput);

  const [internalValue, setInternalValue] = useState(value);
  const handleChangeDebounced = useDebouncedCallback(onValueChange, 150);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextValue = event.target.value;
    setInternalValue(nextValue);
    handleChangeDebounced(nextValue);
  };

  return (
    <div className={cx(styles.root, className)}>
      {tag && (
        <TagBadge
          tag={tag}
          onClear={() => {
            onClearTag();
          }}
        />
      )}
      <input
        name={name}
        ref={inputRef}
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        className={styles.input}
        onKeyDown={(event) => {
          if (event.key === "Backspace" && internalValue === "") {
            onClearTag();
          }
        }}
        data-testid="tag-search-input"
      />
    </div>
  );
};

export default TagSearchInput;

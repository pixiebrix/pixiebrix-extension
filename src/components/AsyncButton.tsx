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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "react-bootstrap";

export type AsyncButtonProps = ButtonProps & {
  onClick: // Don't simplify to (event: React.MouseEvent) => Promise<void> | void. Union necessary to allow
  // callsites to pass in a function that returns a Promise<T>. (Because Typescript does not consider Promise<T>
  // compatible with void return type.
  | ((event: React.MouseEvent) => Promise<void>)
    | ((event: React.MouseEvent) => void);
  autoFocus?: boolean;
  ariaLabel?: string;
};

const AsyncButton = React.forwardRef<HTMLButtonElement, AsyncButtonProps>(
  (
    {
      ariaLabel,
      onClick,
      children,
      disabled: manualDisabled = false,
      ...buttonProps
    },
    ref,
  ) => {
    const mounted = useRef(false);
    const [pending, setPending] = useState(false);

    useEffect(() => {
      // https://stackoverflow.com/a/66555159/402560
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);

    const handleClick = useCallback(
      async (event: React.MouseEvent) => {
        setPending(true);
        try {
          await onClick(event);
        } finally {
          if (mounted.current) {
            setPending(false);
          }
        }
      },
      [onClick],
    );

    return (
      <Button
        ref={ref}
        aria-label={ariaLabel}
        disabled={manualDisabled || pending}
        {...buttonProps}
        onClick={(event) => {
          event.stopPropagation();
          void handleClick(event);
        }}
      >
        {children}
      </Button>
    );
  },
);

AsyncButton.displayName = "AsyncButton";

export default AsyncButton;

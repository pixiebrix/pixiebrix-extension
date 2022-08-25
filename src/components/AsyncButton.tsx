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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonProps } from "react-bootstrap";

export type AsyncButtonProps = ButtonProps & {
  onClick: (() => Promise<void>) | (() => void);
  autoFocus?: boolean;
};

const AsyncButton: React.FunctionComponent<AsyncButtonProps> = ({
  onClick,
  children,
  disabled: manualDisabled = false,
  ...buttonProps
}) => {
  const mounted = useRef(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // https://stackoverflow.com/a/66555159/402560
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleClick = useCallback(async () => {
    setPending(true);
    try {
      await onClick();
    } finally {
      if (mounted.current) {
        setPending(false);
      }
    }
  }, [onClick]);

  return (
    <Button
      disabled={manualDisabled || pending}
      {...buttonProps}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
};

export default AsyncButton;

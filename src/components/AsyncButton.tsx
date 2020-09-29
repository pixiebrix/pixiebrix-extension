import React, { useCallback, useState } from "react";
import Button, { ButtonProps } from "react-bootstrap/Button";

interface ExtraProps {
  onClick: (() => Promise<void>) | (() => void);
}

const AsyncButton: React.FunctionComponent<ButtonProps & ExtraProps> = ({
  onClick,
  children,
  ...buttonProps
}) => {
  const [pending, setPending] = useState(false);
  const handleClick = useCallback(async () => {
    setPending(true);
    try {
      await onClick();
    } finally {
      // FIXME: the component with the button might be unmounted at this point
      setPending(false);
    }
  }, [onClick]);

  return (
    <Button disabled={pending} {...buttonProps} onClick={handleClick}>
      {children}
    </Button>
  );
};

export default AsyncButton;

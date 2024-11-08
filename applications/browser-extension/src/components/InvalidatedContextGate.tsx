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

import React from "react";
import { Button } from "react-bootstrap";
import useContextInvalidated from "../hooks/useContextInvalidated";
import useDocumentVisibility from "../hooks/useDocumentVisibility";

type ContextInvalidatedProps = {
  autoReload?: boolean;

  /** The name to show on "Reload Context Name" button */
  contextNameTitleCase: string;
};

const InformationPanel: React.FunctionComponent<ContextInvalidatedProps> = ({
  autoReload,
  contextNameTitleCase,
}) => {
  // Only auto-reload if the document is in the background
  const isDocumentVisible = useDocumentVisibility();
  if (autoReload && !isDocumentVisible) {
    setTimeout(() => {
      // If you reload too soon, Chrome might not be ready to serve the page yet
      // TODO: Poll the page until it's ready instead of a timeout. Then auto-reload by default
      location.reload();
    }, 1000);
  }

  return (
    <div className="d-flex flex-column align-items-center justify-content-center">
      <p>
        PixieBrix was updated or restarted. Reload the{" "}
        {contextNameTitleCase.toLowerCase()} to continue.
      </p>
      <Button
        onClick={() => {
          location.reload();
        }}
      >
        Reload {contextNameTitleCase}
      </Button>
    </div>
  );
};

/**
 * A gate that shows an information panel with a reload button if the context was invalidated.
 *
 * Use `<AbortSignalGate signal={onContextInvalidated.signal}>` if you just want to unmount the children instead.
 */
const InvalidatedContextGate: React.FunctionComponent<
  React.PropsWithChildren<ContextInvalidatedProps>
> = ({ children, ...props }) => {
  const wasContextInvalidated = useContextInvalidated();

  return wasContextInvalidated ? (
    <InformationPanel {...props} />
  ) : (
    <>{children}</>
  );
};

export default InvalidatedContextGate;

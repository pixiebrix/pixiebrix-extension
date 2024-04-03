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
import useContextInvalidated from "@/hooks/useContextInvalidated";
import useDocumentVisibility from "@/hooks/useDocumentVisibility";

type ContextInvalidatedProps = {
  autoReload?: boolean;
  emptyOnInvalidation?: boolean;
  contextNameTitleCase?: string;
};

const ContextInvalidated: React.FunctionComponent<ContextInvalidatedProps> = ({
  autoReload,
  emptyOnInvalidation,
  contextNameTitleCase = "Page",
}) => {
  // Only auto-reload if the document is in the background
  const isDocumentVisible = useDocumentVisibility();
  if (autoReload && !isDocumentVisible) {
    location.reload();
  }

  if (emptyOnInvalidation) {
    return null;
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

const InvalidatedContextGate: React.FunctionComponent<
  ContextInvalidatedProps
> = ({ children, ...props }) => {
  const wasContextInvalidated = useContextInvalidated();

  return wasContextInvalidated ? (
    <ContextInvalidated {...props} />
  ) : (
    <>{children}</>
  );
};

export default InvalidatedContextGate;

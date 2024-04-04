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

const InvalidatedContextGate: React.FunctionComponent<{
  contextNameTitleCase: string;
  autoReload?: boolean;
}> = ({ children, contextNameTitleCase, autoReload }) => {
  const wasContextInvalidated = useContextInvalidated();
  // Only auto-reload if the document is in the background
  const isDocumentVisible = useDocumentVisibility();
  if (wasContextInvalidated && autoReload && !isDocumentVisible) {
    setTimeout(() => {
      // If you reload too soon, Chrome might not be ready to serve the page yet
      location.reload();
    }, 500);
  }

  return wasContextInvalidated ? (
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
  ) : (
    <>{children}</>
  );
};

export default InvalidatedContextGate;

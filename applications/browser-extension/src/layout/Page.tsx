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

import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import useSetDocumentTitle from "../hooks/useSetDocumentTitle";
import Loader from "../components/Loader";
import { ErrorDisplay } from "./ErrorDisplay";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";

export const PageTitle: React.FunctionComponent<{
  title: React.ReactNode;
  documentationUrl?: string;
  icon?: IconProp;
}> = ({ title, icon, documentationUrl }) => (
  <div>
    <div className="page-header">
      {icon && (
        <span className="page-title-icon bg-gradient-primary text-white mr-2">
          <FontAwesomeIcon icon={icon} />
        </span>
      )}
      <div>
        <h3 className="page-title">{title}</h3>
        {documentationUrl && (
          <div className="page-documentation">
            <a
              href={documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} />
              &nbsp;View Documentation
            </a>
          </div>
        )}
      </div>
    </div>
  </div>
);

const Page: React.FunctionComponent<{
  icon: IconProp;
  title: string;
  className?: string;
  description?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;

  /**
   * An optional documentation URL.
   */
  documentationUrl?: string;

  /**
   * True to show a loader for the main page content.
   */
  isPending?: boolean;

  /**
   * Error to show for the main page content
   */
  error?: unknown;
}> = ({
  className,
  icon,
  title,
  error,
  isPending,
  breadcrumb,
  toolbar,
  description = null,
  children,
  documentationUrl,
}) => {
  useSetDocumentTitle(title);

  const body = useMemo(() => {
    if (isPending) {
      return <Loader />;
    }

    if (error) {
      return <ErrorDisplay error={error} />;
    }

    return children;
  }, [children, isPending, error]);

  return (
    <div className={className}>
      <div className="d-flex">
        <div className="flex-grow-1">
          <PageTitle
            icon={icon}
            title={title}
            documentationUrl={documentationUrl}
          />
        </div>
        {toolbar && <div>{toolbar}</div>}
      </div>
      {description && (
        <div className="pb-4">
          {typeof description === "string" ? <p>{description}</p> : description}
          {breadcrumb}
        </div>
      )}
      {body}
    </div>
  );
};

export default Page;

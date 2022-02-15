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

import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { useTitle } from "@/hooks/title";
import { getErrorMessage } from "@/errors";
import Loader from "@/components/Loader";

export const PageTitle: React.FunctionComponent<{
  title: React.ReactNode;
  icon?: IconProp;
}> = ({ title, icon }) => (
  <div className="page-header">
    <h3 className="page-title">
      {icon && (
        <span className="page-title-icon bg-gradient-primary text-white mr-2">
          <FontAwesomeIcon icon={icon} />
        </span>
      )}
      {title}
    </h3>
  </div>
);

const ErrorDisplay: React.FC<{ error: unknown }> = ({ error }) => (
  <div>
    <h2 className="text-danger">An error occurred</h2>
    <p>{getErrorMessage(error)}</p>
  </div>
);

const Page: React.FunctionComponent<{
  icon: IconProp;
  title: string;
  description?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;

  /**
   * True to show a loader for the main page content.
   */
  isPending?: boolean;

  /**
   * Error to show for the main page content
   */
  error?: unknown;
}> = ({
  icon,
  title,
  error,
  isPending,
  breadcrumb,
  toolbar,
  description = null,
  children,
}) => {
  useTitle(title);

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
    <div>
      <div className="d-flex">
        <div className="flex-grow-1">
          <PageTitle icon={icon} title={title} />
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

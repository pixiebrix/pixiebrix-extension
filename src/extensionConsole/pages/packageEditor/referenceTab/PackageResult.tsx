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

import styles from "./PackageResult.module.scss";

import React, { useMemo } from "react";
import { ListGroup } from "react-bootstrap";
import cx from "classnames";
import { OfficialBadge } from "@/components/OfficialBadge";
import BrickIcon from "@/components/BrickIcon";
import {
  faEyeSlash,
  faGlobe,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { find as findPackage } from "@/registry/packageRegistry";
import { type Organization } from "@/types/contract";
import { type Metadata, type Sharing } from "@/types/registryTypes";
import useAsyncState from "@/hooks/useAsyncState";

type SharingTagProps<T extends Metadata> = {
  packageMetadata: T;
  organizations: Organization[];
};

const SharingTag = <T extends Metadata>({
  packageMetadata,
  organizations,
}: SharingTagProps<T>) => {
  const { data: sharing } = useAsyncState(async () => {
    const packageVersion = await findPackage(packageMetadata.id);
    if (packageVersion?.config) {
      return packageVersion.config.sharing as Sharing;
    }

    return null;
  }, [packageMetadata.id]);

  const organization = useMemo(() => {
    if (!sharing) {
      return null;
    }

    if (sharing.organizations.length === 0) {
      return null;
    }

    // If more than one sharing organization, use the first
    return organizations.find((org) => sharing.organizations.includes(org.id));
  }, [organizations, sharing]);

  const label = useMemo(() => {
    if (!sharing || sharing.public) {
      return { text: "Public", icon: faGlobe };
    }

    if (organization) {
      return { text: organization.name, icon: faUsers };
    }

    if (!sharing.public) {
      return { text: "Personal", icon: faEyeSlash };
    }

    return null;
  }, [sharing, organization]);

  return (
    <span>
      {label && (
        <>
          <FontAwesomeIcon icon={label.icon} className="mr-1" />
          {label.text}
        </>
      )}
    </span>
  );
};

type OwnProps<T extends Metadata> = {
  packageMetadata: T;
  active?: boolean;
  onSelect: () => void;
  organizations: Organization[];
};

const PackageResult = <T extends Metadata>({
  packageMetadata,
  onSelect,
  active,
  organizations,
}: OwnProps<T>) => (
  <ListGroup.Item
    onClick={onSelect}
    className={cx(styles.root, { [styles.active ?? ""]: active, active })}
  >
    <div className="d-flex">
      <div className="mr-2 text-muted">
        <BrickIcon brick={packageMetadata} />
      </div>
      <div className={cx("flex-grow-1", styles.titleColumn)}>
        <div className="d-flex justify-content-between">
          <div className={cx(styles.ellipsis, "mb-1")}>
            {packageMetadata.name}
          </div>
          <OfficialBadge id={packageMetadata.id} />
        </div>
        <div className="d-flex justify-content-between align-items-center gap-2">
          <code className={cx(styles.id, "flex-shrink-1 small")}>
            {packageMetadata.id}
          </code>
          <div
            className={cx(styles.sharing, styles.ellipsis, "small text-right")}
          >
            <SharingTag
              packageMetadata={packageMetadata}
              organizations={organizations}
            />
          </div>
        </div>
      </div>
    </div>
  </ListGroup.Item>
);

export default PackageResult;

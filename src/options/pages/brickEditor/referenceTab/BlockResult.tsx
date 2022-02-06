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

import styles from "./BlockResult.module.scss";

import React, { useMemo } from "react";
import { ListGroup } from "react-bootstrap";
import cx from "classnames";
import { ReferenceEntry } from "@/options/pages/brickEditor/brickEditorTypes";
import { OfficialBadge } from "@/components/OfficialBadge";
import BrickIcon from "@/components/BrickIcon";
import {
  faEyeSlash,
  faGlobe,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { find } from "@/registry/localRegistry";
import { useAsyncState } from "@/hooks/common";
import { Organization } from "@/types/contract";
import { Sharing, UUID } from "@/core";

export const SharingTag: React.FunctionComponent<{
  block: ReferenceEntry;
  organizations: Organization[];
}> = ({ block, organizations }) => {
  const [sharing] = useAsyncState(async () => {
    const brickPackage = await find(block.id);
    if (brickPackage?.config) {
      return brickPackage.config.sharing as Sharing;
    }

    return null;
  }, []);

  const organization = useMemo(() => {
    if (!sharing) {
      return null;
    }

    if (sharing.organizations.length === 0) {
      return null;
    }

    // If more than one sharing organization, use the first
    return organizations.find((org) =>
      sharing.organizations.includes(org.id as UUID)
    );
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

const BlockResult: React.FunctionComponent<{
  block: ReferenceEntry;
  active?: boolean;
  onSelect: () => void;
  organizations: Organization[];
}> = ({ block, onSelect, active, organizations }) => (
  <ListGroup.Item
    onClick={onSelect}
    className={cx(styles.root, { [styles.active]: active, active })}
  >
    <div className="d-flex">
      <div className="mr-2 text-muted">
        <BrickIcon brick={block} />
      </div>
      <div className={cx("flex-grow-1", styles.titleColumn)}>
        <div className="d-flex justify-content-between">
          <div className={cx(styles.ellipsis, "mb-1")}>{block.name}</div>
          <OfficialBadge id={block.id} />
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <code className={cx(styles.id, "flex-shrink-1 small")}>
            {block.id}
          </code>
          <div className={cx(styles.sharing)}>
            <div className={cx(styles.ellipsis, "small text-right pl-2")}>
              <SharingTag block={block} organizations={organizations} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </ListGroup.Item>
);

export default BlockResult;

/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

// eslint-disable-next-line unicorn/prevent-abbreviations -- Mod is not short for anything
import styles from "@/sidebar/homePanel/ActiveModListItem.module.scss";

import React from "react";
import { type InstallableViewItem } from "@/installables/installableTypes";
import { Button, ListGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationCircle,
  faStore,
} from "@fortawesome/free-solid-svg-icons";
import { getContainedStarterBrickNames } from "@/utils/installableUtils";
import useAsyncState from "@/hooks/useAsyncState";
import InstallableIcon from "@/installables/InstallableIcon";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import useMarketplaceUrl from "@/installables/hooks/useMarketplaceUrl";
import useRequestPermissionsAction from "@/installables/hooks/useRequestPermissionsAction";
import cx from "classnames";

// eslint-disable-next-line unicorn/prevent-abbreviations -- Mod is not short for anything
export const ActiveModListItem: React.FunctionComponent<{
  installableItem: InstallableViewItem;
}> = ({ installableItem }) => {
  const { name, installable } = installableItem;
  const marketplaceListingUrl = useMarketplaceUrl(installableItem);
  const requestPermissions = useRequestPermissionsAction(installableItem);

  const { data: starterBricksContained, error } = useAsyncState(
    async () => getContainedStarterBrickNames(installableItem),
    [],
    { initialValue: [] }
  );

  if (error) {
    // Don't swallow logic errors, but don't crash the UI either
    // Start brick information is nice-to-have, but not a must-have
    console.error(error);
  }

  return (
    <ListGroup.Item className={styles.root}>
      <div className={styles.mainContent}>
        <div className={styles.icon}>
          <InstallableIcon installable={installable} />
        </div>
        <div>
          <div>
            <h5 className={styles.lineClampOneLine}>{name}</h5>
            <span
              className={cx(
                styles.starterBricksList,
                requestPermissions
                  ? styles.lineClampOneLine
                  : styles.lineClampTwoLines
              )}
            >
              {(starterBricksContained ?? []).join(" • ")}
            </span>
          </div>
          {requestPermissions && (
            <Button
              variant="link"
              size="sm"
              className={styles.warningLink}
              onClick={requestPermissions}
            >
              <FontAwesomeIcon icon={faExclamationCircle} /> Grant Permissions
            </Button>
          )}
        </div>
      </div>
      <div className="flex-shrink-1">
        <EllipsisMenu
          items={[
            {
              title: (
                <>
                  <FontAwesomeIcon fixedWidth icon={faStore} /> View Mod Details
                </>
              ),
              href: marketplaceListingUrl,
              disabled: !marketplaceListingUrl,
            },
          ]}
        />
      </div>
    </ListGroup.Item>
  );
};

export default ActiveModListItem;

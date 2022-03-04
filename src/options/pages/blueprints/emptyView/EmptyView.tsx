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

import React from "react";
import styles from "./EmptyView.module.scss";
import { InstallableViewItem } from "@/options/pages/blueprints/blueprintsTypes";
import { TableInstance } from "react-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt, faUndo } from "@fortawesome/free-solid-svg-icons";
import { Button, Card, Row } from "react-bootstrap";
import marketplaceImage from "@img/marketplace.svg";
import workshopImage from "@img/workshop.svg";
import useFlags from "@/hooks/useFlags";
import OnboardingView from "@/options/pages/blueprints/emptyView/OnboardingView";

const EmptyView: React.VoidFunctionComponent<{
  tableInstance: TableInstance<InstallableViewItem>;
  height: number;
  width: number;
}> = ({ tableInstance, height, width }) => {
  const {
    state: { globalFilter },
  } = tableInstance;
  const { restrict } = useFlags();

  const unaffiliatedView = (
    <div className={styles.suggestions}>
      <img src={marketplaceImage} alt="Marketplace" width={400} />
      <h4>You don't have any active blueprints.</h4>
      <span>
        {/*Only show "view all blueprints" button if the users has some blueprints available*/}
        <Button size="sm">View all blueprints</Button> or{" "}
        <a href="#">explore the public marketplace</a>
      </span>
    </div>
  );

  const unrestrictedEnterpriseView = (
    <div className={styles.suggestions}>
      <img src={marketplaceImage} alt="Marketplace" width={400} />
      <h4>You don't have any active blueprints.</h4>
      <span>
        {/*Only show "view all blueprints" button if the users has some blueprints available*/}
        <Button size="sm">View all blueprints</Button> or{" "}
        <a href="#">explore the public marketplace</a>
      </span>
    </div>
  );

  const restrictedView = (
    <div className={styles.suggestions}>
      <img src={marketplaceImage} alt="Marketplace" width={400} />
      <h4>You don't have any active blueprints.</h4>
      <span>
        Once you activate deployments released by your team, you can manage them
        here.
      </span>
    </div>
  );

  const searchResultsView = (
    <Row>
      <Card>
        <Card.Body>
          <div className={styles.suggestions}>
            <img src={workshopImage} alt="Workshop" width={300} />
            <h3>Hmm... no blueprints found.</h3>
            <div className="mb-4">
              There weren&apos;t any blueprints with a name, description, or id
              containing your search term.
            </div>
            <div>
              <Button size="sm">
                <FontAwesomeIcon icon={faUndo} /> Search again
              </Button>{" "}
              or try searching the{" "}
              {/*This link could go to the public marketplace with filtered blueprints */}
              {/*and the user's search term*/}
              <a href="#">
                <FontAwesomeIcon icon={faExternalLinkAlt} /> Public Marketplace
              </a>
            </div>
          </div>
        </Card.Body>
      </Card>
    </Row>
  );

  return (
    <div
      className={styles.root}
      style={{ height: `${height}px`, width: `${width}px` }}
    >
      {globalFilter ? searchResultsView : <OnboardingView />}
    </div>
  );
};

export default EmptyView;

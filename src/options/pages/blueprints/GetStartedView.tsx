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

import styles from "./GetStartedView.module.scss";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { Col, Row } from "react-bootstrap";
import { isMac } from "@/utils";
import useMilestones from "@/hooks/useMilestones";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import { type RegistryId } from "@/core";
import { useRecipe } from "@/recipes/recipesHooks";
import InstallableIcon from "@/options/pages/blueprints/InstallableIcon";
import { MARKETPLACE_URL } from "@/utils/strings";

const ExternalLink: React.VoidFunctionComponent<{
  linkText: string;
  url: string;
}> = ({ linkText, url }) => (
  <span>
    <a href={url} target="_blank" rel="noopener noreferrer">
      {linkText}
    </a>
    <FontAwesomeIcon
      icon={faExternalLinkAlt}
      className={styles.externalLinkIcon}
      size="xs"
    />
  </span>
);

const GetStartedView: React.VoidFunctionComponent<{
  width: number;
  height: number;
}> = ({ width, height }) => {
  const { homepage_url: homepageUrl } = browser.runtime.getManifest();
  const { getMilestone } = useMilestones();

  const onboardingBlueprintId = getMilestone(
    "first_time_public_blueprint_install"
  )?.metadata?.blueprintId as RegistryId;

  const { data: recipe, isFetching: isFetchingRecipe } = useRecipe(
    onboardingBlueprintId
  );

  const { data: listings, isLoading } = useGetMarketplaceListingsQuery(
    { package__name: onboardingBlueprintId },
    { skip: !onboardingBlueprintId }
  );

  const onboardingBlueprintListing = listings
    ? listings[onboardingBlueprintId]
    : null;

  const marketplaceUrl = `${homepageUrl}/marketplace/${onboardingBlueprintListing?.id}/`;

  return (
    <div
      style={{ height: `${height}px`, width: `${width}px` }}
      className={styles.root}
    >
      {onboardingBlueprintListing && (
        <Row className={styles.infoRow}>
          <Col>
            <h4>
              Success!{" "}
              <InstallableIcon
                installable={recipe}
                listing={onboardingBlueprintListing}
                isLoading={isLoading && isFetchingRecipe}
              />{" "}
              <ExternalLink
                linkText={onboardingBlueprintListing.package.verbose_name}
                url={marketplaceUrl}
              />{" "}
              is ready to use.
            </h4>
            <ul>
              <li>
                Time to try this Blueprint in the wild! You can navigate to a
                webpage this Blueprint enhances to see it in action.
              </li>
              <li>
                Check out the &quot;How to Use&quot; section for{" "}
                <ExternalLink
                  linkText={`${onboardingBlueprintListing.package.verbose_name}`}
                  url={marketplaceUrl}
                />{" "}
                in the Marketplace for more details about how to use this
                Blueprint.
              </li>
            </ul>
          </Col>
        </Row>
      )}
      <Row className={styles.infoRow}>
        <Col>
          <h4>Want to create a new Blueprint?</h4>
          <ul>
            <li>
              Start by opening a new browser tab and navigating to the webpage
              you want to modify.
            </li>
            <li>
              Open the Page Editor by selecting the PixieBrix tab via the{" "}
              <strong>Chrome DevTools</strong> using{" "}
              {isMac() ? (
                <kbd>Cmd + Option + C</kbd>
              ) : (
                <kbd>Ctrl + Shift + C</kbd>
              )}{" "}
              or <kbd>F12</kbd> and start editing your page.
            </li>
            <li>
              Save your Blueprint in the Page Editor, and you&apos;ll see it
              here as a personal Blueprint.
            </li>
          </ul>
        </Col>
      </Row>
      <Row className={styles.infoRow}>
        <Col>
          <h4>Need more help?</h4>
          <p>
            Visit the{" "}
            <ExternalLink
              linkText="Quick Start Guide"
              url="https://docs.pixiebrix.com/quick-start-guide"
            />{" "}
            or ask questions in the{" "}
            <ExternalLink
              linkText="Slack Community"
              url="https://pixiebrixcommunity.slack.com/join/shared_invite/zt-13gmwdijb-Q5nVsSx5wRLmRwL3~lsDww#/shared-invite/email"
            />
            .
          </p>
          <p>
            {" "}
            Visit the{" "}
            <ExternalLink
              linkText="PixieBrix Marketplace"
              url={MARKETPLACE_URL}
            />{" "}
            for ideas.
          </p>
        </Col>
      </Row>
    </div>
  );
};

export default GetStartedView;

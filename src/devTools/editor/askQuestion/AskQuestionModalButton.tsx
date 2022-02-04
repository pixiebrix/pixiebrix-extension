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

import { faQuestionCircle } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Button, Modal } from "react-bootstrap";
import slack from "./logos/slack.svg";
import discourse from "./logos/discourse.svg";
import zoom from "./logos/zoom.svg";
import styles from "./AskQuestionModalButton.module.scss";

type ButtonConfig = {
  logo: string;
  label: string;
  link: string;
};

const buttons: ButtonConfig[] = [
  {
    logo: slack,
    label: "Join Slack, get answers now",
    link:
      "https://join.slack.com/t/pixiebrixworkspace/shared_invite/zt-11jzgaxqq-BkvBJyRcyPHctXs5wqCGhw",
  },
  {
    logo: discourse,
    label: "Start a new discussion thread",
    link: "https://community.pixiebrix.com",
  },
  {
    logo: zoom,
    label: "Schedule a deep dive",
    link: "https://calendly.com/pixiebrix-support/ask-a-question",
  },
];

const AskQuestionModalButton: React.VoidFunctionComponent = () => {
  const [showModal, setShowModal] = React.useState(false);

  return (
    <>
      <Button
        variant="info"
        size="sm"
        onClick={() => {
          setShowModal(true);
        }}
      >
        <FontAwesomeIcon icon={faQuestionCircle} /> Ask a question
      </Button>

      <Modal
        show={showModal}
        onHide={() => {
          setShowModal(false);
        }}
      >
        <Modal.Header closeButton>Ask a question</Modal.Header>
        <Modal.Body>
          {buttons.map(({ logo, label, link }) => (
            <a
              key={label}
              className={styles.button}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setShowModal(false);
              }}
            >
              <img className={styles.logo} src={logo} alt={label} /> {label}
            </a>
          ))}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default AskQuestionModalButton;

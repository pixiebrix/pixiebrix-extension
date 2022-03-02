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
import { Modal } from "react-bootstrap";
import styles from "@/pageEditor/askQuestion/AskQuestionModalButton.module.scss";
import slack from "@/pageEditor/askQuestion/logos/slack.svg";
import discourse from "@/pageEditor/askQuestion/logos/discourse.svg";
import zoom from "@/pageEditor/askQuestion/logos/zoom.svg";

type ButtonConfig = {
  logo: string;
  label: string;
  link: string;
};

const buttons: ButtonConfig[] = [
  {
    logo: slack,
    label: "Join Slack, get answers now",
    link: "https://join.slack.com/t/pixiebrixworkspace/shared_invite/zt-11jzgaxqq-BkvBJyRcyPHctXs5wqCGhw",
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

type AskQuestionModalProps = {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
};

const AskQuestionModal: React.FC<AskQuestionModalProps> = ({
  showModal,
  setShowModal,
}) => (
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
);

export default AskQuestionModal;

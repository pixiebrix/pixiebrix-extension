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

import styles from "./WalkthroughModal.module.scss";

import { Button, Carousel, Col, Container, Modal, Row } from "react-bootstrap";
import React, { useState } from "react";
import { expectContext } from "@/utils/expectContext";
import { showModal } from "@/bricks/transformers/ephemeralForm/modalUtils";
import { getThisFrame } from "webext-messenger";
import { registerModal } from "@/contentScript/walkthroughModalProtocol";
import { closeWalkthroughModal } from "@/contentScript/messenger/api";
import { Target } from "@/types/messengerTypes";
import inspectContextMenuImage from "@img/inspect-context-menu.svg";
import devtoolsShortcutWindowsImage from "@img/devtools-shortcut-windows.svg";
import devtoolsShortcutMacImage from "@img/devtools-shortcut-mac.svg";
import devtoolsDockingContextMenu from "@img/devtools-docking-context-menu.svg";
import devtoolsToolbarScreenshot from "@img/devtools-toolbar-screenshot.svg";
import devtoolsPixieBrixToolbarTab from "@img/devtools-pixiebrix-toolbar-tab.svg";
import devtoolsPixieBrixToolbarTabHidden from "@img/devtools-pixiebrix-toolbar-tab-hidden.svg";

import cx from "classnames";
import { isMac } from "@/utils/browserUtils";

let controller: AbortController;

type WalkthroughModalStep = {
  title: string;
  body: React.ReactNode;
};

export const WalkthroughModalApp: React.FunctionComponent = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const params = new URLSearchParams(location.search);
  const opener = JSON.parse(params.get("opener")) as Target;

  const steps: WalkthroughModalStep[] = [
    {
      title: "Opening the Chrome DevTools",
      body: (
        <>
          The Page Editor lives in the Chrome Dev tools. So the first step is to
          open them. You can open it in two different ways.
          <Row>
            <Col>
              <img src={inspectContextMenuImage} alt="" />
            </Col>
            <Col>
              {isMac() ? (
                <img src={devtoolsShortcutMacImage} alt="" />
              ) : (
                <img src={devtoolsShortcutWindowsImage} alt="" />
              )}
            </Col>
          </Row>
          <Row>
            <Col>Right click anywhere on the page and select “Inspect”</Col>
            <Col>Or Utilize the keyboard shortcut for your system</Col>
          </Row>
        </>
      ),
    },
    {
      title: "Docking the DevTools",
      body: (
        <>
          Dock the dev tools to the bottom of the screen, if necessary. The Page
          Editor is a powerful tool that needs a bit of room to work its magic.
          <Row>
            <Col>
              <img src={devtoolsToolbarScreenshot} alt="" />
            </Col>
            <Col>
              <img src={devtoolsDockingContextMenu} alt="" />
            </Col>
          </Row>
          Click the TODO menu in the top right of the dev tools Select the TODO
          (third option) under ‘Dock side’
        </>
      ),
    },
    {
      title: "Opening the Page Editor",
      body: (
        <>
          <img src={devtoolsPixieBrixToolbarTab} alt="" />
          <img src={devtoolsPixieBrixToolbarTabHidden} alt="" />
          Last step is to select the PixieBrix tab from the tab bar. If you
          don’t see the tab, it's probably behind the double-chevron menu.
        </>
      ),
    },
  ];

  return (
    <Modal
      backdrop={false}
      animation={false}
      show={true}
      onHide={() => {
        closeWalkthroughModal(opener);
      }}
    >
      <Modal.Header closeButton>
        <div>
          <small>
            Step {stepIndex + 1} of {steps.length}
          </small>
          <Modal.Title>{steps[stepIndex].title}</Modal.Title>
        </div>
      </Modal.Header>
      <Carousel
        activeIndex={stepIndex}
        interval={null}
        slide={false}
        controls={false}
        indicators={false}
      >
        {steps.map((step, index) => {
          return (
            <Carousel.Item key={index}>
              <Modal.Body className={cx("show-grid", styles.root)}>
                <Container>{step.body}</Container>
              </Modal.Body>
            </Carousel.Item>
          );
        })}
      </Carousel>
      <Modal.Body className="show-grid">
        <Row>
          <Col>
            {stepIndex > 0 && (
              <Button
                size="sm"
                variant="link"
                onClick={() => {
                  if (stepIndex > 0) {
                    setStepIndex(stepIndex - 1);
                  }
                }}
              >
                Prev
              </Button>
            )}
          </Col>
          <Col>
            <ol
              className={cx(styles.carouselIndicators, "carousel-indicators")}
            >
              {steps.map((_, index) => {
                return (
                  <li
                    key={index}
                    className={cx({ active: index === stepIndex })}
                    onClick={() => {
                      setStepIndex(index);
                    }}
                  />
                );
              })}
            </ol>
          </Col>
          <Col className="d-flex justify-content-end">
            <Button
              size="sm"
              onClick={() => {
                if (stepIndex < steps.length - 1) {
                  setStepIndex(stepIndex + 1);
                } else {
                  closeWalkthroughModal(opener);
                }
              }}
            >
              {stepIndex < steps.length - 1 ? "Next" : "Close"}
            </Button>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export const showWalkthroughModal = async () => {
  expectContext("contentScript");

  controller = new AbortController();
  const target = await getThisFrame();

  const frameSource = new URL(browser.runtime.getURL("walkthroughModal.html"));
  frameSource.searchParams.set("opener", JSON.stringify(target));

  const modal = registerModal();
  showModal({ url: frameSource, controller });

  try {
    await modal;
  } finally {
    controller.abort();
  }
};

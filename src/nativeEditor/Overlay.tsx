/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Adapted from: https://github.com/facebook/react/blob/b438699d3620bff236282b049204e1221b3689e9/packages/react-devtools-shared/src/backend/views/Highlighter/Overlay.js
 */

type Rect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type Box = { top: number; left: number; width: number; height: number };

class OverlayRect {
  node: HTMLElement;
  border: HTMLElement;
  padding: HTMLElement;
  content: HTMLElement;

  constructor(doc: Document, container: HTMLElement) {
    this.node = doc.createElement("div");
    this.border = doc.createElement("div");
    this.padding = doc.createElement("div");
    this.content = doc.createElement("div");

    this.border.style.borderColor = overlayStyles.border;
    this.padding.style.borderColor = overlayStyles.padding;
    this.content.style.backgroundColor = overlayStyles.background;

    Object.assign(this.node.style, {
      borderColor: overlayStyles.margin,
      pointerEvents: "none",
      position: "absolute",
    });

    this.node.style.zIndex = "10000000";

    this.node.append(this.border);
    this.border.append(this.padding);
    this.padding.append(this.content);
    container.append(this.node);
  }

  remove() {
    if (this.node.parentNode) {
      this.node.remove();
    }
  }

  update(box: Rect, dims: any) {
    boxWrap(dims, "margin", this.node);
    boxWrap(dims, "border", this.border);
    boxWrap(dims, "padding", this.padding);

    Object.assign(this.content.style, {
      height:
        box.height -
        dims.borderTop -
        dims.borderBottom -
        dims.paddingTop -
        dims.paddingBottom +
        "px",
      width:
        box.width -
        dims.borderLeft -
        dims.borderRight -
        dims.paddingLeft -
        dims.paddingRight +
        "px",
    });

    Object.assign(this.node.style, {
      top: box.top - dims.marginTop + window.scrollY + "px",
      left: box.left - dims.marginLeft + window.scrollX + "px",
    });
  }
}

class OverlayTip {
  tip: HTMLElement;
  nameSpan: HTMLElement;
  dimSpan: HTMLElement;

  constructor(doc: Document, container: HTMLElement) {
    this.tip = doc.createElement("div");
    Object.assign(this.tip.style, {
      display: "flex",
      flexFlow: "row nowrap",
      backgroundColor: "#333740",
      borderRadius: "2px",
      fontFamily:
        '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
      fontWeight: "bold",
      padding: "3px 5px",
      pointerEvents: "none",
      position: "absolute",
      fontSize: "12px",
      whiteSpace: "nowrap",
    });

    this.nameSpan = doc.createElement("span");
    this.tip.append(this.nameSpan);
    Object.assign(this.nameSpan.style, {
      color: "#ee78e6",
      borderRight: "1px solid #aaaaaa",
      paddingRight: "0.5rem",
      marginRight: "0.5rem",
    });
    this.dimSpan = doc.createElement("span");
    this.tip.append(this.dimSpan);
    Object.assign(this.dimSpan.style, {
      color: "#d7d7d7",
    });

    this.tip.style.zIndex = "10000000";
    container.append(this.tip);
  }

  remove() {
    if (this.tip.parentNode) {
      this.tip.remove();
    }
  }

  updateText(name: string, width: number, height: number) {
    this.nameSpan.textContent = name;
    this.dimSpan.textContent =
      Math.round(width) + "px × " + Math.round(height) + "px";
  }

  updatePosition(dims: Box, bounds: Box) {
    const tipRect = this.tip.getBoundingClientRect();
    const tipPos = findTipPos(dims, bounds, {
      width: tipRect.width,
      height: tipRect.height,
    });
    Object.assign(this.tip.style, tipPos.style);
  }
}

function findTipPos(dims: any, bounds: any, tipSize: any) {
  const tipHeight = Math.max(tipSize.height, 20);
  const tipWidth = Math.max(tipSize.width, 60);
  const margin = 5;

  let top;
  if (dims.top + dims.height + tipHeight <= bounds.top + bounds.height) {
    if (dims.top + dims.height < bounds.top + 0) {
      top = bounds.top + margin;
    } else {
      top = dims.top + dims.height + margin;
    }
  } else if (dims.top - tipHeight <= bounds.top + bounds.height) {
    if (dims.top - tipHeight - margin < bounds.top + margin) {
      top = bounds.top + margin;
    } else {
      top = dims.top - tipHeight - margin;
    }
  } else {
    top = bounds.top + bounds.height - tipHeight - margin;
  }

  let left = dims.left + margin;
  if (dims.left < bounds.left) {
    left = bounds.left + margin;
  }
  if (dims.left + tipWidth > bounds.left + bounds.width) {
    left = bounds.left + bounds.width - tipWidth - margin;
  }

  top += window.scrollY;
  left += window.scrollX;

  top += "px";
  left += "px";
  return {
    style: { top, left },
  };
}

interface Dimensions {
  borderLeft: number;
  borderRight: number;
  borderTop: number;
  borderBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}
export function getElementDimensions(domElement: Element): Dimensions {
  const calculatedStyle = window.getComputedStyle(domElement);
  return {
    borderLeft: Number.parseInt(calculatedStyle.borderLeftWidth, 10),
    borderRight: Number.parseInt(calculatedStyle.borderRightWidth, 10),
    borderTop: Number.parseInt(calculatedStyle.borderTopWidth, 10),
    borderBottom: Number.parseInt(calculatedStyle.borderBottomWidth, 10),
    marginLeft: Number.parseInt(calculatedStyle.marginLeft, 10),
    marginRight: Number.parseInt(calculatedStyle.marginRight, 10),
    marginTop: Number.parseInt(calculatedStyle.marginTop, 10),
    marginBottom: Number.parseInt(calculatedStyle.marginBottom, 10),
    paddingLeft: Number.parseInt(calculatedStyle.paddingLeft, 10),
    paddingRight: Number.parseInt(calculatedStyle.paddingRight, 10),
    paddingTop: Number.parseInt(calculatedStyle.paddingTop, 10),
    paddingBottom: Number.parseInt(calculatedStyle.paddingBottom, 10),
  };
}

function boxWrap(dims: any, what: any, node: HTMLElement) {
  Object.assign(node.style, {
    borderTopWidth: dims[what + "Top"] + "px",
    borderLeftWidth: dims[what + "Left"] + "px",
    borderRightWidth: dims[what + "Right"] + "px",
    borderBottomWidth: dims[what + "Bottom"] + "px",
    borderStyle: "solid",
  });
}

const overlayStyles = {
  background: "rgba(120, 170, 210, 0.7)",
  padding: "rgba(77, 200, 0, 0.3)",
  margin: "rgba(255, 155, 0, 0.3)",
  border: "rgba(255, 200, 50, 0.3)",
};

export default class Overlay {
  window: Window;
  tipBoundsWindow: Window;
  container: HTMLElement;
  tip: OverlayTip;
  rects: Array<OverlayRect>;

  constructor() {
    // Find the root window, because overlays are positioned relative to it.
    const currentWindow = window; // window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
    this.window = window;

    // When opened in shells/dev, the tooltip should be bound by the app iframe, not by the topmost window.
    const tipBoundsWindow = window; // window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
    this.tipBoundsWindow = tipBoundsWindow;

    const doc = currentWindow.document;
    this.container = doc.createElement("div");
    this.container.style.zIndex = "10000000";

    this.tip = new OverlayTip(doc, this.container);
    this.rects = [];

    doc.body.append(this.container);
  }

  remove(): void {
    this.tip.remove();
    for (const rect of this.rects) {
      rect.remove();
    }
    this.rects.length = 0;
    if (this.container.parentNode) {
      this.container.remove();
    }
  }

  inspect(nodes: Array<HTMLElement>, name?: string): void {
    // We can't get the size of text nodes or comment nodes. React as of v15
    // heavily uses comment nodes to delimit text.
    const elements = nodes.filter(
      (node) => node.nodeType === Node.ELEMENT_NODE
    );

    while (this.rects.length > elements.length) {
      const rect = this.rects.pop();
      rect.remove();
    }
    if (elements.length === 0) {
      return;
    }

    while (this.rects.length < elements.length) {
      this.rects.push(new OverlayRect(this.window.document, this.container));
    }

    const outerBox = {
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
      left: Number.POSITIVE_INFINITY,
    };

    for (const [index, element] of elements.entries()) {
      const box = getNestedBoundingClientRect(element, this.window);
      const dims = getElementDimensions(element);

      outerBox.top = Math.min(outerBox.top, box.top - dims.marginTop);
      outerBox.right = Math.max(
        outerBox.right,
        box.left + box.width + dims.marginRight
      );
      outerBox.bottom = Math.max(
        outerBox.bottom,
        box.top + box.height + dims.marginBottom
      );
      outerBox.left = Math.min(outerBox.left, box.left - dims.marginLeft);

      const rect = this.rects[index];
      rect.update(box, dims);
    }

    if (!name) {
      name = elements[0].nodeName.toLowerCase();
    }

    this.tip.updateText(
      name,
      outerBox.right - outerBox.left,
      outerBox.bottom - outerBox.top
    );

    const tipBounds = getNestedBoundingClientRect(
      this.tipBoundsWindow.document.documentElement,
      this.window
    );

    this.tip.updatePosition(
      {
        top: outerBox.top,
        left: outerBox.left,
        height: outerBox.bottom - outerBox.top,
        width: outerBox.right - outerBox.left,
      },
      {
        top: tipBounds.top + this.tipBoundsWindow.scrollY,
        left: tipBounds.left + this.tipBoundsWindow.scrollX,
        height: this.tipBoundsWindow.innerHeight,
        width: this.tipBoundsWindow.innerWidth,
      }
    );
  }
}

// Get a bounding client rect for a node, with an
// offset added to compensate for its border.
function getBoundingClientRectWithBorderOffset(node: HTMLElement) {
  const dimensions = getElementDimensions(node);
  return mergeRectOffsets([
    node.getBoundingClientRect(),
    {
      top: dimensions.borderTop,
      left: dimensions.borderLeft,
      bottom: dimensions.borderBottom,
      right: dimensions.borderRight,
      // This width and height won't get used by mergeRectOffsets (since this
      // is not the first rect in the array), but we set them so that this
      // object typechecks as a ClientRect.
      width: 0,
      height: 0,
    },
  ]);
}

// Add together the top, left, bottom, and right properties of
// each ClientRect, but keep the width and height of the first one.
function mergeRectOffsets(rects: Array<Rect>): Rect {
  return rects.reduce((previousRect, rect) => {
    if (previousRect == null) {
      return rect;
    }

    return {
      top: previousRect.top + rect.top,
      left: previousRect.left + rect.left,
      width: previousRect.width,
      height: previousRect.height,
      bottom: previousRect.bottom + rect.bottom,
      right: previousRect.right + rect.right,
    };
  });
}

// Calculate a boundingClientRect for a node relative to boundaryWindow,
// taking into account any offsets caused by intermediate iframes.
function getNestedBoundingClientRect(
  node: HTMLElement,
  boundaryWindow: Window
): Rect {
  const ownerIframe = getOwnerIframe(node);
  if (ownerIframe) {
    const rects = [node.getBoundingClientRect()];
    let currentIframe = ownerIframe;
    let onlyOneMore = false;
    while (currentIframe) {
      const rect = getBoundingClientRectWithBorderOffset(currentIframe);
      rects.push(rect as DOMRect);
      currentIframe = getOwnerIframe(currentIframe);

      if (onlyOneMore) {
        break;
      }
      // We don't want to calculate iframe offsets upwards beyond
      // the iframe containing the boundaryWindow, but we
      // need to calculate the offset relative to the boundaryWindow.
      if (currentIframe && getOwnerWindow(currentIframe) === boundaryWindow) {
        onlyOneMore = true;
      }
    }

    return mergeRectOffsets(rects);
  } else {
    return node.getBoundingClientRect();
  }
}

// Get the window object for the document that a node belongs to,
// or return null if it cannot be found (node not attached to DOM,
// etc).
function getOwnerWindow(node: HTMLElement): typeof window | null {
  if (!node.ownerDocument) {
    return null;
  }
  return node.ownerDocument.defaultView;
}

// Get the iframe containing a node, or return null if it cannot
// be found (node not within iframe, etc).
function getOwnerIframe(node: HTMLElement): HTMLElement | null {
  const nodeWindow = getOwnerWindow(node);
  if (nodeWindow) {
    return nodeWindow.frameElement as HTMLElement;
  }
  return null;
}

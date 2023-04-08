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

import { uuidv4 } from "@/types/helpers";
import { BusinessError } from "@/errors/businessErrors";
import { ElementReference } from "@/types/runtimeTypes";

type ElementOrDocument = HTMLElement | Document;

// Reference cache to ensure same reference is returned across calls for element
const knownElementReferences = new WeakMap<
  ElementOrDocument,
  ElementReference
>();
const elementLookup = new Map<ElementReference, WeakRef<ElementOrDocument>>();

/**
 * Returns a reference uuid for element. If a reference already exists, it is returned.
 * @param element the element to generate a reference for
 */
export function getReferenceForElement(
  element: ElementOrDocument
): ElementReference {
  let id = knownElementReferences.get(element);
  if (id == null) {
    id = uuidv4() as ElementReference;
    knownElementReferences.set(element, id);
    elementLookup.set(id, new WeakRef(element));
  }

  return id;
}

/**
 * Return the element for a given reference id.
 * @param id the element reference
 */
export function getElementForReference(
  id: ElementReference
): ElementOrDocument {
  const elementReference = elementLookup.get(id);

  if (elementReference == null) {
    throw new BusinessError(
      "Id is not a valid element reference for the document"
    );
  }

  const element = elementReference.deref();

  if (element == null) {
    throw new BusinessError("Referenced element is no longer in the document");
  }

  return element;
}

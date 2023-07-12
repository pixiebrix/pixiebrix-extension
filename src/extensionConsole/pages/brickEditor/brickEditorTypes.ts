import { type Brick } from "@/types/brickTypes";
import { type StarterBrick } from "@/types/extensionPointTypes";
import { type Integration } from "@/types/serviceTypes";

export type ReferenceEntry = Brick | StarterBrick | Integration;

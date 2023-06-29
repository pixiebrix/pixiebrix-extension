import { type IBlock } from "@/types/blockTypes";
import { type StarterBrick } from "@/types/extensionPointTypes";
import { type IService } from "@/types/serviceTypes";

export type ReferenceEntry = IBlock | StarterBrick | IService;

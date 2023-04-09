import { type IBlock } from "@/types/blockTypes";
import { type IExtensionPoint } from "@/types/extensionPointTypes";
import { type IService } from "@/types/serviceTypes";

export type ReferenceEntry = IBlock | IExtensionPoint | IService;

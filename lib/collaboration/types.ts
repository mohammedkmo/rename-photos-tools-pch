import type { LiveList, LiveObject } from "@liveblocks/client";

export type SheetKind = "personal" | "vehicles";
export type CollaborationRole = "owner" | "editor";

export type SharedRequest = {
  contractor: string;
  associatedPetroChinaContractNumber: string;
  contractHoldingPetroChinaDepartment: string;
};

/**
 * A superset keeps one Liveblocks room schema for both sheets. Every field is
 * present so concurrent edits can be applied at cell level instead of replacing
 * an entire row and accidentally overwriting somebody else's work.
 */
export type SharedRow = {
  rowId: string;
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  idDocumentNumber: string;
  nationality: string;
  subcontractor: string;
  eaLetterNumber: string;
  numberInEaList: string;
  securityClearanceExpiryDate: string;
  plateNumber: string;
  province: string;
  make: string;
  model: string;
  softskinArmored: string;
  senewiyahNumber: string;
  wakalaNumber: string;
  relatedPersons: string;
  mediaPhoto: boolean;
  mediaIdDocument: boolean;
  mediaDrivingLicense: boolean;
  mediaMoiCard: boolean;
  mediaSenewiyah: boolean;
  mediaWakala: boolean;
  mediaArmoredVehicleCertificate: boolean;
};

export type CollaborationUserInfo = {
  name: string;
  color: string;
  avatar: string;
  role: CollaborationRole;
};

export type RoomSnapshot = {
  kind: SheetKind;
  request: SharedRequest;
  rows: SharedRow[];
};

export const EMPTY_REQUEST: SharedRequest = {
  contractor: "",
  associatedPetroChinaContractNumber: "",
  contractHoldingPetroChinaDepartment: "",
};

export const EMPTY_SHARED_ROW: Omit<SharedRow, "rowId"> = {
  id: "",
  firstName: "",
  lastName: "",
  position: "",
  idDocumentNumber: "",
  nationality: "",
  subcontractor: "",
  eaLetterNumber: "",
  numberInEaList: "",
  securityClearanceExpiryDate: "",
  plateNumber: "",
  province: "",
  make: "",
  model: "",
  softskinArmored: "Softskin",
  senewiyahNumber: "",
  wakalaNumber: "",
  relatedPersons: "",
  mediaPhoto: false,
  mediaIdDocument: false,
  mediaDrivingLicense: false,
  mediaMoiCard: false,
  mediaSenewiyah: false,
  mediaWakala: false,
  mediaArmoredVehicleCertificate: false,
};

export const createSharedRow = (values: Partial<SharedRow> = {}): SharedRow => ({
  ...EMPTY_SHARED_ROW,
  ...values,
  rowId: values.rowId || crypto.randomUUID(),
});

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      selection: { row: number; col: number } | null;
    };
    Storage: {
      kind: SheetKind;
      request: LiveObject<SharedRequest>;
      rows: LiveList<LiveObject<SharedRow>>;
    };
    UserMeta: {
      id: string;
      info: CollaborationUserInfo;
    };
  }
}

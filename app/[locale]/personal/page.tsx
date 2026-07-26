import { Metadata } from "next";
import PersonalBadgeForm from "./form";
import CollaborationRoom from "@/components/collaboration/CollaborationRoom";

export const metadata: Metadata = {
  title: "Personal Badge",
  description: "Applying for Personal Badges",
}

export default function PersonalBadgePage({
  searchParams,
}: {
  searchParams: { room?: string | string[]; doc?: string | string[] };
}) {
  const roomId =
    typeof searchParams.room === "string" ? searchParams.room : undefined;
  // Identifies the saved application this sheet is editing.
  const documentId =
    typeof searchParams.doc === "string" ? searchParams.doc : undefined;
  // The shell bounds the height, so this just claims the space left under the
  // top bar. Only the grid inside scrolls.
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <CollaborationRoom roomId={roomId} kind="personal">
        <PersonalBadgeForm documentId={documentId} />
      </CollaborationRoom>
    </div>
  );
}

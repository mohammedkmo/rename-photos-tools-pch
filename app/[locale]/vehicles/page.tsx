import { Metadata } from "next";
import VehiclesBadgeForm from "./form";

export const metadata: Metadata = {
  title: "Vehicles Badge",
  description: "Applying for Vehicles Badges",
}

export default function VehiclesBadgePage() {
  // The grid owns its own scrolling, so the page fills the space under the
  // 3.5rem header exactly rather than growing the document.
  return (
    <div className="flex-1 min-h-0 flex flex-col h-[calc(100dvh-3.5rem)]">
      <VehiclesBadgeForm />
    </div>
  );
}

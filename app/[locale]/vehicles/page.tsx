import { Metadata } from "next";
import VehiclesBadgeForm from "./form";

export const metadata: Metadata = {
  title: "Vehicles Badge",
  description: "Applying for Vehicles Badges",
}

export default function VehiclesBadgePage() {
  // The shell bounds the height, so this just claims the space left under the
  // top bar. Only the grid inside scrolls.
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <VehiclesBadgeForm />
    </div>
  );
}

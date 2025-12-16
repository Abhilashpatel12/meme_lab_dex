import { LaunchForm } from "@/components/elements/LaunchForm";

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-lab-dark bg-[url('/grid-pattern.svg')] py-12 px-4">
      {/* Just render the form centered on the screen */}
      <LaunchForm />
    </div>
  );
}
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalPageShell({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative min-h-screen bg-white text-[#1b2048]"
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
    >
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 20% 0%, rgba(79,110,247,0.10) 0%, transparent 60%)",
        }}
      />

      <nav className="relative z-10 px-7 py-5 flex items-center justify-between max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#4a5282] hover:text-[#1b2048] transition-colors"
        >
          <div className="w-9 h-9 rounded-full border border-[#E4E8FF] bg-[#F8F9FF] flex items-center justify-center">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span className="text-[13px] font-medium">Back to Site</span>
        </Link>
        <div className="flex items-center gap-5 text-[13px] font-medium text-[#8a90bc]">
          <Link href="/terms" className="hover:text-[#4f6ef7] transition-colors">Terms of Use</Link>
          <Link href="/privacy" className="hover:text-[#4f6ef7] transition-colors">Privacy Policy</Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-6 pb-28 pt-8">
        <h1
          className="text-3xl md:text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          {title}
        </h1>
        <p className="text-[13px] text-[#8a90bc] mb-10">
          Effective date: {effectiveDate} &middot; Mindesk
        </p>
        <div className="legal-prose">{children}</div>
      </main>
    </div>
  );
}

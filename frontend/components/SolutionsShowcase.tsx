"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, ListChecks, LineChart, Wallet, Package, Check, ArrowRight } from "lucide-react";

type Theme = {
  bgFrom: string;
  bgTo: string;
  border: string;
  accentDark: string;
  accentBase: string;
};

type Tab = {
  id: string;
  label: string;
  icon: typeof Calendar;
  heading: string;
  desc: string;
  bullets: string[];
  cta: string;
  image: string;
  alt: string;
  theme: Theme;
};

const TABS: Tab[] = [
  {
    id: "booking",
    label: "Booking",
    icon: Calendar,
    heading: "Never miss a booking",
    desc: "Your own public booking link puts your calendar in your clients' hands — see trends and today's sessions at a glance.",
    bullets: ["Live booking trend at a glance", "Real-time patient count", "Today's sessions, always current"],
    cta: "Explore Booking",
    image: "/screens/overview.png",
    alt: "Mindesk booking overview",
    // Purple — matches the Booking Trend tile in the dashboard itself.
    theme: { bgFrom: "#F5F3FF", bgTo: "#FBFAFF", border: "#E7E0FF", accentDark: "#4B3EC2", accentBase: "#7A6CE6" },
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: ListChecks,
    heading: "Every session, tracked and filtered",
    desc: "See every appointment status at a glance — awaiting payment, confirmed, completed, or cancelled — and act on any of them in one click.",
    bullets: ["Filter by status: pending, confirmed, completed", "Confirm or cancel sessions instantly", "Search by patient name or email"],
    cta: "Explore Appointments",
    image: "/screens/appointments.png",
    alt: "Mindesk appointments list",
    // Amber — matches the Appointments sidebar badge and awaiting-payment status color.
    theme: { bgFrom: "#FFF8EC", bgTo: "#FFFDF8", border: "#FBE8C6", accentDark: "#92400E", accentBase: "#F59E0B" },
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: LineChart,
    heading: "Know your practice, numbers included",
    desc: "Session trends, client health, and cumulative growth — the metrics that matter, visualized automatically.",
    bullets: ["Appointment trends over time", "Client health & retention", "Cumulative growth charts"],
    cta: "Explore Analytics",
    image: "/screens/analytics.png",
    alt: "Mindesk analytics dashboard",
    // Indigo — the app's primary accent.
    theme: { bgFrom: "#EEF2FF", bgTo: "#F8FAFF", border: "#DCE3FF", accentDark: "#2A3FBD", accentBase: "#4F6EF7" },
  },
  {
    id: "payments",
    label: "Payments",
    icon: Wallet,
    heading: "Get paid, right on time",
    desc: "Know exactly what's owed to you before it becomes a problem — outstanding balances and invoice status, always visible.",
    bullets: ["Outstanding balances flagged instantly", "Unpaid invoices tracked automatically", "Mark paid or waive in one click"],
    cta: "Explore Payments",
    image: "/screens/billing.png",
    alt: "Mindesk payments tracking",
    // Pink — matches the Awaiting Payment tile in the dashboard.
    theme: { bgFrom: "#FDF0F5", bgTo: "#FFF8FA", border: "#FAD7E4", accentDark: "#A61E56", accentBase: "#EA5790" },
  },
  {
    id: "services",
    label: "Your Services",
    icon: Package,
    heading: "Your services, your rules",
    desc: "Build your own session catalog — set pricing, duration, and descriptions for every service you offer, shown right on your booking page.",
    bullets: ["Custom session types & pricing", "Duration and description per service", "Shown directly on your booking page"],
    cta: "Explore Services",
    image: "/screens/services.png",
    alt: "Mindesk services catalog",
    // Green — matches the "Active" status pills on the Services page.
    theme: { bgFrom: "#EDFBF5", bgTo: "#F8FFFC", border: "#C9F0DE", accentDark: "#067A55", accentBase: "#00C48C" },
  },
];

export default function SolutionsShowcase() {
  const [activeId, setActiveId] = useState(TABS[0].id);
  const active = TABS.find(t => t.id === activeId) ?? TABS[0];
  const { theme } = active;

  return (
    <section id="solutions" className="relative z-20 py-20 md:py-28 max-w-[1400px] mx-auto px-6 md:px-12">
      <div className="text-center mb-12">
        <h2
          className="text-3xl md:text-5xl font-bold text-[#1b2048] mb-4 tracking-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Solutions for every step of your practice
        </h2>
        <p className="text-[#4a5282] text-lg font-light">
          Powered by one friendly platform.
        </p>
      </div>

      {/* Tab selector — plain text, only the active tab gets a colored pill */}
      <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 mb-12">
        {TABS.map(tab => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveId(tab.id)}
              style={isActive ? { background: tab.theme.accentBase } : undefined}
              className={`text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "px-5 py-2.5 rounded-full text-white shadow-md"
                  : "px-1 py-2.5 text-[#4a5282] hover:text-[#1b2048]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.3fr] gap-6 lg:gap-6 items-stretch">
        {/* Left: copy, in a card tinted to match this tab's color */}
        <div
          key={`${active.id}-copy`}
          className="anim-fade-in rounded-[32px] p-8 md:p-10 flex flex-col justify-center"
          style={{ background: `linear-gradient(160deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`, border: `1px solid ${theme.border}` }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6">
            <active.icon className="w-6 h-6" style={{ color: theme.accentBase }} />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight" style={{ color: theme.accentDark }}>
            {active.heading}
          </h3>
          <p className="text-[#4a5282] text-[15px] leading-relaxed mb-6">
            {active.desc}
          </p>
          <ul className="flex flex-col gap-3 mb-8">
            {active.bullets.map(b => (
              <li key={b} className="flex items-start gap-2.5 text-[#1b2048] text-sm font-medium">
                <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: theme.accentBase }} />
                {b}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:gap-2.5 transition-all duration-300 w-fit"
            style={{ color: theme.accentDark }}
          >
            {active.cta} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Right: screenshot, floated inside a matching tinted card */}
        <div
          className="relative rounded-[32px] overflow-hidden min-h-[360px] md:min-h-[460px] flex items-end justify-center p-6 md:p-9"
          style={{ background: `linear-gradient(160deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`, border: `1px solid ${theme.border}` }}
        >
          <img
            key={active.id}
            src={active.image}
            alt={active.alt}
            className="anim-fade-in w-[94%] h-auto rounded-xl border border-white shadow-[0_24px_60px_-12px_rgba(20,25,60,0.22)]"
          />
        </div>
      </div>
    </section>
  );
}

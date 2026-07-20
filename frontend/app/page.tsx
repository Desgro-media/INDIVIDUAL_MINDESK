import Link from "next/link";

import { ArrowRight, Calendar, CreditCard, LineChart, ShieldCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import QuoteRotator from "@/components/QuoteRotator";
import FaqAccordion from "@/components/FaqAccordion";

export default function Home() {
  return (
    <div
      className="bg-[#0A1211] text-white selection:bg-[#337C7E]/30 overflow-x-hidden relative"
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
    >
      {/* --- HERO WRAPPER --- */}
      <div className="relative w-full overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        ></div>
        {/* Teal glow */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 20% 0%, rgba(51,124,126,0.35) 0%, transparent 60%), radial-gradient(ellipse 50% 45% at 100% 20%, rgba(128,117,196,0.20) 0%, transparent 65%)",
          }}
        ></div>

        <div className="relative z-10 max-w-[1400px] mx-auto w-full flex flex-col">
          {/* --- Navigation --- */}
          <nav className="flex items-center justify-between px-6 py-6 md:px-10 w-full animate-fade-in-up">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0A1211] font-bold text-sm shrink-0">
                M
              </div>
              <span className="text-lg font-bold tracking-wide text-white">Mindesk</span>
            </div>

            <div className="hidden lg:flex items-center gap-9 text-sm text-white/60">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-[15px] text-white/75 hover:text-white transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#0A1211] text-[14px] font-semibold hover:bg-white/90 transition-colors shadow-sm"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </nav>

          {/* --- Hero Content --- */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-10 lg:gap-6">
            {/* Left: eyebrow + giant wordmark */}
            <div className="px-6 md:px-10 pt-10 pb-4 md:pt-16 md:pb-10 opacity-0 animate-fade-in-up [animation-delay:100ms]">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/[0.04] text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5FE0C8]"></span>
                For independent psychologists
              </div>

              <p
                className="text-2xl md:text-3xl text-white/85 font-medium mb-1"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Run your practice,
              </p>
              <h1 className="text-[clamp(3.2rem,11vw,9.5rem)] leading-[0.86] font-bold text-white tracking-tight -ml-1">
                Mindesk
              </h1>
            </div>

            {/* Right: description + platform preview + CTAs */}
            <div className="px-6 md:px-10 pb-14 md:pb-16 flex flex-col justify-between opacity-0 animate-fade-in-up [animation-delay:300ms]">
              <p className="text-white/55 text-[15px] leading-relaxed mb-8">
                A booking page, client records, session notes, invoicing, and
                analytics — everything a freelance psychologist needs to run
                their practice solo, with no clinic, no staff, and no admin
                overhead.
              </p>

              {/* Platform preview collage — hover to bring a screen forward */}
              <div className="relative h-[170px] sm:h-[190px] mb-10 select-none">
                <img
                  src="/screens/overview.png"
                  alt="Mindesk dashboard overview"
                  tabIndex={0}
                  className="absolute top-0 left-0 z-10 w-[52%] sm:w-[48%] rounded-xl border border-white/15 shadow-2xl shadow-black/50 -rotate-[5deg] cursor-pointer transition-all duration-300 ease-out hover:z-30 focus-visible:z-30 hover:-translate-y-3 focus-visible:-translate-y-3 hover:rotate-0 focus-visible:rotate-0 hover:scale-110 focus-visible:scale-110 hover:shadow-[0_24px_60px_rgba(0,0,0,0.65)] outline-none focus-visible:ring-2 focus-visible:ring-[#5FE0C8]"
                />
                <img
                  src="/screens/analytics.png"
                  alt="Mindesk analytics dashboard"
                  tabIndex={0}
                  className="absolute top-8 left-[26%] sm:left-[24%] z-20 w-[52%] sm:w-[48%] rounded-xl border border-white/15 shadow-2xl shadow-black/50 rotate-[2deg] cursor-pointer transition-all duration-300 ease-out hover:z-30 focus-visible:z-30 hover:-translate-y-3 focus-visible:-translate-y-3 hover:rotate-0 focus-visible:rotate-0 hover:scale-110 focus-visible:scale-110 hover:shadow-[0_24px_60px_rgba(0,0,0,0.65)] outline-none focus-visible:ring-2 focus-visible:ring-[#5FE0C8]"
                />
                <img
                  src="/screens/billing.png"
                  alt="Mindesk billing dashboard"
                  tabIndex={0}
                  className="absolute top-2 left-[50%] sm:left-[46%] z-10 w-[52%] sm:w-[48%] rounded-xl border border-white/15 shadow-2xl shadow-black/50 rotate-[6deg] hidden sm:block cursor-pointer transition-all duration-300 ease-out hover:z-30 focus-visible:z-30 hover:-translate-y-3 focus-visible:-translate-y-3 hover:rotate-0 focus-visible:rotate-0 hover:scale-110 focus-visible:scale-110 hover:shadow-[0_24px_60px_rgba(0,0,0,0.65)] outline-none focus-visible:ring-2 focus-visible:ring-[#5FE0C8]"
                />
                <span className="absolute bottom-0 right-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 pointer-events-none">
                  Our platform
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#337C7E] text-white text-[14px] font-semibold hover:bg-[#3f9294] transition-all shadow-md"
                >
                  Create your free account <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/20 text-white/85 text-[14px] font-semibold hover:bg-white/[0.06] transition-all"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>

          {/* --- Feature strip --- */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 px-6 md:px-10 pb-14 md:pb-20 opacity-0 animate-fade-in-up [animation-delay:450ms]">
            {[
              { icon: Calendar, label: "Booking" },
              { icon: ShieldCheck, label: "Records" },
              { icon: CreditCard, label: "Invoicing" },
              { icon: LineChart, label: "Analytics" },
            ].map((tab, i) => (
              <div key={tab.label} className="flex items-center gap-2.5 text-[13px] font-medium text-white/55">
                <span className="text-white/30 text-xs tabular-nums">0{i + 1}</span>
                <tab.icon className="w-3.5 h-3.5 text-white/40" />
                {tab.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* --- END HERO WRAPPER --- */}

      {/* --- Feature Grid --- */}
      <section id="features" className="relative z-20 pt-4 pb-20 md:pb-28 max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: Calendar, label: "Your own booking link", desc: "Share one link — clients book straight into your calendar." },
            { icon: ShieldCheck, label: "Private by design", desc: "Your patients, notes, and data are yours alone — never shared." },
            { icon: CreditCard, label: "Invoicing built in", desc: "Track payments, discounts, and bank details per session." },
            { icon: LineChart, label: "Practice analytics", desc: "See retention, revenue, and session trends at a glance." },
          ].map((f, i) => (
            <ScrollReveal key={i} delay={i * 120} animationClass="animate-fade-in-up">
              <div className="group relative bg-gradient-to-b from-white/[0.06] to-white/[0.015] border border-white/10 p-7 md:p-8 rounded-3xl h-full overflow-hidden transform hover:-translate-y-2 hover:border-[#5FE0C8]/25 transition-all duration-300 hover:shadow-[0_24px_56px_-12px_rgba(51,124,126,0.35)]">
                {/* corner glow, appears on hover */}
                <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#337C7E]/25 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                {/* top specular hairline */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                <div className="relative flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#337C7E]/35 to-[#337C7E]/10 border border-[#5FE0C8]/20 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] group-hover:scale-110 group-hover:border-[#5FE0C8]/40 transition-all duration-300">
                    <f.icon className="w-5 h-5 text-[#5FE0C8]" />
                  </div>
                  <span className="text-white/20 text-[11px] font-bold tabular-nums pt-1">0{i + 1}</span>
                </div>
                <div className="relative text-white font-semibold text-[15px] mb-1.5">{f.label}</div>
                <div className="relative text-white/50 text-sm leading-relaxed">{f.desc}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <QuoteRotator />

      {/* --- FAQ Section --- */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6 overflow-hidden">
        <ScrollReveal animationClass="animate-fade-in-up">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Frequently Asked Questions
            </h2>
            <p className="text-white/50 text-lg font-light">
              Everything you need to know before you sign up.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animationClass="animate-fade-in-up" delay={100}>
          <FaqAccordion
            items={[
              {
                q: "Who is Mindesk for?",
                a: "Freelance and independent psychologists who run their own practice without a clinic, staff, or admin team. Each account is a single practitioner — there's no multi-user or staff management, by design.",
              },
              {
                q: "Do my clients need an account?",
                a: "No. Clients book through your own public booking link with just their name, phone, and email — no login required.",
              },
              {
                q: "Is my client data shared with other practitioners?",
                a: "No. Every account is fully isolated — your patients, appointments, notes, invoices, and settings are visible only to you.",
              },
              {
                q: "Can I change my services and pricing later?",
                a: "Yes. Your service catalog, pricing, and weekly availability are all editable any time from Settings.",
              },
            ]}
          />
        </ScrollReveal>
      </section>

      {/* --- Footer CTA --- */}
      <footer className="py-24 max-w-4xl mx-auto px-6 text-center overflow-hidden">
        <ScrollReveal animationClass="animate-scale-in">
          <h2
            className="text-4xl font-medium text-white mb-6"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Ready to run your own practice?
          </h2>
          <p className="text-white/50 text-lg font-light mb-10 max-w-xl mx-auto">
            Set up your booking page in minutes. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full bg-[#337C7E] text-white text-lg font-medium hover:bg-[#3f9294] transition-all shadow-lg shadow-[#337C7E]/25"
          >
            Create your free account
          </Link>
          <p className="mt-16 text-sm text-white/30">
            &copy; {new Date().getFullYear()} Mindesk. All rights reserved.
          </p>
        </ScrollReveal>
      </footer>
    </div>
  );
}

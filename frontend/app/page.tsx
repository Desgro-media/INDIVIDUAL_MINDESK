import Link from "next/link";

import { ArrowRight, Calendar, Check, CreditCard, LineChart, ShieldCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import QuoteRotator from "@/components/QuoteRotator";
import FaqAccordion from "@/components/FaqAccordion";

export default function Home() {
  return (
    <div
      className="bg-white text-[#1b2048] selection:bg-[#4f6ef7]/30 overflow-x-hidden relative"
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
    >
      {/* --- HERO WRAPPER --- */}
      <div className="relative w-full overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(27,32,72,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(27,32,72,0.09) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        ></div>
        {/* Indigo/purple glow */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 20% 0%, rgba(79,110,247,0.16) 0%, transparent 60%), radial-gradient(ellipse 50% 45% at 100% 20%, rgba(122,108,230,0.14) 0%, transparent 65%)",
          }}
        ></div>

        <div className="relative z-10 max-w-[1400px] mx-auto w-full flex flex-col">
          {/* --- Navigation --- */}
          <nav className="flex items-center justify-between px-6 py-6 md:px-10 w-full animate-fade-in-up">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: "linear-gradient(135deg, #7A6CE6 0%, #4B3EC2 100%)" }}
              >
                M
              </div>
              <span className="text-lg font-bold tracking-wide text-[#1b2048]">Mindesk</span>
            </div>

            <div className="hidden lg:flex items-center gap-9 text-sm text-[#4a5282]">
              <a href="#features" className="hover:text-[#1b2048] transition-colors">Features</a>
              <a href="#pricing" className="hover:text-[#1b2048] transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-[#1b2048] transition-colors">FAQ</a>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-[15px] text-[#4a5282] hover:text-[#1b2048] transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#4f6ef7] text-white text-[14px] font-semibold hover:bg-[#3d5ce0] transition-colors shadow-sm"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </nav>

          {/* --- Hero Content --- */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-10 lg:gap-6">
            {/* Left: eyebrow + giant wordmark */}
            <div className="px-6 md:px-10 pt-10 pb-4 md:pt-16 md:pb-10 opacity-0 animate-fade-in-up [animation-delay:100ms]">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4f6ef7]/15 bg-[#4f6ef7]/[0.05] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4a5282] mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA5790]"></span>
                For independent psychologists
              </div>

              <p
                className="text-2xl md:text-3xl text-[#4a5282] font-medium mb-1"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Run your practice,
              </p>
              <h1 className="text-[clamp(3.2rem,11vw,9.5rem)] leading-[0.86] font-bold text-[#1b2048] tracking-tight -ml-1">
                Mindesk
              </h1>
            </div>

            {/* Right: description + platform preview */}
            <div className="px-6 md:px-10 pb-14 md:pb-16 flex flex-col opacity-0 animate-fade-in-up [animation-delay:300ms]">
              <p className="text-[#4a5282] text-[15px] leading-relaxed mb-8">
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
                  className="absolute top-0 left-0 z-10 w-[52%] sm:w-[48%] rounded-xl border border-[#D6DCFA] shadow-2xl shadow-slate-400/30 -rotate-[5deg] cursor-pointer transition-all duration-300 ease-out hover:z-30 focus-visible:z-30 hover:-translate-y-3 focus-visible:-translate-y-3 hover:rotate-0 focus-visible:rotate-0 hover:scale-110 focus-visible:scale-110 hover:shadow-[0_24px_60px_rgba(80,110,200,0.35)] outline-none focus-visible:ring-2 focus-visible:ring-[#4f6ef7]"
                />
                <img
                  src="/screens/analytics.png"
                  alt="Mindesk analytics dashboard"
                  tabIndex={0}
                  className="absolute top-8 left-[26%] sm:left-[24%] z-20 w-[52%] sm:w-[48%] rounded-xl border border-[#D6DCFA] shadow-2xl shadow-slate-400/30 rotate-[2deg] cursor-pointer transition-all duration-300 ease-out hover:z-30 focus-visible:z-30 hover:-translate-y-3 focus-visible:-translate-y-3 hover:rotate-0 focus-visible:rotate-0 hover:scale-110 focus-visible:scale-110 hover:shadow-[0_24px_60px_rgba(80,110,200,0.35)] outline-none focus-visible:ring-2 focus-visible:ring-[#4f6ef7]"
                />
                <img
                  src="/screens/billing.png"
                  alt="Mindesk billing dashboard"
                  tabIndex={0}
                  className="absolute top-2 left-[50%] sm:left-[46%] z-10 w-[52%] sm:w-[48%] rounded-xl border border-[#D6DCFA] shadow-2xl shadow-slate-400/30 rotate-[6deg] hidden sm:block cursor-pointer transition-all duration-300 ease-out hover:z-30 focus-visible:z-30 hover:-translate-y-3 focus-visible:-translate-y-3 hover:rotate-0 focus-visible:rotate-0 hover:scale-110 focus-visible:scale-110 hover:shadow-[0_24px_60px_rgba(80,110,200,0.35)] outline-none focus-visible:ring-2 focus-visible:ring-[#4f6ef7]"
                />
                <span className="absolute bottom-0 right-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a90bc] pointer-events-none">
                  Our platform
                </span>
              </div>
            </div>
          </div>

          {/* --- Trial badge + CTAs — centered across the full hero width --- */}
          <div className="flex flex-col items-center px-6 md:px-10 pb-14 md:pb-16 opacity-0 animate-fade-in-up [animation-delay:400ms]">
            <div className="flex items-center justify-center gap-2.5 mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EA5790]/10 border border-[#EA5790]/25 text-[#D22C7A] text-[12px] font-semibold">
                14-day free trial
              </span>
              <span className="text-[#8a90bc] text-[13px]">then just ₹9,999/year</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-9 py-4 rounded-full bg-[#4f6ef7] text-white text-[16px] font-semibold hover:bg-[#3d5ce0] transition-all shadow-lg shadow-[#4f6ef7]/25"
              >
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-9 py-4 rounded-full border border-[#4f6ef7]/25 text-[#1b2048] text-[16px] font-semibold hover:bg-[#4f6ef7]/[0.06] transition-all"
              >
                Sign In
              </Link>
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
              <div key={tab.label} className="flex items-center gap-2.5 text-[13px] font-medium text-[#4a5282]">
                <span className="text-[#8a90bc] text-xs tabular-nums">0{i + 1}</span>
                <tab.icon className="w-3.5 h-3.5 text-[#8a90bc]" />
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
              <div className="group relative bg-white border border-[#E4E8FF] p-7 md:p-8 rounded-3xl h-full overflow-hidden transform hover:-translate-y-2 hover:border-[#4f6ef7]/30 transition-all duration-300 shadow-[0_12px_28px_rgba(80,110,200,0.07)] hover:shadow-[0_24px_56px_-12px_rgba(79,110,247,0.28)]">
                {/* corner glow, appears on hover */}
                <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#4f6ef7]/15 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                {/* top specular hairline */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4f6ef7]/20 to-transparent" />

                <div className="relative flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 flex items-center justify-center group-hover:scale-110 group-hover:border-[#4f6ef7]/40 transition-all duration-300">
                    <f.icon className="w-5 h-5 text-[#4f6ef7]" />
                  </div>
                  <span className="text-[#B8BEEF] text-[11px] font-bold tabular-nums pt-1">0{i + 1}</span>
                </div>
                <div className="relative text-[#1b2048] font-semibold text-[15px] mb-1.5">{f.label}</div>
                <div className="relative text-[#4a5282] text-sm leading-relaxed">{f.desc}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* --- Pricing --- */}
      <section id="pricing" className="relative z-20 py-20 md:py-28 max-w-[1000px] mx-auto px-6 md:px-12">
        <ScrollReveal animationClass="animate-fade-in-up">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-5xl font-bold text-[#1b2048] mb-4 tracking-tight"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Simple, Transparent Pricing
            </h2>
            <p className="text-[#4a5282] text-lg font-light">
              One plan. No surprises. Try it free for 14 days.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Trial card */}
          <ScrollReveal delay={0} animationClass="animate-fade-in-up">
            <div className="relative h-full bg-white border border-[#E4E8FF] p-8 rounded-3xl overflow-hidden flex flex-col shadow-[0_12px_28px_rgba(80,110,200,0.07)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4f6ef7]/20 to-transparent" />
              <p className="text-[#4a5282] text-sm font-semibold uppercase tracking-[0.1em] mb-3">14-Day Free Trial</p>
              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-bold text-[#1b2048]">₹0</span>
                <span className="text-[#8a90bc] text-sm">/ 14 days</span>
              </div>
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {[
                  "Full access to every feature",
                  "Your own booking page, records, invoicing & analytics",
                  "No credit card required",
                  "Cancel anytime, no obligation",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-[#4a5282] text-sm">
                    <Check className="w-4 h-4 text-[#4f6ef7] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-[#4f6ef7]/25 text-[#1b2048] text-[14px] font-semibold hover:bg-[#4f6ef7]/[0.06] transition-all"
              >
                Start Free Trial
              </Link>
            </div>
          </ScrollReveal>

          {/* Individual / yearly plan card */}
          <ScrollReveal delay={120} animationClass="animate-fade-in-up">
            <div
              className="relative h-full p-8 rounded-3xl overflow-hidden flex flex-col text-white border border-white/10 shadow-[0_24px_56px_-12px_rgba(75,62,194,0.35)]"
              style={{ background: "linear-gradient(135deg, #7A6CE6 0%, #4B3EC2 100%)" }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="absolute top-6 right-6 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-[10px] font-bold uppercase tracking-[0.1em]">
                Recommended
              </span>
              <p className="text-white/70 text-sm font-semibold uppercase tracking-[0.1em] mb-3">Individual</p>
              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-bold text-white">₹9,999</span>
                <span className="text-white/60 text-sm">/ year</span>
              </div>
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {[
                  "Everything in the free trial",
                  "Unlimited patients & appointments",
                  "Pay easily via GPay / UPI",
                  "Priority email support",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-white/85 text-sm">
                    <Check className="w-4 h-4 text-white mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-[#4B3EC2] text-[14px] font-semibold hover:bg-white/90 transition-all shadow-md"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <QuoteRotator />

      {/* --- FAQ Section --- */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6 overflow-hidden">
        <ScrollReveal animationClass="animate-fade-in-up">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-5xl font-bold text-[#1b2048] mb-4 tracking-tight"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Frequently Asked Questions
            </h2>
            <p className="text-[#4a5282] text-lg font-light">
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
            className="text-4xl font-medium text-[#1b2048] mb-6"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Ready to run your own practice?
          </h2>
          <p className="text-[#4a5282] text-lg font-light mb-10 max-w-xl mx-auto">
            Set up your booking page in minutes. 14-day free trial, then ₹9,999/year — no credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full bg-[#4f6ef7] text-white text-lg font-medium hover:bg-[#3d5ce0] transition-all shadow-lg shadow-[#4f6ef7]/25"
          >
            Create your free account
          </Link>
          <p className="mt-16 text-sm text-[#8a90bc]">
            &copy; {new Date().getFullYear()} Mindesk. All rights reserved.
          </p>
        </ScrollReveal>
      </footer>
    </div>
  );
}

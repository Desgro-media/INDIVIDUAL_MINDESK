import Link from "next/link";

import { ArrowRight, Calendar, CreditCard, LineChart, ShieldCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import QuoteRotator from "@/components/QuoteRotator";

export default function Home() {
  return (
    <div
      className="bg-white text-[#1A2B34] selection:bg-[#337C7E]/20 overflow-x-hidden relative"
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
    >
      {/* --- HERO WRAPPER --- */}
      <div className="relative w-full overflow-hidden bg-[#FAF9F6]">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-pulse-slow"
            style={{ background: "radial-gradient(circle, #E4D5F6 0%, transparent 70%)" }}
          ></div>
          <div
            className="absolute top-[20%] right-[-10%] w-[65vw] h-[65vw] rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-float"
            style={{ background: "radial-gradient(circle, #D5F0ED 0%, transparent 70%)", animationDelay: "2s" }}
          ></div>
          <div
            className="absolute bottom-[-20%] left-[10%] w-[60vw] h-[60vw] rounded-full mix-blend-multiply filter blur-[110px] opacity-40 animate-pulse-ring"
            style={{ background: "radial-gradient(circle, #FDE8D7 0%, transparent 70%)", animationDelay: "1s" }}
          ></div>
          <div className="absolute inset-0 backdrop-blur-[30px] bg-white/40 pointer-events-none"></div>
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto w-full flex flex-col min-h-[70vh]">
          {/* --- Navigation --- */}
          <nav className="flex items-center justify-between px-6 py-6 md:px-12 w-full animate-fade-in-up">
            <div className="flex flex-col leading-tight">
              <span className="text-2xl font-bold tracking-wide text-[#1A2B34]">Mindesk</span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden sm:inline-flex px-5 py-2 rounded-lg border border-[#8075C4] text-[#5C45A3] font-medium text-[15px] hover:bg-[#E4D5F6]/30 transition-colors bg-transparent"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-2 rounded-lg bg-[#337C7E] text-white text-[15px] font-medium hover:bg-[#276466] transition-colors shadow-sm"
              >
                Sign Up Free
              </Link>
            </div>
          </nav>

          {/* --- Hero Section --- */}
          <main className="relative flex-1 flex flex-col px-6 md:px-12 pt-8 md:pt-16 pb-16 max-w-[900px] mx-auto w-full text-center">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#337C7E] mb-4 opacity-0 animate-fade-in-up">
              For independent psychologists
            </p>
            <h1
              className="text-5xl md:text-6xl lg:text-[68px] leading-[1.05] font-bold text-[#1A2B34] mb-6 tracking-tight opacity-0 animate-fade-in-up [animation-delay:200ms]"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Run your practice, on your own terms.
            </h1>

            <p className="text-lg md:text-[20px] text-[#2C414D] leading-relaxed mb-10 max-w-[560px] mx-auto font-medium opacity-0 animate-fade-in-up [animation-delay:400ms]">
              A booking page, client records, session notes, invoicing, and analytics —
              built for freelance psychologists who work solo, with no clinic, no
              staff, and no admin overhead.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4 opacity-0 animate-fade-in-up [animation-delay:600ms]">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#337C7E] text-white text-[16px] font-medium hover:bg-[#276466] transition-all shadow-md"
              >
                Create your free account <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full border-2 border-[#8075C4] text-[#5C45A3] text-[16px] font-medium hover:bg-[#E4D5F6]/20 transition-all bg-transparent"
              >
                Sign In
              </Link>
            </div>
          </main>
        </div>
      </div>
      {/* --- END HERO WRAPPER --- */}

      {/* --- Feature Grid --- */}
      <section className="relative z-20 -mt-8 md:-mt-12 mb-16 max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: Calendar, label: "Your own booking link", desc: "Share one link — clients book straight into your calendar." },
            { icon: ShieldCheck, label: "Private by design", desc: "Your patients, notes, and data are yours alone — never shared." },
            { icon: CreditCard, label: "Invoicing built in", desc: "Track payments, discounts, and bank details per session." },
            { icon: LineChart, label: "Practice analytics", desc: "See retention, revenue, and session trends at a glance." },
          ].map((f, i) => (
            <ScrollReveal key={i} delay={i * 120} animationClass="animate-fade-in-up">
              <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-7 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full transform hover:-translate-y-2 transition-all duration-300">
                <div className="w-11 h-11 rounded-2xl bg-[#337C7E]/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#337C7E]" />
                </div>
                <div className="text-[#1A2B34] font-semibold mb-1.5">{f.label}</div>
                <div className="text-[#656965] text-sm leading-relaxed">{f.desc}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <QuoteRotator />

      {/* --- FAQ Section --- */}
      <section className="py-24 max-w-4xl mx-auto px-6 overflow-hidden">
        <ScrollReveal animationClass="animate-fade-in-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-[#1A2B34] mb-4 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-[#656965] text-lg font-light">
              Everything you need to know before you sign up.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {[
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
          ].map((faq, i) => (
            <ScrollReveal key={i} delay={i * 100} animationClass="animate-slide-in-right">
              <details className="group bg-white rounded-2xl border border-[#EAF9F9] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                <summary className="flex justify-between items-center font-semibold cursor-pointer list-none p-6 md:p-8 text-[#1A2B34] text-lg outline-none">
                  <span>{faq.q}</span>
                  <span className="transition-transform duration-300 group-open:rotate-180 text-[#337C7E] ml-4 shrink-0">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <div className="text-[#656965] group-open:animate-fade-in-up px-6 md:px-8 pb-8 leading-relaxed text-lg">
                  <div className="w-full h-[1px] bg-gradient-to-r from-[#EAF9F9] to-transparent mb-6"></div>
                  {faq.a}
                </div>
              </details>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* --- Footer CTA --- */}
      <footer className="py-24 max-w-4xl mx-auto px-6 text-center overflow-hidden">
        <ScrollReveal animationClass="animate-scale-in">
          <h2 className="text-4xl font-medium text-[#2C302E] mb-6">
            Ready to run your own practice?
          </h2>
          <p className="text-[#656965] text-lg font-light mb-10 max-w-xl mx-auto">
            Set up your booking page in minutes. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full bg-[#2C302E] text-white text-lg font-medium hover:bg-[#1F2220] transition-all shadow-lg shadow-[#2C302E]/20"
          >
            Create your free account
          </Link>
          <p className="mt-16 text-sm text-[#9A9E9A]">
            &copy; {new Date().getFullYear()} Mindesk. All rights reserved.
          </p>
        </ScrollReveal>
      </footer>
    </div>
  );
}

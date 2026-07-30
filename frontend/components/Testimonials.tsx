import { Quote, ExternalLink } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

type Testimonial = {
  name: string;
  title: string;
  photo: string;
  quote: string;
  instagram: string;
  // Same three-tone theme shape as the Solutions showcase and Feature Grid
  // sections (bgFrom/bgTo/border/accentDark/accentBase) — one palette reused
  // everywhere on the page instead of each section picking its own colors.
  bgFrom: string;
  bgTo: string;
  border: string;
  accentDark: string;
  accentBase: string;
};

// Draft copy, written on their behalf — not yet confirmed word-for-word by
// each practitioner. Get a quick sign-off (or edits) from each before
// treating this as final, published testimonial content.
const TESTIMONIALS: Testimonial[] = [
  {
    name: "Dr. Shifa Kaderi",
    title: "Homeopathic Psychiatrist, Habitos Homoeo Speciality",
    photo: "/testimonials/shifa-kaderi.jpg",
    quote:
      "Mindesk cut out the back-and-forth of manual scheduling completely. My clients book straight into my calendar, and I finally have one place for notes, invoices, and follow-ups instead of juggling three apps.",
    instagram: "https://www.instagram.com/dr.shifakaderi",
    bgFrom: "#F5F3FF", bgTo: "#FBFAFF", border: "#E7E0FF", accentDark: "#4B3EC2", accentBase: "#7A6CE6",
  },
  {
    name: "Dr. Henna Gazal",
    title: "Homeopath, Nutritionist & Psychologist, Habitos Care",
    photo: "/testimonials/henna-gazal.jpg",
    quote:
      "Running a clinic means keeping track of more than just my own patients. Mindesk lets my whole team manage their own calendars, and I still see everything in one dashboard. It's the first tool that actually fit how we work.",
    instagram: "https://www.instagram.com/dr_henna_gazal",
    bgFrom: "#FDF0F5", bgTo: "#FFF8FA", border: "#FAD7E4", accentDark: "#A61E56", accentBase: "#EA5790",
  },
  {
    name: "Jasna Jafar",
    title: "Consultant Psychologist — Couple, Individual & Family Therapy",
    photo: "/testimonials/jasna-jafar.jpg",
    quote:
      "I used to manage bookings over DMs and WhatsApp, which got messy fast. With my own Mindesk link, clients pick a slot themselves and I just show up prepared, session notes and all.",
    instagram: "https://www.instagram.com/jasnajafar_psychologist",
    bgFrom: "#EEF2FF", bgTo: "#F8FAFF", border: "#DCE3FF", accentDark: "#2A3FBD", accentBase: "#4F6EF7",
  },
];

export default function Testimonials() {
  return (
    <section className="relative z-20 py-20 md:py-28 max-w-[1200px] mx-auto px-6 md:px-12">
      <div className="text-center mb-14">
        <h2
          className="text-3xl md:text-5xl font-bold text-[#1b2048] mb-4 tracking-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Trusted by practitioners like you
        </h2>
        <p className="text-[#4a5282] text-lg font-light">
          Real practices, run on Mindesk.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <ScrollReveal key={t.name} delay={i * 120} animationClass="animate-fade-in-up">
            <div
              className="group relative h-full flex flex-col p-7 md:p-8 rounded-3xl overflow-hidden transform hover:-translate-y-2 transition-all duration-300 shadow-[0_12px_28px_rgba(80,110,200,0.07)]"
              style={{
                background: `linear-gradient(160deg, ${t.bgFrom} 0%, ${t.bgTo} 100%)`,
                border: `1px solid ${t.border}`,
              }}
            >
              {/* corner glow, appears on hover — same treatment as the Feature Grid cards above */}
              <div
                className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
                style={{ background: t.accentBase }}
              />

              <div className="relative w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-5">
                <Quote className="w-[18px] h-[18px]" style={{ color: t.accentBase }} />
              </div>

              <p className="relative text-[#3a4066] text-[15px] leading-relaxed mb-7 flex-1">
                "{t.quote}"
              </p>

              <div className="relative flex items-center gap-3 pt-5" style={{ borderTop: `1px solid ${t.border}` }}>
                <img
                  src={t.photo}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                  style={{ objectPosition: "50% 15%", border: "1.5px solid #fff", boxShadow: `0 0 0 1.5px ${t.border}` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[#1b2048] font-semibold text-sm truncate">{t.name}</p>
                  <p className="text-[#4a5282]/70 text-[12px] truncate">{t.title}</p>
                </div>
                <a
                  href={t.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t.name} on Instagram`}
                  className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-colors shrink-0"
                  style={{ color: t.accentBase }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

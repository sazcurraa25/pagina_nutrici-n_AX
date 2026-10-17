import { faq, showStories } from "@/lib/content";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Approaches } from "@/components/sections/approaches";
import { Stories } from "@/components/sections/stories";
import { FirstVisit } from "@/components/sections/first-visit";
import { ScheduleSection } from "@/components/sections/schedule";
import { Booking } from "@/components/sections/booking";
import { FaqAccordion } from "@/components/sections/faq";
import { Section } from "@/components/ui/section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Approaches />
      {showStories && <Stories />}
      <FirstVisit />
      <ScheduleSection />
      <Booking />
      <Section id="preguntas" eyebrow="Preguntas frecuentes" title="Lo que suelen preguntarme" alt>
        <div className="max-w-3xl">
          <FaqAccordion items={faq} />
        </div>
      </Section>
    </>
  );
}

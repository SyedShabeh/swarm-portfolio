"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Project = { no: string; name: string; type: string; stack: string; body: string; problem: string; features: string[]; role: string; link: string };

export function ProjectsShowcase({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scope = root.current;
    if (!scope) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".project-showcase-card").forEach((card) => {
        const image = card.querySelector(".project-shot");
        const copy = card.querySelectorAll(".project-copy > *");
        gsap.fromTo(image, { clipPath: "inset(12% 8% 12% 8%)", scale: 1.08 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1.05, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 78%" } });
        gsap.fromTo(copy, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .65, stagger: .09, ease: "power2.out", scrollTrigger: { trigger: card, start: "top 72%" } });
        gsap.to(image, { yPercent: -5, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: .65 } });
      });
    }, scope);
    return () => context.revert();
  }, []);

  return <div ref={root} className="project-showcase">
    {projects.map((project, index) => {
      const targetId = `project-${index + 1}`;
      return <article className={`project-showcase-card showcase-${index}`} key={project.no}>
        <div className="project-shot arrow-card" data-arrow-card data-arrow-target={`${targetId}-visual`} aria-label={`${project.name} screenshot placeholder`}>
          <div className="browser-top"><i /><i /><i /><span>project screenshot required</span></div>
          <div className="missing-shot"><span>{project.no}</span><strong>{project.name}</strong><small>Real interface capture needed</small></div>
        </div>
        <div className="project-copy">
          <div className="project-heading-group arrow-card" data-arrow-card data-arrow-target={`${targetId}-heading`}>
            <p className="kicker">{project.no} / {project.type}</p>
            <h3>{project.name}</h3>
          </div>
          <p className="showcase-body arrow-card" data-arrow-card data-arrow-target={`${targetId}-description`}>{project.body} {project.problem}</p>
          <div className="showcase-info">
            <div className="arrow-card" data-arrow-card data-arrow-target={`${targetId}-capabilities`}><b>Key capabilities</b><ul>{project.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></div>
            <div className="arrow-card" data-arrow-card data-arrow-target={`${targetId}-contribution`}><b>My contribution</b><p>{project.role}</p></div>
          </div>
          <div className="showcase-footer arrow-card" data-arrow-card data-arrow-target={`${targetId}-footer`}>
            <span>{project.stack}</span>
            <a href={project.link} target={project.link.startsWith("http") ? "_blank" : undefined}>View case study <b>↗</b></a>
          </div>
        </div>
      </article>;
    })}
  </div>;
}

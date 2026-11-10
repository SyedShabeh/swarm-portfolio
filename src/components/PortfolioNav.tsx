"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";

const links = [
  ["Home", "top"],
  ["About", "about"],
  ["Experience", "experience"],
  ["Skills", "skills"],
  ["Projects", "work"],
  ["Contact", "contact"],
] as const;

const getSection = (id: string) => {
  const directMatch = document.getElementById(id);
  if (directMatch || id !== "experience") return directMatch;
  const experience = document.querySelector<HTMLElement>(".experience");
  if (experience) experience.id = id;
  return experience;
};

export function PortfolioNav() {
  const [active, setActive] = useState("top");
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sections = links
      .map(([, id]) => getSection(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id || "experience");
      },
      { rootMargin: "-30% 0px -58% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    const onScroll = () => setCompact(window.scrollY > 28);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const goTo = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const section = getSection(id);
    if (!section) return;
    event.preventDefault();
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  };

  return (
    <header className={`site-nav ${compact ? "is-compact" : ""}`} data-navbar-shell>
      <a className="brand" data-nav-logo href="#top" aria-label="Syed Shabeh home" onClick={(event) => goTo(event, "top")}>
        <Image className="brand-logo" src="/images/sshn-logo.png" alt="SSHN" width={960} height={216} priority />
      </a>
      <button className="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <i />
        <i />
      </button>
      <nav className={open ? "is-open" : ""} aria-label="Main navigation">
        {links.map(([label, id], index) => (
          <a key={id} data-nav-link data-nav-index={index} className={active === id ? "active" : ""} style={{ "--i": index } as CSSProperties} href={`#${id}`} onClick={(event) => goTo(event, id)}>
            {label}
          </a>
        ))}
        <a className="nav-talk" data-nav-cta href="#contact" onClick={(event) => goTo(event, "contact")}>
          Let&apos;s talk <b>↗</b>
        </a>
      </nav>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";

const certificates = [
  ["Responsive Web Design", "April 17, 2025", "Foundational training in semantic HTML, CSS, responsive layouts, and accessible web design.", "/certificates/responsive-web-design.png"],
  ["Front End Development Libraries", "April 18, 2025", "Training focused on frontend libraries, interactive interfaces, and component-based development.", "/certificates/frontend-libraries.png"],
  ["JavaScript Algorithms and Data Structures", "April 28, 2025", "Practical JavaScript problem-solving, algorithms, data structures, and programming fundamentals.", "/certificates/javascript-algorithms.png"],
  ["Legacy JavaScript Algorithms and Data Structures", "April 29, 2025", "Additional foundational JavaScript coursework covering programming logic, algorithms, and data manipulation.", "/certificates/legacy-javascript-algorithms.png"],
  ["Data Visualization", "April 29, 2025", "Working with structured datasets and representing information through meaningful visualizations.", "/certificates/data-visualization.png"],
] as const;

export function CertificationGallery() {
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", close);
    document.body.style.overflow = selected === null ? "" : "hidden";
    return () => { window.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [selected]);
  return <><div className="cert-gallery">{certificates.map(([title, date, description, image], index) => <article className={`cert-card cert-${index} arrow-card`} data-arrow-card key={title}><button type="button" onClick={() => setSelected(index)} aria-label={`View ${title} certificate`}><img src={image} alt={`${title} certificate awarded to Syed Shabeh ul Hassan Naqvi`} /></button><div><p>freeCodeCamp · {date}</p><h3>{title}</h3><span>{description}</span><button className="cert-view" type="button" onClick={() => setSelected(index)}>View certificate <b>↗</b></button></div></article>)}</div>{selected !== null && <div className="cert-lightbox" role="dialog" aria-modal="true" aria-label={`${certificates[selected][0]} certificate`} onMouseDown={() => setSelected(null)}><div className="cert-modal" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="cert-close" onClick={() => setSelected(null)} aria-label="Close certificate preview">×</button><img src={certificates[selected][3]} alt={`${certificates[selected][0]} certificate`} /><p>{certificates[selected][0]} · freeCodeCamp · {certificates[selected][1]}</p></div></div>}</>;
}

"use client";

import { useEffect, useRef } from "react";

type State = "MOVING_TO_TARGET" | "DRAWING_SELECTION" | "COMPLETING_SELECTION" | "IDLE" | "CURSOR_FOLLOW";
type EnginePhase = "ORBIT_LOADING" | "SPREADING" | "NAV_CONSTRUCTION" | "CONSTRUCTION";
type TargetStatus = "PENDING" | "RESERVED" | "REVEALING" | "PAUSED" | "COMPLETED";
type SectionState = { id: string; shell: Region; nextContentAt: number };
type Region = { element: HTMLElement; progress: number; eligible: number; completed: boolean; visibleSince: number; status: TargetStatus; owner?: number; isShell: boolean; section?: SectionState; order: number };
type Point = { x: number; y: number; time: number };
type Arrow = { id: number; x: number; y: number; vx: number; vy: number; angle: number; size: number; color: string; state: State; nextAt: number; ox: number; oy: number; cx: number; cy: number; tx: number; ty: number; startedAt: number; duration: number; drawProgress: number; region?: Region; rectangleAlpha: number; followDelay: number; spreadFromX: number; spreadFromY: number; spreadToX: number; spreadToY: number; parkedX: number; parkedY: number; parkedElement?: HTMLElement; parkedOffsetX: number; parkedOffsetY: number };

const registry = new Map<HTMLElement, Region>();
const sections = new Map<HTMLElement, SectionState>();
const colors = ["#fff", "#ff0000", "#b9d5ff", "#ffd76e", "#c8b6ff", "#8fffd1", "#ff9b9b"];
const REVEAL_SPEED_MULTIPLIER = 3;
const scaledDuration = (duration: number) => duration / REVEAL_SPEED_MULTIPLIER;
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const between = (min: number, max: number) => min + Math.random() * (max - min);

function reveal(region: Region, amount: number) {
  region.progress = Math.max(region.progress, clamp(amount));
  if (!region.isShell) region.element.style.setProperty("--reveal-hide", `${((1 - region.progress) * 100).toFixed(2)}%`);
  if (region.progress >= .997) {
    region.progress = 1; region.completed = true; region.status = "COMPLETED"; region.owner = undefined;
    if (!region.isShell) { region.element.classList.add("is-built"); region.element.style.setProperty("--reveal-hide", "0%"); }
  }
}

/** Per-section registrar. Rendering and animation live in one persistent viewport canvas. */
export function ScrollArrowFrame() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const section = marker.current?.parentElement;
    if (!section) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sectionId = section.id || section.className.split(" ")[0] || `section-${sections.size + 1}`;
    const shell: Region = { element: section, progress: reduced ? 1 : 0, eligible: reduced ? 1 : 0, completed: reduced, visibleSince: 0, status: reduced ? "COMPLETED" : "PENDING", isShell: true, order: -1 };
    const sectionState: SectionState = { id: sectionId, shell, nextContentAt: 0 };
    shell.section = sectionState; sections.set(section, sectionState); registry.set(section, shell);
    const augmented = [...section.querySelectorAll<HTMLElement>(".about-copy > p, .contact-copy > .kicker, .contact-copy > h2, .contact-copy > p:not(.kicker), .contact-copy > .contact-button, .expertise-intro > div:last-child > p, .expertise-intro > div:last-child > b")];
    augmented.forEach((element) => element.classList.add("arrow-card", "semantic-arrow-target"));
    const oversized = new Set<HTMLElement>(section.querySelectorAll<HTMLElement>(".about-copy, .contact-copy, .expertise-intro > div:last-child"));
    section.querySelectorAll<HTMLElement>(".project-showcase").forEach((showcase) => {
      const wrapper = showcase.closest<HTMLElement>("[data-arrow-card]");
      if (wrapper && wrapper !== showcase) oversized.add(wrapper);
    });
    const candidates = [...section.querySelectorAll<HTMLElement>("[data-arrow-card], .semantic-arrow-target")].filter((element) => !oversized.has(element));
    const elements = candidates.filter((element) => !candidates.some((parent) => parent !== element && parent.contains(element)));
    elements.forEach((element, index) => {
      element.dataset.arrowTarget ||= `${sectionId}-${index}`;
      const region = registry.get(element) ?? { element, progress: reduced ? 1 : 0, eligible: reduced ? 1 : 0, completed: reduced, visibleSince: 0, status: reduced ? "COMPLETED" : "PENDING", isShell: false, section: sectionState, order: 0 };
      region.order = index;
      registry.set(element, region); element.classList.add("reveal-region");
      if (!reduced && !region.completed) element.classList.remove("is-built");
      element.style.setProperty("--reveal-hide", reduced ? "0%" : `${(1 - region.progress) * 100}%`);
      if (reduced) element.classList.add("is-built");
    });
    return () => {
      registry.delete(section); sections.delete(section);
      elements.forEach((element) => { registry.delete(element); element.classList.remove("reveal-region"); element.classList.add("is-built"); element.style.removeProperty("--reveal-hide"); });
      augmented.forEach((element) => element.classList.remove("semantic-arrow-target"));
    };
  }, []);
  return <span ref={marker} className="arrow-reveal-registrar" aria-hidden="true" />;
}

function drawArrow(ctx: CanvasRenderingContext2D, a: Arrow, alpha = a.state === "IDLE" ? .5 : .96) {
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle); ctx.globalAlpha = alpha; ctx.fillStyle = a.color;
  const s = a.size; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * 1.5); ctx.lineTo(s * .38, s * 1.13); ctx.lineTo(s * .7, s * 1.83); ctx.lineTo(s * 1.05, s * 1.65); ctx.lineTo(s * .72, s); ctx.lineTo(s * 1.28, s); ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawRectangle(ctx: CanvasRenderingContext2D, a: Arrow) {
  if (a.state !== "DRAWING_SELECTION" && a.state !== "COMPLETING_SELECTION") return;
  const x = Math.min(a.ox, a.cx), y = Math.min(a.oy, a.cy), w = Math.abs(a.cx - a.ox), h = Math.abs(a.cy - a.oy);
  ctx.save(); ctx.globalAlpha = a.rectangleAlpha; ctx.fillStyle = "rgba(45,112,255,.16)"; ctx.strokeStyle = "rgba(128,177,255,.92)"; ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x + .5, y + .5, Math.max(0, w - 1), Math.max(0, h - 1)); ctx.restore();
}

function drawGuides(ctx: CanvasRenderingContext2D, a: Arrow) {
  if (a.state === "CURSOR_FOLLOW" || a.x < 0 || a.x > innerWidth || a.y < 0 || a.y > innerHeight) return;
  const alpha = a.state === "DRAWING_SELECTION" ? .28 : a.state === "COMPLETING_SELECTION" ? .2 : a.state === "MOVING_TO_TARGET" ? .14 : .045;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#b9d5e8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(a.x, 0); ctx.lineTo(a.x, a.y);
  ctx.moveTo(0, a.y); ctx.lineTo(a.x, a.y);
  ctx.stroke();
  ctx.restore();
}

const easeInOutCubic = (value: number) => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

function drawProxyBox(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "rgba(45,112,255,.13)"; ctx.strokeStyle = "rgba(128,177,255,.86)"; ctx.lineWidth = 1;
  ctx.fillRect(x, y, width, height); ctx.strokeRect(x + .5, y + .5, Math.max(0, width - 1), Math.max(0, height - 1)); ctx.restore();
}

export function ArrowRevealOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const engineStartedAt = performance.now();
    let dpr = 1, raf = 0, previous = engineStartedAt, dirty = true, cursor = 0, nextGlobalStart = 0;
    let enginePhase: EnginePhase = "ORBIT_LOADING", spreadStartedAt = 0;
    let cursorFollowActive = false;
    let navStartedAt = 0;
    const history: Point[] = [{ x: innerWidth / 2, y: innerHeight / 2, time: engineStartedAt }];
    const arrows: Arrow[] = Array.from({ length: 7 }, (_, id) => ({ id, x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, angle: 0, size: 7.5 + id % 3, color: colors[id], state: "IDLE", nextAt: engineStartedAt + 3000, ox: 0, oy: 0, cx: 0, cy: 0, tx: 0, ty: 0, startedAt: 0, duration: scaledDuration(600), drawProgress: 0, rectangleAlpha: 1, followDelay: 35 + id * 28, spreadFromX: 0, spreadFromY: 0, spreadToX: 0, spreadToY: 0, parkedX: innerWidth / 2, parkedY: innerHeight / 2, parkedOffsetX: 0, parkedOffsetY: 0 }));
    const navbar = document.querySelector<HTMLElement>("[data-navbar-shell]");
    const navLogo = navbar?.querySelector<HTMLElement>("[data-nav-logo]");
    const navLinks = navbar ? [...navbar.querySelectorAll<HTMLElement>("[data-nav-link]")] : [];
    const navCta = navbar?.querySelector<HTMLElement>("[data-nav-cta]");
    const canAnimateNavbar = Boolean(navbar && navLogo && navLinks.length === 6 && navCta && innerWidth > 760 && !reducedMotion);
    const navTaskOrigins = new Map<string, { x: number; y: number }>();
    if (canAnimateNavbar) navbar?.classList.add("nav-constructing");

    const resize = () => { dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr); canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true; };
    const invalidate = () => { dirty = true; };
    const pointerMove = (event: PointerEvent) => { history.push({ x: event.clientX, y: event.clientY, time: performance.now() }); if (history.length > 140) history.shift(); };
    const updateRegions = (now: number) => {
      registry.forEach((r, element) => {
        if (!element.isConnected) { registry.delete(element); return; }
        if (r.completed) return;
        const box = element.getBoundingClientRect(), visible = box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
        if (!visible) { r.visibleSince = 0; return; }
        if (!r.visibleSince) r.visibleSince = now;
        const elementDepthReached = r.isShell ? 1 : clamp((Math.min(innerHeight, box.bottom) - box.top) / Math.max(1, box.height));
        r.eligible = Math.max(r.eligible, elementDepthReached);
        if (r.owner !== undefined && r.progress + .003 >= r.eligible && r.eligible < .997) r.status = "PAUSED";
      }); dirty = false;
    };
    const assign = (a: Arrow, now: number) => {
      if (now < nextGlobalStart) { a.state = "IDLE"; a.nextAt = nextGlobalStart; return; }
      const pending = [...registry.values()].filter((r) => {
        const b = r.element.getBoundingClientRect(), shellReady = r.isShell || (r.section?.shell.completed && now >= (r.section?.nextContentAt ?? 0));
        return !r.completed && r.owner === undefined && r.status === "PENDING" && shellReady && r.progress + .015 < r.eligible && b.bottom > 0 && b.top < innerHeight;
      }).sort((one, two) => Number(two.isShell) - Number(one.isShell) || one.order - two.order);
      if (!pending.length) { a.state = "IDLE"; a.region = undefined; return; }
      const r = pending[(cursor++ + a.id) % pending.length], b = r.element.getBoundingClientRect();
      const reverseX = (a.id + cursor) % 2 === 0;
      const left = r.isShell ? Math.max(0, b.left) : b.left, right = r.isShell ? Math.min(innerWidth, b.right) : b.right;
      const top = r.isShell ? Math.max(0, b.top) : b.top, bottom = r.isShell ? Math.min(innerHeight, b.bottom) : b.bottom;
      a.ox = reverseX ? right : left; a.tx = reverseX ? left : right;
      a.oy = top; a.ty = bottom; a.cx = a.ox; a.cy = a.oy;
      a.region = r; a.drawProgress = r.progress;
      const baseDuration = r.isShell ? clamp(520 + b.width * .08, 520, 900) : clamp(360 + Math.hypot(b.width, b.height) * .42, 430, 1150);
      a.duration = scaledDuration(baseDuration);
      a.rectangleAlpha = 1; a.state = "MOVING_TO_TARGET"; a.nextAt = now + scaledDuration(between(80, 250));
      r.owner = a.id; r.status = "RESERVED";
      if (!r.isShell && r.section) r.section.nextContentAt = now + scaledDuration(between(500, 800));
      const scaledStartGap = scaledDuration(r.isShell ? between(160, 280) : between(210, 360));
      nextGlobalStart = now + Math.max(scaledStartGap, between(120, 150));
    };
    const releaseTarget = (a: Arrow, now: number) => {
      const region = a.region;
      if (region && !region.completed) {
        region.owner = undefined;
        region.status = "PENDING";
      }
      a.region = undefined;
      a.state = "IDLE";
      a.rectangleAlpha = 0;
      a.parkedX = a.x; a.parkedY = a.y;
      a.parkedElement = undefined;
      a.nextAt = now + scaledDuration(between(80, 250));
      if (a.x < -20 || a.x > innerWidth + 20 || a.y < -20 || a.y > innerHeight + 20) {
        a.x = clamp(a.x, 12, innerWidth - 20); a.y = clamp(a.y, 12, innerHeight - 24);
        a.vx = 0; a.vy = 0;
      }
    };
    const releaseNavbarCursor = (a: Arrow, now: number) => {
      if (a.region && !a.region.completed) {
        a.region.owner = undefined;
        a.region.status = "PENDING";
      }
      a.region = undefined;
      a.state = "IDLE";
      a.rectangleAlpha = 0;
      a.drawProgress = 0;
      a.parkedX = a.x;
      a.parkedY = a.y;
      a.parkedElement = undefined;
      a.vx = 0;
      a.vy = 0;
      a.nextAt = now + a.id * 18;
    };
    const renderNavbarConstruction = (now: number) => {
      if (!navbar || !navLogo || navLinks.length !== 6 || !navCta || innerWidth <= 760) {
        navbar?.classList.remove("nav-constructing");
        arrows.forEach((arrow) => releaseNavbarCursor(arrow, now));
        navTaskOrigins.clear();
        nextGlobalStart = now;
        enginePhase = "CONSTRUCTION";
        return false;
      }
      const elapsed = now - navStartedAt;
      const activeArrows = new Set<number>();
      const proxyDraws: Array<() => void> = [];
      const selectionDraws: Array<() => void> = [];
      const placeArrow = (arrow: Arrow, x: number, y: number) => {
        const oldX = arrow.x, oldY = arrow.y;
        arrow.x = x; arrow.y = y; arrow.vx = x - oldX; arrow.vy = y - oldY; arrow.angle = 0; arrow.state = "DRAWING_SELECTION";
        activeArrows.add(arrow.id);
      };
      const selectElement = (key: string, element: HTMLElement, arrow: Arrow, start: number, end: number, builtClass = true) => {
        const box = element.getBoundingClientRect();
        if (elapsed < start) return;
        const progress = clamp((elapsed - start) / Math.max(1, end - start));
        if (progress >= 1) {
          if (builtClass) element.classList.add("nav-item-built");
          arrow.state = "IDLE"; arrow.parkedX = box.right; arrow.parkedY = box.bottom;
          return;
        }
        if (!navTaskOrigins.has(key)) navTaskOrigins.set(key, { x: arrow.x, y: arrow.y });
        const origin = navTaskOrigins.get(key)!;
        const approachProgress = clamp(progress / .28);
        if (approachProgress < 1) {
          const easedApproach = easeInOutCubic(approachProgress);
          placeArrow(arrow, origin.x + (box.left - origin.x) * easedApproach, origin.y + (box.top - origin.y) * easedApproach);
          return;
        }
        const selectionProgress = easeInOutCubic(clamp((progress - .28) / .72));
        placeArrow(arrow, box.left + box.width * selectionProgress, box.top + box.height * selectionProgress);
        selectionDraws.push(() => drawProxyBox(ctx, box.left, box.top, box.width * selectionProgress, box.height * selectionProgress));
      };

      const shellBox = navbar.getBoundingClientRect();
      if (elapsed < 270) {
        const progress = easeInOutCubic(clamp(elapsed / 270));
        placeArrow(arrows[0], shellBox.left + shellBox.width * progress, shellBox.top + shellBox.height * progress);
        selectionDraws.push(() => drawProxyBox(ctx, shellBox.left, shellBox.top, shellBox.width * progress, shellBox.height * progress));
      } else navbar.classList.add("nav-shell-built");

      selectElement("logo", navLogo, arrows[1], 300, 480);
      const home = navLinks[0];
      selectElement("home", home, arrows[2], 510, 720);

      const homeBox = home.getBoundingClientRect();
      navLinks.slice(1).forEach((link, duplicateIndex) => {
        const start = 900 + duplicateIndex * 170, duration = 390, end = start + duration;
        if (elapsed < start) return;
        const arrow = arrows[(duplicateIndex + 3) % arrows.length];
        const destination = link.getBoundingClientRect();
        if (elapsed >= end) {
          link.classList.add("nav-item-built"); arrow.state = "IDLE"; arrow.parkedX = destination.right; arrow.parkedY = destination.bottom;
          return;
        }
        const progress = clamp((elapsed - start) / duration);
        const taskKey = `duplicate-${duplicateIndex}`;
        if (!navTaskOrigins.has(taskKey)) navTaskOrigins.set(taskKey, { x: arrow.x, y: arrow.y });
        const origin = navTaskOrigins.get(taskKey)!;
        const startX = homeBox.left, startY = homeBox.top;
        const endX = destination.left, endY = destination.top;
        const controlX = (startX + endX) / 2, controlY = Math.min(startY, endY) - 28 - duplicateIndex * 3;
        const approachProgress = clamp(progress / .2), dragProgress = easeInOutCubic(clamp((progress - .2) / .8));
        if (approachProgress < 1) {
          const approach = easeInOutCubic(approachProgress);
          placeArrow(arrow, origin.x + (homeBox.right - origin.x) * approach, origin.y + (homeBox.bottom - origin.y) * approach);
          selectionDraws.push(() => drawProxyBox(ctx, homeBox.left, homeBox.top, homeBox.width, homeBox.height, .65));
          return;
        }
        const inverse = 1 - dragProgress;
        const proxyX = inverse * inverse * startX + 2 * inverse * dragProgress * controlX + dragProgress * dragProgress * endX;
        const proxyY = inverse * inverse * startY + 2 * inverse * dragProgress * controlY + dragProgress * dragProgress * endY;
        placeArrow(arrow, proxyX + homeBox.width, proxyY + homeBox.height);
        const label = link.textContent?.trim() || "";
        const replaceProgress = clamp((progress - .72) / .28);
        const proxyLabel = replaceProgress <= 0 ? "Home" : label.slice(0, Math.max(1, Math.ceil(label.length * replaceProgress)));
        const style = getComputedStyle(home);
        proxyDraws.push(() => {
          drawProxyBox(ctx, proxyX, proxyY, Math.max(homeBox.width, destination.width), Math.max(homeBox.height, destination.height), .9);
          ctx.save(); ctx.font = style.font; ctx.fillStyle = style.color; ctx.textBaseline = "middle"; ctx.fillText(proxyLabel, proxyX, proxyY + Math.max(homeBox.height, destination.height) / 2); ctx.restore();
        });
      });

      const duplicateEnd = 900 + 4 * 170 + 390;
      selectElement("cta", navCta, arrows[1], duplicateEnd + 100, duplicateEnd + 330);
      const finishedAt = duplicateEnd + 360;
      arrows.forEach((arrow) => { if (!activeArrows.has(arrow.id) && arrow.state !== "IDLE") arrow.state = "IDLE"; });
      arrows.forEach((arrow) => drawGuides(ctx, arrow));
      selectionDraws.forEach((draw) => draw());
      proxyDraws.forEach((draw) => draw());
      arrows.forEach((arrow) => drawArrow(ctx, arrow));
      canvas.dataset.revealMode = "NAV_CONSTRUCTION";
      if (elapsed < finishedAt) return true;
      navLogo.classList.add("nav-item-built"); navLinks.forEach((link) => link.classList.add("nav-item-built")); navCta.classList.add("nav-item-built");
      navbar.classList.remove("nav-constructing");
      arrows.forEach((arrow) => releaseNavbarCursor(arrow, now));
      navTaskOrigins.clear();
      enginePhase = "CONSTRUCTION"; nextGlobalStart = now;
      return false;
    };
    const tick = (now: number) => {
      const dt = Math.min(34, now - previous || 16.7); previous = now; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (dirty || Math.floor(now / 140) !== Math.floor((now - dt) / 140)) updateRegions(now);
      if (enginePhase === "ORBIT_LOADING") {
        const orbitTime = reducedMotion ? 0 : (now - engineStartedAt) * .00285;
        const radius = clamp(Math.min(innerWidth, innerHeight) * .105, 70, 90);
        arrows.forEach((a) => {
          const angle = orbitTime + a.id / arrows.length * Math.PI * 2;
          const oldX = a.x, oldY = a.y;
          a.x = innerWidth / 2 + Math.cos(angle) * radius; a.y = innerHeight / 2 + Math.sin(angle) * radius;
          a.vx = a.x - oldX; a.vy = a.y - oldY; a.angle = 0;
        });
        canvas.dataset.revealMode = "ORBIT_LOADING";
        arrows.forEach((a) => drawArrow(ctx, a, .96));
        if (now - engineStartedAt < 3000) { raf = requestAnimationFrame(tick); return; }

        enginePhase = "SPREADING"; spreadStartedAt = now; nextGlobalStart = 0;
        if (!canAnimateNavbar) assign(arrows[0], now);
        nextGlobalStart = now + 650;
        arrows.forEach((a) => {
          a.spreadFromX = a.x; a.spreadFromY = a.y;
          if (a.region) { a.spreadToX = a.ox; a.spreadToY = a.oy; a.nextAt = now + 650; }
          else {
            const column = a.id % 3, row = Math.floor(a.id / 3), navbarBox = navbar?.getBoundingClientRect();
            a.spreadToX = canAnimateNavbar && a.id === 0 && navbarBox ? navbarBox.left + 12 : innerWidth * (.2 + column * .3);
            a.spreadToY = canAnimateNavbar && a.id === 0 && navbarBox ? navbarBox.top + 12 : innerHeight * (.2 + row * .3);
            a.state = "IDLE"; a.nextAt = now + 650 + a.id * 25;
          }
          a.parkedX = a.spreadToX; a.parkedY = a.spreadToY;
          a.parkedElement = undefined;
        });
      }
      if (enginePhase === "SPREADING") {
        arrows.forEach((a) => {
          const delay = a.id * 24, duration = 350 + a.id * 38;
          const progress = reducedMotion ? 1 : clamp((now - spreadStartedAt - delay) / duration);
          const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
          const oldX = a.x, oldY = a.y;
          a.x = a.spreadFromX + (a.spreadToX - a.spreadFromX) * eased;
          a.y = a.spreadFromY + (a.spreadToY - a.spreadFromY) * eased;
          a.vx = a.x - oldX; a.vy = a.y - oldY; a.angle = 0;
        });
        canvas.dataset.revealMode = "SPREADING";
        arrows.forEach((a) => drawArrow(ctx, a, .96));
        if (!reducedMotion && now - spreadStartedAt < 650) { raf = requestAnimationFrame(tick); return; }
        enginePhase = canAnimateNavbar ? "NAV_CONSTRUCTION" : "CONSTRUCTION";
        if (enginePhase === "NAV_CONSTRUCTION") navStartedAt = now;
        if (reducedMotion) registry.forEach((region) => reveal(region, 1));
      }
      if (enginePhase === "NAV_CONSTRUCTION") {
        const navbarStillActive = renderNavbarConstruction(now);
        if (navbarStillActive) {
          raf = requestAnimationFrame(tick);
          return;
        }
      }
      const registered = [...registry.values()];
      arrows.forEach((a) => {
        if (!a.region || a.region.completed || a.state === "COMPLETING_SELECTION") return;
        const element = a.region.element;
        if (!element.isConnected) { registry.delete(element); releaseTarget(a, now); return; }
        const box = element.getBoundingClientRect();
        const visible = box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
        if (!visible && (a.state === "MOVING_TO_TARGET" || a.state === "DRAWING_SELECTION")) releaseTarget(a, now);
      });
      const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 12;
      const visibleUnfinished = registered.filter((region) => {
        if (region.completed || !region.element.isConnected) return false;
        const box = region.element.getBoundingClientRect();
        return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth && region.progress + .003 < region.eligible;
      });
      const activeConstruction = arrows.some((a) => a.region && !a.region.completed && (a.state === "MOVING_TO_TARGET" || a.state === "DRAWING_SELECTION" || a.state === "COMPLETING_SELECTION"));
      const complete = registered.length > 0 && registered.every((r) => r.completed);
      if ((complete || (atBottom && visibleUnfinished.length === 0)) && !activeConstruction) cursorFollowActive = true;
      if (cursorFollowActive && visibleUnfinished.length > 0) {
        cursorFollowActive = false;
        arrows.forEach((a) => { if (a.state === "CURSOR_FOLLOW") { a.state = "IDLE"; a.parkedX = a.x; a.parkedY = a.y; a.parkedElement = undefined; a.nextAt = now + a.id * 22; } });
      }
      arrows.forEach((a) => {
        if (cursorFollowActive && a.state !== "DRAWING_SELECTION" && a.state !== "COMPLETING_SELECTION") { a.region = undefined; a.state = "CURSOR_FOLLOW"; }
        if (a.state === "IDLE" && now >= a.nextAt) assign(a, now);
        if (a.region && !a.region.completed) {
          const box = a.region.element.getBoundingClientRect(), reverseX = a.ox > a.tx;
          const left = a.region.isShell ? Math.max(0, box.left) : box.left, right = a.region.isShell ? Math.min(innerWidth, box.right) : box.right;
          const top = a.region.isShell ? Math.max(0, box.top) : box.top, bottom = a.region.isShell ? Math.min(innerHeight, box.bottom) : box.bottom;
          a.ox = reverseX ? right : left; a.tx = reverseX ? left : right;
          a.oy = top; a.ty = bottom;
        }
        let tx = a.x, ty = a.y, stiffness = .09, damping = .76;
        if (a.state === "MOVING_TO_TARGET") { tx = a.ox; ty = a.oy; if (now >= a.nextAt && Math.hypot(tx - a.x, ty - a.y) < 13) { a.state = "DRAWING_SELECTION"; a.startedAt = now; } }
        else if (a.state === "DRAWING_SELECTION") {
          if (!a.region || a.region.completed) { a.state = "COMPLETING_SELECTION"; a.startedAt = now; }
          else {
            const allowed = a.region.eligible;
            if (a.drawProgress + .002 < allowed) {
              a.region.status = "REVEALING";
              a.drawProgress = Math.min(allowed, a.drawProgress + dt / a.duration);
              const hiddenSide = `${((1 - a.drawProgress) * 100).toFixed(2)}%`;
              a.region.element.style.setProperty("--reveal-left", a.ox > a.tx ? hiddenSide : "0%");
              a.region.element.style.setProperty("--reveal-right", a.ox > a.tx ? "0%" : hiddenSide);
              reveal(a.region, a.drawProgress);
            } else if (allowed < .997) a.region.status = "PAUSED";
            a.cx = a.ox + (a.tx - a.ox) * a.drawProgress;
            a.cy = a.oy + (a.ty - a.oy) * a.drawProgress;
            tx = a.cx; ty = a.cy; stiffness = .18; damping = .7;
            if (a.drawProgress >= .997) {
              const completedRegion = a.region;
              reveal(completedRegion, 1);
              completedRegion.element.style.setProperty("--reveal-left", "0%"); completedRegion.element.style.setProperty("--reveal-right", "0%");
              if (completedRegion.isShell && completedRegion.section) completedRegion.section.nextContentAt = now + scaledDuration(between(300, 500));
              a.state = "COMPLETING_SELECTION"; a.startedAt = now;
            }
          }
        }
        else if (a.state === "COMPLETING_SELECTION") { const completionDuration = scaledDuration(170); tx = a.tx; ty = a.ty; a.rectangleAlpha = 1 - clamp((now - a.startedAt) / completionDuration); if (now - a.startedAt >= completionDuration) { const parkedElement = a.region?.element; a.state = "IDLE"; a.parkedX = a.x; a.parkedY = a.y; a.parkedElement = parkedElement?.isConnected ? parkedElement : undefined; if (a.parkedElement) { const parkedBox = a.parkedElement.getBoundingClientRect(); a.parkedOffsetX = a.x - parkedBox.left; a.parkedOffsetY = a.y - parkedBox.top; } a.nextAt = now + scaledDuration(between(80, 250)); a.region = undefined; } }
        else if (a.state === "CURSOR_FOLLOW") { const targetTime = now - a.followDelay; let p: Point | undefined = history[0]; for (let i = history.length - 1; i >= 0; i--) if (history[i].time <= targetTime) { p = history[i]; break; } p ||= history.at(-1); if (p) { const ring = 10 + a.id * 4, orbit = now * .0012 + a.id * .9; tx = p.x + Math.cos(orbit) * ring; ty = p.y + Math.sin(orbit) * ring * .65; } stiffness = .075; damping = .78; }
        else { if (a.parkedElement?.isConnected) { const parkedBox = a.parkedElement.getBoundingClientRect(); a.parkedX = parkedBox.left + a.parkedOffsetX; a.parkedY = parkedBox.top + a.parkedOffsetY; } else a.parkedElement = undefined; tx = a.parkedX; ty = a.parkedY; stiffness = .055; damping = .72; }
        if (a.state === "MOVING_TO_TARGET" || a.state === "DRAWING_SELECTION" || a.state === "COMPLETING_SELECTION") {
          const travelTime = scaledDuration(a.state === "MOVING_TO_TARGET" ? 160 : 80);
          const response = 1 - Math.exp(-dt / Math.max(1, travelTime));
          const oldX = a.x, oldY = a.y;
          a.x += (tx - a.x) * response; a.y += (ty - a.y) * response;
          a.vx = a.x - oldX; a.vy = a.y - oldY;
        } else {
          a.vx += (tx - a.x) * stiffness * dt / 16.7; a.vy += (ty - a.y) * stiffness * dt / 16.7; a.vx *= damping; a.vy *= damping; a.x += a.vx * dt / 16.7; a.y += a.vy * dt / 16.7;
        }
        a.angle = 0;
      });
      arrows.forEach((a) => drawGuides(ctx, a));
      arrows.forEach((a) => drawRectangle(ctx, a));
      arrows.forEach((a) => drawArrow(ctx, a));
      canvas.dataset.revealMode = cursorFollowActive ? "CURSOR_FOLLOW" : "CONSTRUCTING"; raf = requestAnimationFrame(tick);
    };
    resize(); addEventListener("resize", resize, { passive: true }); addEventListener("scroll", invalidate, { passive: true }); addEventListener("pointermove", pointerMove, { passive: true }); raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); removeEventListener("scroll", invalidate); removeEventListener("pointermove", pointerMove); navbar?.classList.remove("nav-constructing", "nav-shell-built"); registry.forEach((r) => reveal(r, 1)); };
  }, []);
  return <canvas ref={canvasRef} className="global-arrow-reveal" aria-hidden="true" />;
}

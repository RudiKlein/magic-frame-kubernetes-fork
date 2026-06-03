"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BUNDLED_WALLPAPERS } from "@/lib/wallpaper-engine/bundled";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface WallpaperData {
  id: string;
  url: string;
  metadata?: {
    cameraModel?: string;
    locationName?: string;
    dateTaken?: string;
  };
}

type TransitionKind = "crossfade" | "kenburns" | "slide" | "none";

function resolveTransition(config: any): TransitionKind {
  const t = config?.transitionEffect;
  if (t === "crossfade" || t === "kenburns" || t === "slide" || t === "none") return t;
  if (config?.zoomEffect) return "kenburns"; // backward-compat
  return "crossfade";
}

// object-fit-Modus fürs Wallpaper (issue #17). Default `cover` = bisheriges
// Verhalten (füllt den Screen, schneidet Ränder ab). Die anderen Modi geben
// Nutzern Kontrolle, damit z.B. keine Köpfe abgeschnitten werden.
const WALLPAPER_FIT: Record<string, string> = {
  cover: "object-cover", // Fill
  contain: "object-contain", // Fit — ganzes Bild, ggf. Balken
  fill: "object-fill", // Stretch — verzerrt
  none: "object-none object-center", // Center — Originalgröße, zentriert
};

export default function WallpaperEngine({
  config,
  dashboardId = "1"
}: {
  config?: any;
  dashboardId?: string;
}) {
  const { locale, t } = useLocale();
  const [images, setImages] = useState<WallpaperData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for a real config from the parent. Live-View starts with
    // wallpaperConfig=null and fetches the saved config async — during
    // that ~200 ms window we used to fall through to the "unsplash"
    // branch and render a fresh Pollinations request. On a reload that
    // flashed a random / cached generic image before the actual wallpaper
    // (Immich / WebDAV / bundled) took over. Black-on-mount is much
    // calmer, and the real wallpaper still appears as soon as it lands.
    if (!config) {
      setIsReady(false);
      setImages([]);
      return;
    }

    const source = config?.source || 'unsplash';
    const query = config?.query || 'nature,dark';

    if (source === 'url') {
      setImages([{ id: 'fixed', url: query }]);
      setIsReady(true);
    } else if (source === 'bundled') {
      // Mitgelieferte Bilder aus public/wallpapers/ — gemischt für Abwechslung.
      const list = BUNDLED_WALLPAPERS.map((url, i) => ({ id: `bundled-${i}`, url }));
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      setImages(list);
      setIsReady(true);
    } else if (source === 'webdav') {
      fetch(`/api/wallpaper/webdav/playlist?dashboardId=${dashboardId}&lang=${locale}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data) && data.length > 0) setImages(data);
           setIsReady(true);
        })
        .catch(err => {
           console.error("Failed to load generic WebDAV playlist", err);
           setIsReady(true);
        });
    } else if (source === 'immich') {
      fetch(`/api/wallpaper/immich/playlist?dashboardId=${dashboardId}&lang=${locale}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data) && data.length > 0) setImages(data);
           setIsReady(true);
        })
        .catch(err => {
           console.error("Failed to load Immich playlist", err);
           setIsReady(true);
        });
    } else {
      const generated = Array.from({ length: 20 }).map((_, i) => ({
        id: `unsplash-${i}-${Date.now()}`,
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(query + ' cinematic 4k high resolution realistic photography')}?width=3840&height=2160&seed=${i + Math.floor(Math.random() * 9999999)}&nologo=true`,
        metadata: config?.showMetadata ? { locationName: `${t("Thema")}: ${query}` } : undefined
      }));
      setImages(generated);
      setIsReady(true);
    }
  }, [config, locale]);

  useEffect(() => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev >= images.length ? 0 : prev));
  }, [images.length]);

  const intervalMs = (config?.intervalSec || 60) * 1000;
  const transition = resolveTransition(config);
  const fitClass = WALLPAPER_FIT[config?.fit as string] ?? "object-cover";

  useEffect(() => {
    if (!isReady || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isReady, images.length, intervalMs]);

  // Preload über Image()-Instanzen statt DOM-<img>. Browser-Cache reicht.
  useEffect(() => {
    if (images.length === 0) return;
    const urls = Array.from(new Set([
      images[(currentIndex + 1) % images.length]?.url,
      images[(currentIndex + 2) % images.length]?.url,
    ].filter(Boolean))) as string[];
    const loaders = urls.map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });
    return () => { for (const img of loaders) img.src = ""; };
  }, [currentIndex, images]);

  if (images.length === 0) return <div className="absolute inset-0 bg-black z-0" />;

  const currentImage = images[currentIndex];

  return (
    <div className="absolute inset-0 overflow-hidden bg-black z-0">
      {transition === "kenburns" ? (
        <KenBurnsSlot image={currentImage} intervalMs={intervalMs} fitClass={fitClass} />
      ) : transition === "none" ? (
        <img
          src={currentImage.url}
          alt=""
          className={`absolute inset-0 w-full h-full ${fitClass}`}
          decoding="async"
        />
      ) : (
        <TwoSlotTransition image={currentImage} mode={transition} fitClass={fitClass} />
      )}

      {/* Overlays */}
      {config?.overlayVignette && config.overlayVignette > 0 ? (
         <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: `inset 0 0 300px rgba(0,0,0,${config.overlayVignette / 100})` }}
         ></div>
      ) : null}

      {config?.overlayBlur && config.overlayBlur > 0 ? (
         <div
            className="absolute inset-0 pointer-events-none"
            style={{ backdropFilter: `blur(${config.overlayBlur}px)`, WebkitBackdropFilter: `blur(${config.overlayBlur}px)` }}
         ></div>
      ) : null}

      <div
         className="absolute top-0 inset-x-0 h-[50vh] pointer-events-none"
         style={{
            opacity: (config?.gradientTop ?? 30) / 100,
            background: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)"
         }}
      ></div>

      <div
         className="absolute bottom-0 inset-x-0 h-[60vh] pointer-events-none"
         style={{
            opacity: (config?.gradientBottom ?? 80) / 100,
            background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)"
         }}
      ></div>

      {(() => {
         // Bar zeigt sich wenn mindestens eine Seite (Ring ODER Metadata)
         // tatsächlich gerendert würde. Sind beide leer, fällt sie weg.
         // Die jeweils leere Seite bleibt als Platzhalter-Div drin, damit
         // justify-between (links/rechts) stabil bleibt.
         const showRing =
            images.length > 1 && intervalMs > 0 && config?.showTimer !== false;
         const showMeta =
            config?.showMetadata !== false &&
            !!currentImage.metadata &&
            Object.keys(currentImage.metadata).length > 0;
         if (!showRing && !showMeta) return null;
         return (
            <div
               className={`absolute bottom-0 inset-x-0 z-10 flex flex-row items-center justify-between px-6 py-3 ${(config?.metaBgOpacity ?? 40) > 0 ? "backdrop-blur-md border-t border-white/5" : ""}`}
               style={{ backgroundColor: `rgba(0,0,0,${(config?.metaBgOpacity ?? 40) / 100})` }}
            >
              <div className="flex items-center">
                 {showRing ? (
                    <ProgressRing key={currentImage.id} durationMs={intervalMs} />
                 ) : <div />}
              </div>
              <div className="flex flex-col items-end text-right">
                 {showMeta && currentImage.metadata && (
                   <div
                      className="flex flex-col items-end uppercase tracking-[0.15em]"
                      style={{
                         fontFamily: `${config?.metaFontFamily || 'Inter'}, sans-serif`,
                         fontSize: config?.metaFontSize ? `${config.metaFontSize}px` : '12px',
                         fontWeight: config?.metaFontWeight || 500,
                         textShadow: config?.metaTextShadow || 'none',
                         color: config?.metaColor || 'rgba(255,255,255,0.8)'
                      }}
                   >
                      {config?.metaShowDate !== false && currentImage.metadata.dateTaken && <span>{currentImage.metadata.dateTaken}</span>}
                      {config?.metaShowLocation !== false && currentImage.metadata.locationName && <span>{currentImage.metadata.locationName}</span>}
                      {config?.metaShowCamera !== false && currentImage.metadata.cameraModel && <span>{`${t("Aufgenommen mit")} ${currentImage.metadata.cameraModel}`}</span>}
                   </div>
                 )}
              </div>
           </div>
         );
      })()}
    </div>
  );
}

// Ken-Burns (langsamer Zoom + Opacity-Crossfade) — via Framer-Motion weil
// die Scale-Animation über viele Sekunden läuft und Exit-Animation braucht.
function KenBurnsSlot({ image, intervalMs, fitClass }: { image: WallpaperData; intervalMs: number; fitClass: string }) {
  return (
    <AnimatePresence initial={false}>
      <motion.img
        key={image.id}
        src={image.url}
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: 1, scale: 1.15 }}
        exit={{ opacity: 0, scale: 1.2 }}
        transition={{
          opacity: { duration: 1.5, ease: "easeInOut" },
          scale: { duration: Math.min(intervalMs / 1000 + 1.5, 30), ease: "linear" },
        }}
        className={`absolute inset-0 w-full h-full ${fitClass}`}
        decoding="async"
      />
    </AnimatePresence>
  );
}

// Zwei-Slot-Ping-Pong, ohne Framer-Motion. Two fixed <img> elements that
// never unmount — only the active slot changes. Cheap on Tizen / Smart-TV
// browsers because nothing gets created or destroyed mid-transition; the
// browser only animates opacity (or transform) between two stable layers.
//
// Both slots are mounted from the start so neither has a "first paint"
// during a transition (which Tizen renders as a hard cut). slotB initially
// shows the same image as slotA so the very first crossfade still has
// something to fade from.
function TwoSlotTransition({ image, mode, fitClass }: { image: WallpaperData; mode: "crossfade" | "slide"; fitClass: string }) {
  const [slotA, setSlotA] = useState<WallpaperData>(image);
  const [slotB, setSlotB] = useState<WallpaperData>(image);
  const [active, setActive] = useState<"A" | "B">("A");
  const prevIdRef = useRef<string>(image.id);

  useEffect(() => {
    if (image.id === prevIdRef.current) return;
    prevIdRef.current = image.id;

    // Wait until the new image is actually decoded before triggering the
    // transition. Without this, slow-loading wallpapers (Pollinations
    // generation, large Immich originals) caused the "sometimes smooth,
    // sometimes hard cut" pattern: a cached image faded nicely, an
    // uncached one snapped because the <img> still had no pixels when
    // opacity hit 1. Solved by preloading via a detached Image() — the
    // browser caches the decode, then the in-DOM <img> picks it up
    // instantly from the cache and the transition runs on a ready frame.
    const preloader = new Image();
    let cancelled = false;

    const swap = () => {
      if (cancelled) return;
      // Load into the inactive slot, two rAFs to give the browser one
      // paint cycle with the start state before we trigger the transition.
      if (active === "A") {
        setSlotB(image);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) setActive("B");
          });
        });
      } else {
        setSlotA(image);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) setActive("A");
          });
        });
      }
    };

    preloader.onload = swap;
    // Network error or 404 — still swap so the playlist doesn't get stuck.
    preloader.onerror = swap;
    preloader.src = image.url;

    // Hard safety net: if neither onload nor onerror fires within 4 s
    // (some Smart-TV browsers go silent on huge images), force the swap
    // anyway — better a hard cut than a frozen wallpaper.
    const failsafe = setTimeout(swap, 4000);

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      preloader.onload = null;
      preloader.onerror = null;
      preloader.src = "";
    };
  }, [image.id, active, image]);

  const slotStyle = (slotName: "A" | "B"): React.CSSProperties => {
    const isActive = slotName === active;
    if (mode === "crossfade") {
      return {
        opacity: isActive ? 1 : 0,
        transition: "opacity 1500ms ease-in-out",
        // Force GPU compositing on Tizen / older Chromium forks. Without
        // an explicit transform the browser composites opacity on the CPU,
        // which on a Samsung TV browser shows up as a hard jump instead of
        // a smooth fade for large 4K wallpapers. translate3d(0,0,0) (a.k.a.
        // the "translateZ hack") promotes each slot to its own GPU layer.
        // Both prefixed and unprefixed for older webkit-derived browsers.
        transform: "translate3d(0,0,0)",
        WebkitTransform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        willChange: "opacity, transform",
      };
    }
    // slide: aktiv → 0, inaktiv → +100% (wartet rechts auf seinen Einsatz).
    // Während des Wechsels läuft es linear von +100% nach 0 bzw. 0 nach -100%.
    return {
      transform: isActive ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
      WebkitTransform: isActive ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
      transition: "transform 1200ms cubic-bezier(0.77, 0, 0.175, 1)",
      backfaceVisibility: "hidden",
      WebkitBackfaceVisibility: "hidden",
      willChange: "transform",
    };
  };

  return (
    <>
      <img
        src={slotA.url}
        alt=""
        className={`absolute inset-0 w-full h-full ${fitClass}`}
        style={slotStyle("A")}
        decoding="async"
      />
      <img
        src={slotB.url}
        alt=""
        className={`absolute inset-0 w-full h-full ${fitClass}`}
        style={slotStyle("B")}
        decoding="async"
      />
    </>
  );
}

function ProgressRing({ durationMs }: { durationMs: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const circumference = 2 * Math.PI * 40;
  return (
    <div className="w-3.5 h-3.5 drop-shadow-md">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" className="stroke-white/30" strokeWidth="16" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="40"
          className="stroke-white"
          strokeWidth="16"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: ready ? circumference : 0,
            transition: `stroke-dashoffset ${durationMs}ms linear`,
          }}
        />
      </svg>
    </div>
  );
}

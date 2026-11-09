"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./promo.module.css";

const scenes = [
  { kicker: "RESEARCH WORKFLOW", title: "See the signal\nbehind the scan.", body: "Thermoeye turns OCTA imagery into a clear, reviewable research workflow.", image: "/research/pipeline/real-octa-original.jpg", accent: "blue" },
  { kicker: "01 / INTAKE", title: "Start with\na clean case.", body: "Create a case, capture the scan context, and bring the image into one focused workspace.", image: "/research/pipeline/real-octa-original.jpg", accent: "violet" },
  { kicker: "02 / ANALYZE", title: "Reveal the\nvessel map.", body: "A connected segmentation engine separates the vessel pattern from the OCTA image.", image: "/research/pipeline/real-octa-segmentation.jpg", accent: "cyan" },
  { kicker: "03 / MEASURE", title: "Make the image\nreviewable.", body: "Research metrics, image quality, provenance, and model status stay together on one screen.", image: "/research/pipeline/real-octa-density.jpg", accent: "green" },
  { kicker: "04 / REVIEW", title: "Keep the\nhuman in the loop.", body: "A reviewer can inspect the evidence, record a decision, and release a research report when the gates are met.", image: "/research/pipeline/real-octa-segmentation.jpg", accent: "amber" },
];

export default function PromoPage() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const current = scenes[scene];

  useEffect(() => {
    if (!playing) return;
    const started = Date.now();
    const duration = 7200;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const next = Math.min(elapsed / duration, 1);
      setProgress(next);
      if (next >= 1) {
        setScene((value) => (value + 1) % scenes.length);
        setProgress(0);
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [playing, scene]);

  const sceneLabel = useMemo(() => `${String(scene + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`, [scene]);

  function jumpTo(index: number) {
    setScene(index);
    setProgress(0);
    setPlaying(true);
  }

  return (
    <main className={`${styles.shell} ${styles[current.accent]}`}>
      <div className={styles.ambient} aria-hidden="true" />
      <nav className={styles.nav} aria-label="Promo navigation">
        <div className={styles.wordmark}>
          <img src="/thermoeye-logo-logoremovebg.png" alt="Eyezheimer" />
          <span>THERMOEYE / RESEARCH CONSOLE</span>
        </div>
        <div className={styles.navMeta}>
          <span>OCTA ANALYSIS</span>
          <span className={styles.liveDot}>●</span>
          <span>DEMO PREVIEW</span>
        </div>
      </nav>

      <section className={styles.stage} aria-live="polite">
        <div className={styles.copy}>
          <div className={styles.eyebrow}><span>{sceneLabel}</span><i />{current.kicker}</div>
          <h1>{current.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
          <p>{current.body}</p>
          <div className={styles.guardrail}><span>RESEARCH PROTOTYPE</span><b /> <span>NOT A DIAGNOSTIC TOOL</span></div>
        </div>

        <div className={styles.productFrame}>
          <div className={styles.windowBar}><span className={styles.windowBrand}><span className={styles.miniEye}>◉</span> Thermoeye</span><span>LOCAL WORKSPACE</span><span className={styles.windowDots}>— □ ×</span></div>
          <div className={styles.dashboard}>
            <aside className={styles.sidebar}>
              <div className={styles.sideLogo}><img src="/thermoeye-logo-logoremovebg.png" alt="" /></div>
              <div className={styles.sideItemActive}><span>◈</span> Dashboard</div>
              <div className={styles.sideItem}><span>↥</span> Upload scan</div>
              <div className={styles.sideItem}><span>◌</span> Cases</div>
              <div className={styles.sideItem}><span>⊙</span> Analysis</div>
              <div className={styles.sideItem}><span>▤</span> Reports</div>
              <div className={styles.sideRule} />
              <div className={styles.sideFoot}><span className={styles.statusPulse} /> Engine ready<br /><small>Research mode</small></div>
            </aside>
            <div className={styles.screen}>
              <header className={styles.screenHead}><div><small>OCTA RESEARCH WORKSPACE</small><strong>Analysis overview</strong></div><button type="button">＋ New scan</button></header>
              <div className={styles.screenGrid}>
                <section className={styles.heroCard}><div><small>SELECTED CASE</small><strong>TE-DEMO-024</strong><span>OCTA · Right eye · 3 × 3 mm</span></div><span className={styles.badge}>REVIEW READY</span></section>
                <section className={styles.imageCard}><div className={styles.cardTitle}><span>Vessel map</span><small>onnx_vessel_unet</small></div><div className={styles.scanWrap}><img src={current.image} alt="OCTA example" /></div><div className={styles.scanMeta}><span><b className={styles.cyanDot} /> Source image</span><span><b className={styles.violetDot} /> Segmentation</span></div></section>
                <section className={styles.metricCard}><div className={styles.cardTitle}><span>Research measurements</span><small>percent_0_100</small></div><div className={styles.metric}><span>Vessel density proxy</span><strong>20.69<span>%</span></strong></div><div className={styles.metric}><span>Image quality</span><strong>75.64<span>%</span></strong></div><div className={styles.metric}><span>Model status</span><strong className={styles.ready}>Ready</strong></div><div className={styles.metricFoot}>Measurements are research proxies. Disease result: indeterminate.</div></section>
              </div>
              <div className={styles.bottomLine}><span><b className={styles.statusPulse} /> Provenance recorded</span><span>Review gate · Human decision required</span></div>
            </div>
          </div>
          <div className={styles.scanline} aria-hidden="true" />
        </div>
      </section>

      <footer className={styles.controls}>
        <div className={styles.timeline}><span className={styles.timelineFill} style={{ width: `${((scene + progress) / scenes.length) * 100}%` }} /></div>
        <div className={styles.controlRow}><div className={styles.sceneNames}>{scenes.map((item, index) => <button key={item.kicker} type="button" className={index === scene ? styles.sceneActive : ""} onClick={() => jumpTo(index)}><span>{String(index + 1).padStart(2, "0")}</span>{item.kicker}</button>)}</div><div className={styles.actions}><button type="button" aria-label={playing ? "Pause animation" : "Play animation"} onClick={() => setPlaying((value) => !value)}>{playing ? "Ⅱ" : "▶"}</button><button type="button" aria-label="Restart animation" onClick={() => { setScene(0); setProgress(0); setPlaying(true); }}>↺</button></div></div>
      </footer>
    </main>
  );
}

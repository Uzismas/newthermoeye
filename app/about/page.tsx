import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import s from "./landing.module.css";

export const metadata: Metadata = {
  title: "Eyezheimer — OCTA vessel analysis (research prototype)",
  description:
    "Research prototype that segments retinal vessels in OCTA images with an ONNX U-Net and produces reviewer-approved research reports. Not a medical device; no disease diagnosis.",
};

const steps = [
  ["Upload", "Researcher uploads an OCTA en-face image. Size, format and basic modality checks run first."],
  ["Quality gate", "Images that fail checks are blocked with a reason instead of being analysed."],
  ["Vessel segmentation", "A U-Net (ONNX) outlines retinal vessels and reports vessel density with units and provenance."],
  ["Human review", "A reviewer records a decision; the research PDF unlocks only after approval."],
];

const evidence = [
  ["Model task", "Retinal vessel segmentation on OCTA images"],
  ["Training data", "ROSE-O, a published open OCTA dataset (Zenodo 12775880); 30 train / 9 test images"],
  ["Measured result", "Dice 0.708 on the 9 published test images (segmentation overlap — not diagnostic accuracy)"],
  ["Disease classifier", "None. Disease risk and confidence are always shown as unavailable"],
  ["Clinical validation", "Not done. No patient data has been used"],
];

export default function Home() {
  return (
    <div className={s.page}>
      <a className={s.skip} href="#main">Skip to content</a>
      <header className={s.nav}>
        <div className={s.navInner}>
          <Link className={s.brand} href="/about">
            <Image src="/thermoeye-logo-logoremovebg.png" alt="" width={666} height={375} priority style={{ height: 36, width: "auto" }} />
            Eyezheimer
          </Link>
          <nav className={s.navLinks} aria-label="Primary">
            <a href="#how">How it works</a>
            <a href="#evidence">Evidence</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#privacy">Data &amp; privacy</a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className={s.wrap + " " + s.hero}>
          <span className={s.badge}>Research prototype · Young Scientist Competition (YSC)</span>
          <h1>Retinal vessel analysis for OCTA research</h1>
          <p className={s.lead}>
            Eyezheimer turns an OCTA scan into a reviewable vessel map and measurements, with every limit stated. It is the
            groundwork for studying retinal biomarkers of Alzheimer&apos;s disease — it does not detect the disease today.
          </p>
          <p className={s.lead} lang="th">
            ต้นแบบงานวิจัยสำหรับแบ่งเส้นเลือดจอประสาทตาจากภาพ OCTA ปัจจุบันยังไม่วินิจฉัยหรือคัดกรองโรคใด ๆ
          </p>
          <div className={s.cta}>
            <Link className={`${s.btn} ${s.btnPrimary}`} href="/console/dashboard">Open research demo</Link>
            <a className={`${s.btn} ${s.btnGhost}`} href="#evidence">See the evidence</a>
          </div>
          <p className={s.notice} role="note">
            Not a medical device. Outputs are for research and must not be used for diagnosis or treatment decisions.
          </p>
        </section>

        <section id="how" className={s.section}>
          <div className={s.wrap}>
            <h2>How it works</h2>
            <p className={s.sub}>A short, auditable pipeline that runs on the local machine.</p>
            <ol className={s.steps}>
              {steps.map(([title, body]) => (
                <li key={title}><strong>{title}</strong><span>{body}</span></li>
              ))}
            </ol>
          </div>
        </section>

        <section id="evidence" className={s.section}>
          <div className={s.wrap}>
            <h2>What has actually been measured</h2>
            <p className={s.sub}>Only results that exist in the repository are listed here.</p>
            <table className={s.table}>
              <caption>Current model status</caption>
              <tbody>
                {evidence.map(([k, v]) => (
                  <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="roadmap" className={s.section}>
          <div className={s.wrap}>
            <h2>Roadmap</h2>
            <p className={s.sub}>What must happen before any disease-related claim can be made.</p>
            <div className={s.cols}>
              <div className={s.card}>
                <h3>Now: segmentation research</h3>
                <ul>
                  <li>Reproducible vessel-segmentation baseline</li>
                  <li>Quality gating and provenance on every result</li>
                  <li>Reviewer-approved research reports</li>
                </ul>
              </div>
              <div className={s.card}>
                <h3>Next: disease research (not started)</h3>
                <ul>
                  <li>Ethics approval and an authorised, labelled patient cohort</li>
                  <li>Patient-level train/test split and a pre-defined endpoint</li>
                  <li>Report sensitivity, specificity and AUC honestly — including negative results</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="privacy" className={s.section}>
          <div className={s.wrap}>
            <h2>Data &amp; privacy</h2>
            <ul>
              <li>Analysis runs locally; images are not sent to external AI services by default.</li>
              <li>Demonstrations use public or synthetic images only — no patient data.</li>
              <li>The demo sign-in is a prototype mechanism, not production patient-data security.</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.wrap}>
          <p><strong>Eyezheimer</strong> (Thermoeye platform) — research prototype for education and competition use.</p>
          <p>Not a medical device. Not clinically validated. Does not diagnose Alzheimer&apos;s disease, MCI, or any other condition.</p>
          <p>Dataset: ROSE-O, Zenodo record 12775880.</p>
        </div>
      </footer>
    </div>
  );
}

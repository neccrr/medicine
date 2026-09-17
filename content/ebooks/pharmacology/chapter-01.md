# Chapter 1: Pharmacokinetics Basics

Pharmacokinetics is what the body does to a drug — as opposed to
pharmacodynamics, which is what the drug does to the body. Almost every
"why does this interaction happen" question traces back to one of the
four stages below.

<figure class="diagram">
  <svg viewBox="0 0 680 150" role="img" aria-labelledby="adme-title adme-desc">
    <title id="adme-title">The ADME pathway</title>
    <desc id="adme-desc">A drug moves through four sequential stages after administration: absorption into the bloodstream, distribution to tissues, metabolism (mainly hepatic), and excretion (mainly renal).</desc>
    <defs>
      <marker id="admeArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 Z" fill="var(--accent)" />
      </marker>
    </defs>
    <rect x="15" y="20" width="140" height="100" rx="12" fill="var(--surface-2)" stroke="var(--border)" stroke-width="1.5" />
    <g transform="rotate(-30 85 50)">
      <rect x="65" y="42" width="40" height="16" rx="8" fill="none" stroke="var(--accent)" stroke-width="2" />
      <line x1="85" y1="42" x2="85" y2="58" stroke="var(--accent)" stroke-width="2" />
    </g>
    <text x="85" y="102" fill="var(--text)" font-size="13" font-weight="600" text-anchor="middle">Absorption</text>
    <rect x="185" y="20" width="140" height="100" rx="12" fill="var(--surface-2)" stroke="var(--border)" stroke-width="1.5" />
    <circle cx="255" cy="50" r="4" fill="var(--accent)" />
    <circle cx="240" cy="60" r="3" fill="var(--accent)" />
    <circle cx="270" cy="62" r="3" fill="var(--accent)" />
    <circle cx="255" cy="68" r="3" fill="var(--accent)" />
    <line x1="255" y1="50" x2="240" y2="60" stroke="var(--accent)" stroke-width="1.4" />
    <line x1="255" y1="50" x2="270" y2="62" stroke="var(--accent)" stroke-width="1.4" />
    <line x1="255" y1="50" x2="255" y2="68" stroke="var(--accent)" stroke-width="1.4" />
    <text x="255" y="102" fill="var(--text)" font-size="13" font-weight="600" text-anchor="middle">Distribution</text>
    <rect x="355" y="20" width="140" height="100" rx="12" fill="var(--surface-2)" stroke="var(--border)" stroke-width="1.5" />
    <polygon points="425,35 434,40 434,50 425,55 416,50 416,40" fill="none" stroke="var(--accent)" stroke-width="2" />
    <circle cx="425" cy="45" r="3" fill="var(--accent)" />
    <text x="425" y="102" fill="var(--text)" font-size="13" font-weight="600" text-anchor="middle">Metabolism</text>
    <rect x="525" y="20" width="140" height="100" rx="12" fill="var(--surface-2)" stroke="var(--border)" stroke-width="1.5" />
    <path d="M595,35 C588,48 588,58 595,64 C602,58 602,48 595,35 Z" fill="none" stroke="var(--accent)" stroke-width="2" />
    <text x="595" y="102" fill="var(--text)" font-size="13" font-weight="600" text-anchor="middle">Excretion</text>
    <line x1="158" y1="70" x2="182" y2="70" stroke="var(--accent)" stroke-width="2" marker-end="url(#admeArrow)" />
    <line x1="328" y1="70" x2="352" y2="70" stroke="var(--accent)" stroke-width="2" marker-end="url(#admeArrow)" />
    <line x1="498" y1="70" x2="522" y2="70" stroke="var(--accent)" stroke-width="2" marker-end="url(#admeArrow)" />
  </svg>
  <figcaption>ADME — the four stages a drug passes through, from dose to elimination.</figcaption>
</figure>

## Absorption

How a drug gets from the site of administration into the bloodstream.
**Bioavailability** is the fraction of an administered dose that reaches
systemic circulation unchanged — 100% by definition for IV drugs, often
much lower for oral drugs because of **first-pass metabolism**: the liver
(and gut wall) metabolizes some of the drug before it ever reaches
systemic circulation.

## Distribution

Once in the blood, a drug distributes into tissues based on lipid
solubility, protein binding, and blood flow. Highly protein-bound drugs
(e.g., warfarin) have a small free (active) fraction — displacing that
binding with another highly protein-bound drug can suddenly increase the
active concentration and cause toxicity.

## Metabolism

Mostly hepatic, mostly via the cytochrome P450 (CYP) enzyme family.

- **CYP inducers** (rifampin, carbamazepine, phenytoin, chronic alcohol —
  remember "the P450 inducers") speed up metabolism, lowering levels of
  co-administered CYP substrates.
- **CYP inhibitors** (grapefruit juice, macrolides, azole antifungals,
  protease inhibitors) slow metabolism, raising levels — and the risk of
  toxicity.

## Excretion

Mostly renal. **Half-life** (t½) is the time for plasma concentration to
fall by 50%; a drug reaches steady state (or is essentially eliminated)
after roughly 4–5 half-lives. This is why loading doses are used for
drugs with a long half-life when a fast therapeutic effect is needed.

## Key teaching point

When a question describes a drug interaction, ask which ADME stage is
being disrupted. "Levels went up" after adding a new drug almost always
means inhibited metabolism (or excretion); "levels went down" almost
always means induced metabolism or reduced absorption.

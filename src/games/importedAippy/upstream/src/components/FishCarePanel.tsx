import { getStage, appraiseFish, type Specimen } from '@/utils/boutique';
import { careSummary } from '@/utils/specimenCare';

export const developmentPaths = [
  { trait: 'ornate', name: 'Ornamental', icon: '✧', benefit: 'Flowing fins and a higher show value.', next: 'Each tier develops fuller fins and adds a beauty premium.' },
  { trait: 'swift', name: 'Athletic', icon: '↗', benefit: 'Stronger swimming and quicker escapes.', next: 'Each tier adds 12% swim speed, with a higher burst cost.' },
  { trait: 'vital', name: 'Vitality', icon: '♡', benefit: 'Better food efficiency and recovery.', next: 'A healthier raising path and more reliable breeding condition.' },
] as const;

export function formatCareTime(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export default function FishCarePanel({ specimen, phase }: { specimen: Specimen; phase?: 'day' | 'night'; compact?: boolean }) {
  const care = careSummary(specimen, Date.now());
  const stage = getStage(specimen.growth);
  return <section className="fish-care" aria-label="Fish care and progression">
    <p className="care-identity">{stage} guppy · {specimen.inherited?.finForm ?? 'original'} fins · ◈ {appraiseFish(specimen)}</p>
    <dl className="home-stats care-stats">
      <div><dt>Growth</dt><dd>{Math.round(specimen.growth)}%</dd></div>
      <div><dt>Health</dt><dd>{Math.round(specimen.health)}%</dd></div>
      <div><dt>Fed</dt><dd>{Math.round(specimen.hunger)}%</dd></div>
    </dl>
    <div className="care-readiness">
      <span className="home-eyebrow">HEALTHY RAISING</span>
      <strong>{stage === 'adult' ? 'Ready to flourish' : care.adultReadyInSeconds > 0 ? `Adult in at least ${formatCareTime(care.adultReadyInSeconds)}` : 'Time met · keep feeding to mature'}</strong>
      <p>Adulthood needs ten healthy minutes and enough nourishment. Growth pauses when poorly fed.</p>
    </div>
    <div className="care-diet"><strong>Flakes · pellets · algae{specimen.growth >= 35 ? ' · tiny prey' : ''}</strong><p>{specimen.growth < 35 ? 'Small guppies graze and eat flakes. Fish prey unlocks at juvenile growth.' : 'Tiny prey must still fit your mouth. Kept fish are never food.'}</p>
      <p>{care.feedingPreference === 'any' ? 'Feeds equally well by day or night.' : `Prefers ${care.feedingPreference} feeding${phase === care.feedingPreference ? ' · bonus active' : ''}.`}</p>
    </div>
    <div className="care-paths" aria-label="Development paths">{developmentPaths.map(path => {
      const tiers = specimen.traits.filter(trait => trait === path.trait).length;
      return <article key={path.trait} className={tiers ? 'care-path acquired' : 'care-path'}>
        <div><span aria-hidden="true">{path.icon}</span><h3>{path.name}</h3><span className="care-tier">{tiers}/2</span></div>
        <p>{path.benefit}</p><small>{tiers ? `${tiers} ${tiers === 1 ? 'tier chosen' : 'tiers chosen'}. ` : ''}{path.next}</small>
      </article>;
    })}</div>
    <p className="home-note care-lineage">Choose a path at 35% and 75% growth. Inherited colour and fin potential stay separate from these choices.{!!specimen.inherited?.parents.length && ' This guppy has a recorded two-parent lineage.'}</p>
  </section>;
}

import { useId } from 'react';
import FishPortrait from '@/components/FishPortrait';
import { useHomeSheet } from '@/components/HomeScreen';
import { createSpecimen } from '@/utils/boutique';
import './WelcomeScreen.css';

// Illustration only: never added to ownership or saved care.
const rainbow = { ...createSpecimen('rainbow', 'welcome-rainbow'), growth: 100, traits: ['vibrancy' as const, 'ornate' as const] };

export default function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  const id = useId();
  const ref = useHomeSheet(true, onContinue);
  return <div className="home-modal swim-welcome">
    <section className="swim-welcome-card" ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}>
      <p className="home-eyebrow">A little world to look after · V0.9</p>
      <h1 id={`${id}-title`}>Welcome to <span>SWIM.</span></h1>
      <div className="swim-welcome-fish"><FishPortrait specimen={rainbow} /></div>
      <p className="swim-welcome-intro">Buy fish. Raise them. Keep your favourites, breed them, or sell them for credits.</p>
      <ul className="swim-welcome-tips">
        <li><strong>Swim &amp; explore</strong><span>Choose a fish, steer with the stick, and Burst for a little speed.</span></li>
        <li><strong>Eat &amp; grow</strong><span>Hold Eat near suitable food. Shrimp earn 1 credit. Feed well, but don’t overfeed.</span></li>
        <li><strong>Hide &amp; heal</strong><span>The nursery keeps you safe and lets you return to View. Castle bubbles restore health.</span></li>
      </ul>
      <button className="home-button swim-welcome-start" onClick={onContinue}>Let’s begin <span aria-hidden="true">↗</span></button>
    </section>
  </div>;
}

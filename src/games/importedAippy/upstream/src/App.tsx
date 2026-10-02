import { useCallback, useEffect, useRef, useState } from 'react';
import Aquarium from '@/components/Aquarium';
import HomeScreen from '@/components/HomeScreen';
import StockSheet from '@/components/StockSheet';
import BreedingSheet from '@/components/BreedingSheet';
import { loadBoutique, writeBoutique, startStockRun, startResidentRun, type BoutiqueSave } from '@/utils/boutique';
import { initialiseCareProfile, advanceProfileCare } from '@/utils/worldClock';
import { startBreeding, claimBreeding } from '@/utils/breeding';
import { feedSpecimen, advanceSpecimenCare } from '@/utils/specimenCare';
import { sampleWorldClock } from '@/utils/worldClock';
import type { StockId } from '@/utils/stockCatalog';
import { useAquariumAudio } from '@/hooks/useAquariumAudio';
import '@/components/GardenUI.css';
import '@/components/HomeUI.css';

const App = () => {
  const [profile, setProfile] = useState(() => initialiseCareProfile(loadBoutique(), Date.now()));
  const profileRef = useRef(profile);
  const [saved, setSaved] = useState(true);
  const [raising, setRaising] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [breedingOpen, setBreedingOpen] = useState(false);
  // Retain the ended outing through its receipt, as well as unsaved live motion at home.
  const [outingId, setOutingId] = useState(profile.activeRun?.specimen.id ?? null);
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const audio = useAquariumAudio();
  const commitProfile = useCallback((next: BoutiqueSave) => {
    const success = writeBoutique(next);
    setSaved(success);
    if (success) { profileRef.current = next; setProfile(next); }
    return success;
  }, []);
  const returnHome = useCallback(() => {
    setRaising(false); setStockOpen(false);
    if (!profileRef.current.activeRun) setOutingId(null);
  }, []);
  const chooseNext = useCallback(() => {
    setRaising(false); setStockOpen(true);
    if (!profileRef.current.activeRun) setOutingId(null);
  }, []);
  const chooseStock = (stockId: StockId) => {
    const current = profileRef.current;
    const runId = globalThis.crypto?.randomUUID?.() ?? `stock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const next = startStockRun(current, stockId, runId);
    if (next === current || !commitProfile(next)) return;
    setOutingId(next.activeRun!.specimen.id); setStockOpen(false); setRaising(true);
    void audio.initAudio();
  };
  const raiseResident = (id: string) => {
    const current = profileRef.current;
    const visitId = globalThis.crypto?.randomUUID?.() ?? `visit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const next = startResidentRun(current, id, visitId, Date.now());
    if (next === current || !commitProfile(next)) return;
    setOutingId(id); setStockOpen(false); setBreedingOpen(false); setRaising(true);
    void audio.initAudio();
  };
  const breed = (a: string, b: string) => {
    const current = profileRef.current;
    const cycleId = globalThis.crypto?.randomUUID?.() ?? `brood-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const next = startBreeding(current, a, b, cycleId, Date.now());
    if (next !== current) commitProfile(next);
  };
  const welcomeGuppy = () => {
    const current = profileRef.current;
    const next = claimBreeding(current, Date.now());
    if (next !== current) commitProfile(next);
  };
  const feedResident = (id: string) => {
    const current = profileRef.current;
    if (!current.kept.some(fish => fish.id === id)) return;
    const phase = current.worldClock ? sampleWorldClock(current.worldClock, Date.now()).phase : 'day';
    const next = { ...current, kept: current.kept.map(fish => fish.id === id ? feedSpecimen(advanceSpecimenCare(fish,Date.now(),'home'), 'flake', Date.now(), phase) : fish) };
    commitProfile(next);
  };
  useEffect(() => {
    const tick = () => commitProfile(advanceProfileCare(profileRef.current, Date.now()));
    tick();
    const timer = window.setInterval(tick, 10000);
    const onHide = () => { if (document.hidden) tick(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onHide); };
  }, [commitProfile]);
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update); window.addEventListener('orientationchange', update);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
  }, []);
  return <div className="fixed inset-0 overflow-hidden bg-[#2f7f98]">
    {outingId && <div className="absolute inset-0" style={{ visibility: raising ? 'visible' : 'hidden' }} aria-hidden={!raising}>
      <Aquarium key={outingId} width={size.width} height={size.height}
        profile={profile} onProfileChange={commitProfile} onOpenShop={returnHome} onChooseStock={chooseNext}
        paused={!raising || stockOpen || breedingOpen} displaySpecimen={null} saved={saved} audio={audio} />
    </div>}
    {!raising && <div inert={stockOpen || breedingOpen} aria-hidden={stockOpen || breedingOpen || undefined}><HomeScreen width={size.width} height={size.height} profile={profile} saved={saved} paused={stockOpen || breedingOpen}
      onRaise={() => setStockOpen(true)} onContinue={() => { if (profileRef.current.activeRun) { setStockOpen(false); setRaising(true); void audio.initAudio(); } }}
      onRaiseResident={raiseResident} onFeedResident={feedResident} onBreed={() => setBreedingOpen(true)}
      onSound={audio.toggleSound} sound={audio.soundEnabled} onInteract={() => void audio.initAudio()} /></div>}
    {stockOpen && <StockSheet profile={profile} saved={saved} onChoose={chooseStock} onClose={() => setStockOpen(false)} />}
    {breedingOpen && <BreedingSheet profile={profile} saved={saved} onStart={breed} onClaim={welcomeGuppy} onClose={() => setBreedingOpen(false)} />}
  </div>;
};
export default App;

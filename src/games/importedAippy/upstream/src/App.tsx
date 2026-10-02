import { useCallback, useEffect, useRef, useState } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import AudioSettings from '@/components/AudioSettings';
import Aquarium from '@/components/Aquarium';
import HomeScreen from '@/components/HomeScreen';
import StockSheet from '@/components/StockSheet';
import BreedingSheet from '@/components/BreedingSheet';
import { loadBoutique, writeBoutique, purchaseStockRun, selectResidentRun, sellOwnedFish, type BoutiqueSave } from '@/utils/boutique';
import { initialiseCareProfile, advanceProfileCare } from '@/utils/worldClock';
import { startBreeding, claimBreeding } from '@/utils/breeding';
import { buyTankPellets, cleanTank, PELLET_PRICE, CLEAN_PRICE } from '@/utils/tankCare';
import type { StockId } from '@/utils/stockCatalog';
import { useAquariumAudio } from '@/hooks/useAquariumAudio';
import '@/components/GardenUI.css';
import '@/components/HomeUI.css';

const App = () => {
  const [profile, setProfile] = useState(() => advanceProfileCare(initialiseCareProfile(loadBoutique(), Date.now()),Date.now(),true,'away'));
  const profileRef = useRef(profile);
  const [saved, setSaved] = useState(true);
  const [raising, setRaising] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [breedingOpen, setBreedingOpen] = useState(false);
  const [selectedFishId, setSelectedFishId] = useState<string | null>(null);
  // Retain the ended outing through its receipt, as well as unsaved live motion at home.
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
  }, []);
  const chooseNext = useCallback(() => {
    setRaising(false); setStockOpen(true);
  }, []);
  const chooseStock = (stockId: StockId) => {
    const current = profileRef.current;
    const runId = globalThis.crypto?.randomUUID?.() ?? `stock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const next = purchaseStockRun(current, stockId, runId);
    if (next === current || !commitProfile(next)) return;
    setStockOpen(false); setRaising(true);
    void audio.initAudio();
  };
  const raiseResident = (id: string) => {
    const current = profileRef.current;
    const visitId = globalThis.crypto?.randomUUID?.() ?? `visit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const next = selectResidentRun(current, id, visitId, Date.now());
    if (next === current || !commitProfile(next)) return;
    setStockOpen(false); setBreedingOpen(false); setSelectedFishId(null); setRaising(true);
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
    const next = buyTankPellets(current,id,Date.now());
    if(next!==current)commitProfile(next);
  };
  const sellResident = (id: string) => {
    const current = profileRef.current, next = sellOwnedFish(current, id);
    if (next === current || !commitProfile(next)) return;
    setSelectedFishId(null);
    if (current.activeRun?.specimen.id === id) setRaising(false);
  };
  useEffect(() => {
    const tick = () => commitProfile(advanceProfileCare(profileRef.current, Date.now(), !raising,document.hidden?'away':'present'));
    tick();
    const timer = window.setInterval(tick, 10000);
    const onHide = () => { if (document.hidden) tick(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onHide); };
  }, [commitProfile, raising]);
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update); window.addEventListener('orientationchange', update);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
  }, []);
  return <div className="fixed inset-0 overflow-hidden bg-[#2f7f98]">
    <div className="absolute inset-0">
      <Aquarium width={size.width} height={size.height} mode={raising ? 'swim' : 'view'} onSelectFish={setSelectedFishId}
        profile={profile} onProfileChange={commitProfile} onOpenShop={returnHome} onChooseStock={chooseNext}
        paused={welcomeOpen || stockOpen || breedingOpen || settingsOpen || !!selectedFishId} displaySpecimen={null} saved={saved} audio={audio} />
    </div>
    {!raising && <div inert={welcomeOpen || stockOpen || breedingOpen || settingsOpen} aria-hidden={welcomeOpen || stockOpen || breedingOpen || settingsOpen || undefined}><HomeScreen width={size.width} height={size.height} profile={profile} saved={saved} paused={welcomeOpen || stockOpen || breedingOpen || settingsOpen}
      onRaise={() => setStockOpen(true)} onContinue={() => { if (profileRef.current.activeRun) { setStockOpen(false); setRaising(true); void audio.initAudio(); } }}
      onSellFish={sellResident} onRaiseResident={raiseResident} onFeedResident={feedResident} onBreed={() => setBreedingOpen(true)}
      selectedFishId={selectedFishId} onClearSelection={() => setSelectedFishId(null)}
      onCleanTank={() => { const current=profileRef.current,next=cleanTank(current,true,Date.now());if(next!==current)commitProfile(next); }}
      tankDirt={profile.tankCare?.dirt ?? 0} pelletPrice={PELLET_PRICE} cleanPrice={CLEAN_PRICE}
      onSound={() => setSettingsOpen(true)} sound={audio.soundEnabled} onInteract={() => void audio.initAudio()} /></div>}
    {welcomeOpen && <WelcomeScreen onContinue={() => { setWelcomeOpen(false); void audio.initAudio(); }} />}
    {settingsOpen && <AudioSettings audio={audio} onClose={() => setSettingsOpen(false)} />}
    {stockOpen && <StockSheet profile={profile} saved={saved} onChoose={chooseStock} onClose={() => setStockOpen(false)} />}
    {breedingOpen && <BreedingSheet profile={profile} saved={saved} onStart={breed} onClaim={welcomeGuppy} onClose={() => setBreedingOpen(false)} />}
  </div>;
};
export default App;

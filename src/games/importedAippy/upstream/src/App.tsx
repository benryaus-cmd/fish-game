import { useCallback, useEffect, useRef, useState } from 'react';
import Aquarium from '@/components/Aquarium';
import HomeScreen from '@/components/HomeScreen';
import StockSheet from '@/components/StockSheet';
import { loadBoutique, writeBoutique, startStockRun, type BoutiqueSave } from '@/utils/boutique';
import type { StockId } from '@/utils/stockCatalog';
import { useAquariumAudio } from '@/hooks/useAquariumAudio';
import '@/components/GardenUI.css';
import '@/components/HomeUI.css';

const App = () => {
  const [profile, setProfile] = useState(loadBoutique);
  const profileRef = useRef(profile);
  const [saved, setSaved] = useState(true);
  const [raising, setRaising] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
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
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update); window.addEventListener('orientationchange', update);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
  }, []);
  return <div className="fixed inset-0 overflow-hidden bg-[#2f7f98]">
    {outingId && <div className="absolute inset-0" style={{ visibility: raising ? 'visible' : 'hidden' }} aria-hidden={!raising}>
      <Aquarium key={outingId} width={size.width} height={size.height}
        profile={profile} onProfileChange={commitProfile} onOpenShop={returnHome} onChooseStock={chooseNext}
        paused={!raising || stockOpen} displaySpecimen={null} saved={saved} audio={audio} />
    </div>}
    {!raising && <div inert={stockOpen} aria-hidden={stockOpen || undefined}><HomeScreen width={size.width} height={size.height} profile={profile} saved={saved} paused={stockOpen}
      onRaise={() => setStockOpen(true)} onContinue={() => { if (profileRef.current.activeRun) { setStockOpen(false); setRaising(true); void audio.initAudio(); } }}
      onSound={audio.toggleSound} sound={audio.soundEnabled} onInteract={() => void audio.initAudio()} /></div>}
    {stockOpen && <StockSheet profile={profile} saved={saved} onChoose={chooseStock} onClose={() => setStockOpen(false)} />}
  </div>;
};
export default App;

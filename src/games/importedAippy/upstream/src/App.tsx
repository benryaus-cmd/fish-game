import { useCallback, useEffect, useState } from 'react';
import Aquarium from '@/components/Aquarium';
import BoutiqueScreen from '@/components/BoutiqueScreen';
import { loadBoutique, writeBoutique, type BoutiqueSave, type Specimen } from '@/utils/boutique';
import '@/components/GardenUI.css';

const App = () => {
  const [profile, setProfile] = useState(loadBoutique);
  const [saved, setSaved] = useState(true);
  const [shopOpen, setShopOpen] = useState(false);
  const [displayFish, setDisplayFish] = useState<Specimen | null>(null);
  const commitProfile = useCallback((next: BoutiqueSave) => {
    const success = writeBoutique(next);
    setSaved(success);
    if (success) setProfile(next);
    return success;
  }, []);
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#2f7f98]">
      <div className="absolute inset-0" style={{ visibility: displayFish ? 'hidden' : 'visible' }}>
      <Aquarium width={size.width} height={size.height}
        profile={profile} onProfileChange={commitProfile} onOpenShop={() => setShopOpen(true)}
        paused={shopOpen || !!displayFish} displaySpecimen={null} saved={saved} />
      </div>
      {displayFish && <Aquarium key={displayFish.id} width={size.width} height={size.height}
        profile={profile} onProfileChange={commitProfile} onOpenShop={() => setShopOpen(true)}
        paused={shopOpen} displaySpecimen={displayFish} saved={saved} />}
      {shopOpen && <BoutiqueScreen profile={profile} saved={saved}
        onReturn={() => { setDisplayFish(null); setShopOpen(false); }}
        onDisplay={fish => { setDisplayFish(fish); setShopOpen(false); }} />}
    </div>
  );
};

export default App;

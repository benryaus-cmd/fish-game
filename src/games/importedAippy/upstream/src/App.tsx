import { useEffect, useState } from 'react';
import Aquarium from '@/components/Aquarium';

const App = () => {
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
      <Aquarium width={size.width} height={size.height} />
    </div>
  );
};

export default App;
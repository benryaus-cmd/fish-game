import type { BoutiqueSave } from './boutique.ts';
import { advanceSpecimenCare, feedSpecimen } from './specimenCare.ts';
import { sampleWorldClock } from './worldClock.ts';
export const PELLET_PRICE = 5;
export const CLEAN_PRICE = 15;
export function advanceTankCare(save: BoutiqueSave, now=Date.now()): BoutiqueSave {
  const at=Math.max(save.tankCare?.lastUpdatedMs??0,save.worldClock?.lastSeenMs??0,Number.isFinite(now)?Math.max(0,now):0);
  const tank=save.tankCare ?? {dirt:0,lastUpdatedMs:at,pellets:0};
  if(save.tankCare && at===tank.lastUpdatedMs) return save;
  return {...save,tankCare:{...tank,dirt:Math.min(100,tank.dirt+(at-tank.lastUpdatedMs)/1000/60),lastUpdatedMs:at}};
}
export function buyTankPellets(save: BoutiqueSave, id: string, now=Date.now()): BoutiqueSave {
  const active=save.activeRun?.specimen.id===id ? save.activeRun : null;
  const fish=active?.specimen ?? save.kept.find(fish=>fish.id===id);
  if(!fish || fish.health<=0 || !Number.isFinite(save.coins) || save.coins<PELLET_PRICE) return save;
  const profile=advanceTankCare(save,now),at=profile.tankCare!.lastUpdatedMs;
  const phase=profile.worldClock ? sampleWorldClock(profile.worldClock,at).phase : 'day';
  const advanced=advanceSpecimenCare(fish,at,active?'growing':'home','present');
  const fed=feedSpecimen(advanced,'pellet',at,phase);
  return {...profile,coins:profile.coins-PELLET_PRICE,kept:profile.kept.map(candidate=>candidate.id===id?fed:candidate),activeRun:active?{...active,specimen:fed}:profile.activeRun,tankCare:{...profile.tankCare!,pellets:profile.tankCare!.pellets+1,dirt:Math.min(100,profile.tankCare!.dirt+1)}};
}
export function cleanTank(save: BoutiqueSave, paid: boolean, now=Date.now()): BoutiqueSave {
  if(paid && (!Number.isFinite(save.coins)||save.coins<CLEAN_PRICE)) return save;
  const profile=advanceTankCare(save,now);
  if(profile.tankCare!.dirt<=0) return save;
  return {...profile,coins:profile.coins-(paid?CLEAN_PRICE:0),tankCare:{...profile.tankCare!,dirt:0}};
}

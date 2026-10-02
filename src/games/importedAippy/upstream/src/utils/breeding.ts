import { createSpecimen, NURSERY_CAPACITY, type BoutiqueSave, type Specimen } from './boutique.ts';
import { advanceSpecimenCare, ensureSpecimenCare, ADULT_HEALTHY_SECONDS } from './specimenCare.ts';
export const BREEDING_SECONDS = 120;
export interface BreedingCycle { id: string; parentIds: [string,string]; startedAtMs: number; readyAtMs: number; offspring: Specimen }
export function breedingEligibility(save: BoutiqueSave, a: string, b: string, now = Date.now()): { eligible: boolean; reason: string } {
  const reject = (reason: string) => ({ eligible: false, reason });
  if (save.breeding) return reject('A nursery cycle is already underway.');
  if (a === b) return reject('Choose two different parents.');
  if (save.kept.length + (save.activeRun?.source === 'resident' ? 1 : 0) >= NURSERY_CAPACITY) return reject('The nursery is full.');
  const parents = [a,b].map(id=>save.kept.find(fish=>fish.id===id));
  if (parents.some(fish=>!fish)) return reject('Both parents must be in the viewing tank.');
  for (const parent of parents) {
    const fish=advanceSpecimenCare(parent!,now,'home');
    if (fish.growth<75 || fish.care!.healthySeconds<ADULT_HEALTHY_SECONDS) return reject('Both parents need ten healthy minutes and adult growth.');
    if (fish.health<70) return reject('Both parents need at least 70 health.');
    if (fish.hunger<60) return reject('Feed both parents to at least 60 fullness.');
  }
  return {eligible:true,reason:'Two healthy, fed adults are ready.'};
}
export function startBreeding(save: BoutiqueSave, a: string, b: string, cycleId: string, now = Date.now()): BoutiqueSave {
  if (!cycleId.trim() || cycleId.length>128 || !Number.isFinite(now) || now<0 || !breedingEligibility(save,a,b,now).eligible || save.completedRunIds.includes(cycleId) || save.kept.some(fish=>fish.id===cycleId) || save.activeRun?.specimen.id === cycleId || save.activeRun?.visitId === cycleId) return save;
  now = Math.max(now, save.worldClock?.lastSeenMs ?? 0, ...save.kept.filter(fish => fish.id === a || fish.id === b).map(fish => fish.care?.lastCareAtMs ?? 0));
  const parentA=save.kept.find(fish=>fish.id===a)!, parentB=save.kept.find(fish=>fish.id===b)!;
  const childId=`${cycleId}:child`;
  if(childId.length>128 || save.completedRunIds.includes(childId) || save.kept.some(fish=>fish.id===childId) || save.activeRun?.specimen.id===childId) return save;
  const colorParent = Math.random()<.5 ? parentA : parentB;
  const finParent = Math.random()<.5 ? parentA : parentB;
  const child=ensureSpecimenCare({ ...createSpecimen('ordinary',childId), name:'Guppy fry',color:colorParent.color,accent:colorParent.accent, inherited:{ colorFamily:colorParent.inherited?.colorFamily??'silver',finForm:finParent.inherited?.finForm??'short',parents:[a,b]} },now + BREEDING_SECONDS * 1000);
  return {...save,kept:save.kept.map(fish=>fish.id===a||fish.id===b?advanceSpecimenCare(fish,now,'home'):fish),breeding:{id:cycleId,parentIds:[a,b],startedAtMs:now,readyAtMs:now+BREEDING_SECONDS*1000,offspring:child}};
}
export function claimBreeding(save: BoutiqueSave, now = Date.now()): BoutiqueSave {
  const cycle=save.breeding;
  now = Number.isFinite(now) ? Math.max(now, save.worldClock?.lastSeenMs ?? 0, ...(cycle ? save.kept.filter(fish => cycle.parentIds.includes(fish.id)).map(fish => fish.care?.lastCareAtMs ?? 0) : [])) : now;
  if (!cycle || !Number.isFinite(now) || now<cycle.readyAtMs || save.completedRunIds.includes(cycle.id) || save.kept.length>=NURSERY_CAPACITY || save.kept.some(fish=>fish.id===cycle.offspring.id) || save.activeRun?.specimen.id===cycle.offspring.id) return save;
  return {...save,kept:[...save.kept,advanceSpecimenCare(cycle.offspring,now,'home')],placements:{...save.placements,[cycle.offspring.id]:'home'},breeding:null,completedRunIds:[...save.completedRunIds,cycle.id].slice(-10000)};
}

import {limbNames, type Pose} from './model';

/** Compare the actual pose rather than remembering the last preset button clicked. */
export function samePose(a:Pose,b:Pose):boolean {
  const equal=(x:number[],y:number[])=>x.every((n,i)=>n===y[i]);
  return a.version===b.version && a.limits===b.limits &&
    (['root','rotation','pelvis','chest','head'] as const).every(key=>equal(a[key],b[key])) &&
    limbNames.every(key=>a.limbs[key].pole===b.limbs[key].pole && equal(a.limbs[key].target,b.limbs[key].target) && equal(a.limbs[key].rotation,b.limbs[key].rotation));
}

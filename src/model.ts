import {Vector3, Quaternion, Euler} from 'three';
export type V = [number,number,number];
export const proportions = {shoulders:1.6, hips:.85, upperArm:1.3, forearm:1.15, thigh:1.75, shin:1.75, head:.85};
export const limbNames=['leftArm','rightArm','leftLeg','rightLeg'] as const;
export type Limb=typeof limbNames[number];
export type Pose={version:1; root:V; rotation:V; pelvis:V; chest:V; head:V; limits:boolean; limbs:Record<Limb,{target:V;pole:number;rotation:V}>};
export const vec=(v:V)=>new Vector3(...v);
export function basePose():Pose{return {version:1,root:[0,0,0],rotation:[0,0,0],pelvis:[0,0,0],chest:[0,0,0],head:[0,0,0],limits:true,limbs:{leftArm:{target:[-2.05,3.3,0],pole:0,rotation:[0,0,0]},rightArm:{target:[2.05,3.3,0],pole:0,rotation:[0,0,0]},leftLeg:{target:[-.55,.15,0],pole:0,rotation:[0,0,0]},rightLeg:{target:[.55,.15,0],pole:0,rotation:[0,0,0]}}};}
export function quat(v:V){return new Quaternion().setFromEuler(new Euler(...v.map(n=>n*Math.PI/180) as V));}
export function solveIK(start:Vector3,target:Vector3,a:number,b:number,pole:number,leg:boolean,limits:boolean){
 const axis=target.clone().sub(start);const raw=axis.length(); if(raw<1e-8)axis.set(0,-1,0);else axis.divideScalar(raw);
 const max=limits?Math.sqrt(a*a+b*b+2*a*b*Math.cos(.045)):a+b-.00001;
 const min=limits?Math.sqrt(a*a+b*b+2*a*b*Math.cos(2.65)):Math.abs(a-b)+.00001;
 const d=Math.max(min,Math.min(max,raw)); const end=start.clone().addScaledVector(axis,d);
 let bend=new Vector3(0,0,leg?1:-1).addScaledVector(axis,-axis.z*(leg?1:-1));
 if(bend.lengthSq()<.00001)bend=new Vector3(1,0,0).addScaledVector(axis,-axis.x);
 bend.normalize().applyAxisAngle(axis,pole*Math.PI/180);
 const along=(a*a-b*b+d*d)/(2*d);const height=Math.sqrt(Math.max(0,a*a-along*along));
 return {start,joint:start.clone().addScaledVector(axis,along).addScaledVector(bend,height),end};
}
export function skeleton(p:Pose){
 const pq=quat(p.pelvis),cq=pq.clone().multiply(quat(p.chest)); const hip=new Vector3(0,3.65,0);
 const waist=hip.clone().add(new Vector3(0,.7,0).applyQuaternion(pq));const neck=waist.clone().add(new Vector3(0,1.3,0).applyQuaternion(cq));
 const result={} as Record<Limb,ReturnType<typeof solveIK>>;
 for(const name of limbNames){const leg=name.includes('Leg'), side=name.startsWith('left')?-1:1;
 const start=(leg?hip:neck).clone().add(new Vector3(side*(leg?proportions.hips:proportions.shoulders)/2,leg?0:-.15,0).applyQuaternion(leg?pq:cq));
 result[name]=solveIK(start,vec(p.limbs[name].target),leg?proportions.thigh:proportions.upperArm,leg?proportions.shin:proportions.forearm,p.limbs[name].pole,leg,p.limits);
 }return {hip,waist,neck,pq,cq,limbs:result};
}
export function preset(name:string):Pose {const p=basePose();if(name==='Приседание'){p.root[1]=-1.3;p.limbs.leftLeg.target=[-.65,1.45,.2];p.limbs.rightLeg.target=[.65,1.45,.2];p.limbs.leftArm.target=[-1,4.1,1.5];p.limbs.rightArm.target=[1,4.1,1.5];p.chest[0]=15;}if(name==='Скейтбордист'){p.root[1]=-.8;p.chest=[15,-30,-15];p.pelvis=[0,20,0];p.limbs.leftLeg.target=[-1.25,.95,.45];p.limbs.rightLeg.target=[1.1,.95,-.5];p.limbs.leftArm.target=[-2.4,4.5,.6];p.limbs.rightArm.target=[2.1,4.9,-.6];}if(name==='Прыжок'){p.root[1]=.7;p.limbs.leftArm.target=[-1.4,7,0];p.limbs.rightArm.target=[1.4,7,0];p.limbs.leftLeg.target=[-.7,1.9,1.4];p.limbs.rightLeg.target=[.9,1.3,-1];}if(name==='Скручивание'){p.chest=[10,55,-15];p.head=[0,-30,10];p.limbs.leftArm.target=[-1.5,5.5,1.5];p.limbs.rightArm.target=[1.8,4,-1];}return p;}

export function limitRotation(part:string,v:V,enabled:boolean):V {if(!enabled||part==='root')return v;const ranges:Record<string,V>={head:[70,85,45],chest:[65,85,50],pelvis:[60,90,50],leftArm:[100,100,100],rightArm:[100,100,100],leftLeg:[60,60,45],rightLeg:[60,60,45]};const r=ranges[part];return r?v.map((n,i)=>Math.max(-r[i],Math.min(r[i],n))) as V:v;}

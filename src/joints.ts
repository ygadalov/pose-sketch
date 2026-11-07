import {Euler, Matrix4, Quaternion, Vector3} from 'three';
import {limbNames, proportions, quat, skeleton, vec, type Limb, type Pose, type V} from './model';

export type JointSelection = {limb:Limb; kind:'base'|'bend'};
export function jointSelection(id:string):JointSelection|null {
  for(const limb of limbNames){
    if(id===`${limb}:base`)return {limb,kind:'base'};
    if(id===`${limb}:bend`)return {limb,kind:'bend'};
  }
  return null;
}
const degrees=(q:Quaternion)=>new Euler().setFromQuaternion(q,'XYZ').toArray().slice(0,3).map(v=>Number(v)*180/Math.PI) as V;
const down=new Vector3(0,-1,0);
export function jointState(p:Pose,limb:Limb){
  const chain=skeleton(p).limbs[limb];
  const upper=chain.joint.clone().sub(chain.start).normalize();
  const lower=chain.end.clone().sub(chain.joint).normalize();
  const flex=Math.acos(Math.max(-1,Math.min(1,upper.dot(lower))));
  const y=upper.clone().negate();
  let z=lower.clone().addScaledVector(upper,-upper.dot(lower));
  if(z.lengthSq()<1e-10){z.set(0,0,1).addScaledVector(y,-y.z);if(z.lengthSq()<1e-10)z.set(1,0,0).addScaledVector(y,-y.x);}
  z.normalize();const x=y.clone().cross(z).normalize();z=x.clone().cross(y).normalize();
  const orientation=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z));
  const forearm=new Quaternion().setFromUnitVectors(down,lower);
  return {...chain,upper,lower,flex:flex*180/Math.PI,rotation:degrees(orientation),forearmRotation:degrees(forearm)};
}
// Recover the IK pole from an explicit FK chain. The persisted v1 format stays unchanged.
export function writeChain(p:Pose,limb:Limb,joint:Vector3,end:Vector3){
  const start=skeleton(p).limbs[limb].start;
  const axis=end.clone().sub(start).normalize();
  const sign=limb.includes('Leg')?1:-1;
  let reference=new Vector3(0,0,sign).addScaledVector(axis,-axis.z*sign);
  if(reference.lengthSq()<.00001)reference=new Vector3(1,0,0).addScaledVector(axis,-axis.x);
  reference.normalize();
  const bend=joint.clone().sub(start);bend.addScaledVector(axis,-bend.dot(axis)).normalize();
  const angle=Math.atan2(axis.dot(reference.clone().cross(bend)),reference.dot(bend))*180/Math.PI;
  p.limbs[limb].target=end.toArray() as V;
  p.limbs[limb].pole=angle;
}
export function rotateBase(p:Pose,limb:Limb,angles:V){
  const s=jointState(p,limb);const q=quat(angles);
  const leg=limb.includes('Leg'),a=leg?proportions.thigh:proportions.upperArm,b=leg?proportions.shin:proportions.forearm;
  const flex=s.flex*Math.PI/180;
  const joint=s.start.clone().add(down.clone().applyQuaternion(q).multiplyScalar(a));
  const lower=new Vector3(0,-Math.cos(flex),Math.sin(flex)).applyQuaternion(q);
  writeChain(p,limb,joint,joint.clone().addScaledVector(lower,b));
}
export function setFlex(p:Pose,limb:Limb,degrees:number){
  const s=jointState(p,limb);const angle=Math.max(p.limits?.045*180/Math.PI:.05,Math.min(p.limits?2.65*180/Math.PI:179.5,degrees))*Math.PI/180;
  const normal=new Vector3(0,0,1).applyQuaternion(quat(s.rotation));
  const direction=s.upper.clone().multiplyScalar(Math.cos(angle)).addScaledVector(normal,Math.sin(angle));
  const b=limb.includes('Leg')?proportions.shin:proportions.forearm;
  writeChain(p,limb,s.joint,s.joint.clone().addScaledVector(direction,b));
}
export function moveBend(p:Pose,limb:Limb,target:V){
  const s=jointState(p,limb),direction=vec(target).sub(s.start);
  if(direction.lengthSq()<1e-10)return;
  const q=new Quaternion().setFromUnitVectors(s.upper,direction.normalize());
  writeChain(p,limb,s.start.clone().add(s.joint.clone().sub(s.start).applyQuaternion(q)),s.start.clone().add(s.end.clone().sub(s.start).applyQuaternion(q)));
}
export function rotateBend(p:Pose,limb:Limb,angles:V){
  const s=jointState(p,limb);let direction=down.clone().applyQuaternion(quat(angles));
  const angle=Math.acos(Math.max(-1,Math.min(1,s.upper.dot(direction))));
  const bounded=Math.max(p.limits?.045:.05*Math.PI/180,Math.min(p.limits?2.65:179.5*Math.PI/180,angle));
  let plane=direction.clone().addScaledVector(s.upper,-s.upper.dot(direction));
  if(plane.lengthSq()<1e-10)plane=new Vector3(0,0,1).applyQuaternion(quat(s.rotation));
  direction=s.upper.clone().multiplyScalar(Math.cos(bounded)).addScaledVector(plane.normalize(),Math.sin(bounded));
  const b=limb.includes('Leg')?proportions.shin:proportions.forearm;
  writeChain(p,limb,s.joint,s.joint.clone().addScaledVector(direction,b));
}

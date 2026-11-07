import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,type BufferGeometry} from 'three';
import {footGeometry,segmentGeometry,torsoGeometry,limbProfiles,limbGeometry} from '../src/anatomy';
import {preset,skeleton,limbNames} from '../src/model';

function validClosedSurface(geometry:BufferGeometry){
 const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),index=geometry.getIndex()!;
 for(let i=0;i<position.count;i++){
  assert.ok([position.getX(i),position.getY(i),position.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i)].every(Number.isFinite));
  assert.ok(new Vector3().fromBufferAttribute(normal,i).length()>.9);
 }
 const ringSize=geometry.userData.ringSize,ringCount=geometry.userData.ringCount;let previous:Vector3|undefined;
 for(let ring=0;ring<ringCount;ring++){
  const center=new Vector3();for(let i=0;i<ringSize;i++)center.add(new Vector3().fromBufferAttribute(position,ring*ringSize+i));center.divideScalar(ringSize);
  const radial=new Vector3().fromBufferAttribute(position,ring*ringSize).sub(center).normalize();
  if(previous)assert.ok(previous.dot(radial)>-.1,'Adjacent surface rings must not flip at a bent joint');previous=radial;
 }
 const edges=new Map<string,number>();
 for(let i=0;i<index.count;i+=3){const face=[index.getX(i),index.getX(i+1),index.getX(i+2)];for(let j=0;j<3;j++){const a=face[j],b=face[(j+1)%3];assert.ok(a!==b);const key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)||0)+1);}}
 assert.ok([...edges.values()].every(n=>n===2),'Each surface edge must join exactly two triangles');
 geometry.dispose();
}
test('contoured feet, torso and limb surfaces stay closed and finite in every starter pose',()=>{
 validClosedSurface(footGeometry(-1));validClosedSurface(footGeometry(1));
 for(const name of ['Исходная','Приседание','Скейтбордист','Прыжок','Скручивание']){
  const p=preset(name),before=JSON.stringify(p),s=skeleton(p);validClosedSurface(torsoGeometry(p));
  for(const limb of limbNames){const l=s.limbs[limb],[a,b]=limbProfiles(limb);validClosedSurface(segmentGeometry(l.start,l.joint,a));validClosedSurface(segmentGeometry(l.joint,l.end,b));validClosedSurface(limbGeometry(l.start,l.joint,l.end,limb));}
  assert.equal(JSON.stringify(p),before,'Rendering must not change the pose');
 }
});

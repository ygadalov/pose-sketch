import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {basePose,skeleton,limbNames,solveIK,preset,proportions} from '../src/model';
import {parsePose} from '../src/storage';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('IK preserves both lengths for 3D targets, unreachable targets and presets',()=>{
 for(const n of ['Исходная','Приседание','Скейтбордист','Прыжок','Скручивание']){const p=preset(n);for(let i=0;i<30;i++){for(const name of limbNames){p.limbs[name].target=[Math.sin(i)*4,Math.cos(i)*5,Math.sin(i*2)*3];p.limbs[name].pole=i*11;}const s=skeleton(p);for(const name of limbNames){const l=s.limbs[name],leg=name.includes('Leg');near(l.start.distanceTo(l.joint),leg?proportions.thigh:proportions.upperArm);near(l.joint.distanceTo(l.end),leg?proportions.shin:proportions.forearm);}}}
});
test('pole rotates elbow and knee without changing endpoints',()=>{for(const leg of [true,false]){const a=solveIK(new Vector3(),new Vector3(0,-2,0),1.5,1.5,0,leg,true);const b=solveIK(new Vector3(),new Vector3(0,-2,0),1.5,1.5,180,leg,true);near(a.end.distanceTo(b.end),0);assert.ok(a.joint.z*b.joint.z<0);}});
test('JSON roundtrip preserves a complex pose and rejects invalid formats',()=>{const p=preset('Скейтбордист');assert.deepEqual(parsePose(JSON.stringify(p)),p);assert.throws(()=>parsePose('{"version":2}'));const bad=basePose();(bad.root as unknown[])=[null,0,0];assert.throws(()=>parsePose(JSON.stringify(bad)));});
test('limits constrain fold and can be disabled; singular target is finite',()=>{const start=new Vector3();const constrained=solveIK(start,new Vector3(),1.5,1.5,0,true,true);const free=solveIK(start,new Vector3(),1.5,1.5,0,true,false);assert.ok(constrained.end.length()>free.end.length());assert.ok(constrained.joint.toArray().every(Number.isFinite));});

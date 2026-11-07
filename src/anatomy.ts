import * as T from 'three';
import {type Pose, type V, type Limb, skeleton} from './model';

// Rendering-only proportions: the IK skeleton and versioned pose format stay unchanged.
export const anatomy = {
  clay: 0xcab9a5,
  ribcage: [0.72, 0.42] as const,
  waist: [0.43, 0.28] as const,
  pelvis: [0.61, 0.36] as const,
  neck: 0.16,
};

function ringsGeometry(rings:T.Vector3[][]):T.BufferGeometry {
  const count=rings[0].length, positions:number[]=[], indices:number[]=[];
  for(const ring of rings)for(const p of ring)positions.push(...p.toArray());
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<count;i++){
    const a=j*count+i,b=(j+1)*count+i,c=j*count+(i+1)%count,d=(j+1)*count+(i+1)%count;
    indices.push(a,b,c,b,d,c);
  }
  for(const [j,reverse] of [[0,false],[rings.length-1,true]] as const){
    const center=rings[j].reduce((sum,v)=>sum.add(v),new T.Vector3()).divideScalar(count);
    const k=positions.length/3;positions.push(...center.toArray());
    for(let i=0;i<count;i++){const a=j*count+i,b=j*count+(i+1)%count;indices.push(k,...(reverse?[b,a]:[a,b]));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.userData.ringSize=count;geometry.userData.ringCount=rings.length;return geometry;
}

function interpolateProfile(profile:V[],t:number):[number,number]{
  let i=0;while(i<profile.length-2&&t>profile[i+1][0])i++;
  const a=profile[i],b=profile[i+1],previous=profile[Math.max(0,i-1)],next=profile[Math.min(profile.length-1,i+2)];
  const span=b[0]-a[0],u=T.MathUtils.clamp((t-a[0])/span,0,1),u2=u*u,u3=u2*u;
  // Hermite tangents preserve the changing contour without horizontal bands at profile knots.
  return [1,2].map(k=>{
    const m0=(b[k]-previous[k])/(b[0]-previous[0]);
    const m1=(next[k]-a[k])/(next[0]-a[0]);
    return Math.max(.002,(2*u3-3*u2+1)*a[k]+(u3-2*u2+u)*span*m0+(-2*u3+3*u2)*b[k]+(u3-u2)*span*m1);
  }) as [number,number];
}

export function segmentGeometry(start:T.Vector3,end:T.Vector3,profile:V[]):T.BufferGeometry {
  const direction=end.clone().sub(start),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize());
  const rings:T.Vector3[][]=[];
  for(let j=0;j<=24;j++){const t=j/24,[width,depth]=interpolateProfile(profile,t);const center=start.clone().addScaledVector(direction,t);
    rings.push(Array.from({length:32},(_,i)=>{const angle=i/32*Math.PI*2;return new T.Vector3(Math.cos(angle)*width,0,Math.sin(angle)*depth).applyQuaternion(q).add(center);}));
  }
  return ringsGeometry(rings);
}

export function torsoGeometry(p:Pose):T.BufferGeometry {
  const s=skeleton(p),lower=(y:number)=>new T.Vector3(0,y,0).applyQuaternion(s.pq).add(s.hip),upper=(y:number)=>new T.Vector3(0,y,0).applyQuaternion(s.cq).add(s.neck);
  const path=new T.CatmullRomCurve3([lower(-.37),lower(.25),s.waist,upper(-.35),s.neck]);
  const profile:V[]=[[0,.10,.13],[.08,.40,.28],[.18,anatomy.pelvis[0],anatomy.pelvis[1]],[.30,.57,.34],[.43,anatomy.waist[0],anatomy.waist[1]],[.56,.52,.33],[.68,anatomy.ribcage[0],anatomy.ribcage[1]],[.79,.76,.39],[.88,.74,.32],[.95,.56,.23],[1,.18,.16]];
  const rings:T.Vector3[][]=[];
  for(let j=0;j<=48;j++){const t=j/48,[width,depth]=interpolateProfile(profile,t),center=path.getPoint(t),q=s.pq.clone().slerp(s.cq,T.MathUtils.smoothstep(t,.25,.78));
    rings.push(Array.from({length:48},(_,i)=>{
      const angle=i/48*Math.PI*2,c=Math.cos(angle),sine=Math.sin(angle);
      // Fuller back of the pelvis and a broad, shallow chest, rather than stacked ellipsoids.
      const glutes=Math.exp(-Math.pow((t-.20)/.12,2));
      const chest=Math.exp(-Math.pow((t-.74)/.15,2));
      const z=depth*sine*(sine<0?1+glutes*.22*c*c:.96)+chest*.035*sine*sine*c*c;
      return new T.Vector3(width*c,0,z).applyQuaternion(q).add(center);
    }));
  }
  return ringsGeometry(rings);
}

export function limbProfiles(limb:Limb):[V[],V[]]{
  return limb.includes('Leg')?[
    [[0,.28,.29],[.14,.34,.34],[.38,.32,.31],[.72,.25,.25],[1,.17,.18]],
    [[0,.17,.17],[.24,.23,.24],[.42,.22,.23],[.75,.14,.15],[1,.10,.115]],
  ]:[
    [[0,.20,.21],[.15,.235,.24],[.43,.20,.205],[.78,.14,.145],[1,.115,.12]],
    [[0,.115,.12],[.22,.17,.17],[.44,.16,.15],[.77,.105,.105],[1,.075,.085]],
  ];
}

// Foot local frame: +Z toes, +Y up; side=-1 left, +1 right.
export function footGeometry(side:number):T.BufferGeometry {
  const rows=[[-.25,.012,-.11,-.08],[-.21,.095,-.15,.015],[-.10,.12,-.15,.10],[0,.12,-.15,.19],[.12,.13,-.10,.17],[.28,.175,-.13,.10],[.42,.18,-.145,.045],[.51,.155,-.145,.02],[.56,.05,-.12,-.045]];
  const rings:T.Vector3[][]=[];
  // Travel from toes to heel so winding faces outwards in the foot coordinate frame.
  for(const [z,width,bottom,top] of [...rows].reverse()){
    rings.push(Array.from({length:40},(_,i)=>{const angle=i/40*Math.PI*2,c=Math.cos(angle),sine=Math.sin(angle),medial=Math.max(0,-side*c);
      const arch=Math.exp(-Math.pow((z-.10)/.14,2))*.035*medial;
      const x=width*c*(1-.12*medial*Math.exp(-Math.pow((z-.1)/.13,2)))-side*.025*Math.max(0,z)/.56;
      const y=bottom+(top-bottom)*(sine+1)/2+arch*Math.max(0,-sine);
      return new T.Vector3(x,y,z);
    }));
  }
  return ringsGeometry(rings);
}
export const toeShapes = [
  {x:-.12,z:.54,width:.052,length:.135},
  {x:-.025,z:.55,width:.037,length:.12},
  {x:.045,z:.535,width:.034,length:.105},
  {x:.105,z:.51,width:.030,length:.09},
  {x:.155,z:.48,width:.026,length:.075},
];

export function handGeometry(side:number,solid:boolean):T.BufferGeometry {
  const shape=new T.Shape();
  const points=[[-.10,0],[-.12,-.18],[-.18,-.25],[-.17,-.31],[-.12,-.30],[-.08,-.24],[-.08,-.43],[-.04,-.45],[-.01,-.29],[.01,-.46],[.05,-.46],[.06,-.28],[.09,-.43],[.13,-.42],[.12,-.25],[.16,-.36],[.20,-.33],[.14,-.14],[.10,0]];
  points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:solid?.10:.06,bevelEnabled:solid,bevelThickness:.015,bevelSize:.012,bevelSegments:3,steps:1});
  // Keep triangle winding when mirroring the left/right silhouette.
  if(side<0){geometry.scale(-1,1,1);const position=geometry.getAttribute('position');for(let i=0;i<position.count;i+=3){const b=new T.Vector3().fromBufferAttribute(position,i+1),c=new T.Vector3().fromBufferAttribute(position,i+2);position.setXYZ(i+1,c.x,c.y,c.z);position.setXYZ(i+2,b.x,b.y,b.z);}geometry.computeVertexNormals();}
  geometry.translate(0,0,solid?-.05:-.03);return geometry;
}

export function limbGeometry(start:T.Vector3,joint:T.Vector3,end:T.Vector3,limb:Limb):T.BufferGeometry {
  const upper=joint.clone().sub(start).normalize(),lower=end.clone().sub(joint).normalize();
  const extension=limb.includes('Leg')?.18:.13;
  const origin=start.clone().addScaledVector(upper,-extension),a=origin.distanceTo(joint),b=joint.distanceTo(end),total=a+b;
  const [upperProfile,lowerProfile]=limbProfiles(limb),rounding=.13,rings:T.Vector3[][]=[];
  const kneeFront=lower.clone().addScaledVector(upper,-upper.dot(lower)).negate();if(kneeFront.lengthSq()<1e-8)kneeFront.set(0,0,1);else kneeFront.normalize();
  const center=(distance:number)=>{
    if(distance<a-rounding)return origin.clone().addScaledVector(upper,distance);
    if(distance>a+rounding)return joint.clone().addScaledVector(lower,distance-a);
    const u=(distance-a+rounding)/(2*rounding),before=joint.clone().addScaledVector(upper,-rounding),after=joint.clone().addScaledVector(lower,rounding);
    return before.multiplyScalar((1-u)*(1-u)).addScaledVector(joint,2*(1-u)*u).addScaledVector(after,u*u);
  };
  let frame:T.Quaternion|undefined,previousTangent:T.Vector3|undefined;
  for(let j=0;j<=64;j++){
    const distance=total*j/64,point=center(distance);
    const tangent=center(Math.min(total,distance+.001)).sub(center(Math.max(0,distance-.001))).normalize();
    // Parallel transport prevents rings from flipping at downward-facing / bent joints.
    if(!frame){let z=new T.Vector3(0,0,1).addScaledVector(tangent,-tangent.z);if(z.lengthSq()<1e-8)z=new T.Vector3(1,0,0).addScaledVector(tangent,-tangent.x);z.normalize();const x=tangent.clone().cross(z).normalize();z=x.clone().cross(tangent).normalize();frame=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,tangent,z));}
    else frame.premultiply(new T.Quaternion().setFromUnitVectors(previousTangent!,tangent));
    previousTangent=tangent.clone();const q=frame;
    let [width,depth]=distance<a?interpolateProfile(upperProfile,Math.max(0,(distance-extension)/(a-extension))):interpolateProfile(lowerProfile,(distance-a)/b);
    if(distance<extension){const u=T.MathUtils.clamp(distance/extension,0,1),fade=.01+.99*Math.sqrt(1-(1-u)*(1-u));width*=fade;depth*=fade;}
    rings.push(Array.from({length:32},(_,i)=>{const angle=i/32*Math.PI*2;const radial=new T.Vector3(Math.cos(angle)*width,0,Math.sin(angle)*depth).applyQuaternion(q);if(limb.includes('Leg'))radial.addScaledVector(kneeFront,.025*Math.exp(-Math.pow((distance-a)/.17,2))*Math.max(0,radial.clone().normalize().dot(kneeFront)));return radial.add(point);}));
  }
  return ringsGeometry(rings);
}

/** Neutral sculpted head: cranium, facial plane, jaw and chin; +Z faces forward. */
export function headGeometry():T.BufferGeometry {
  // y, half-width, front, back. The lower face narrows into a projecting chin.
  const profile=[[-.47,.025,.13,.035],[-.435,.115,.225,-.095],[-.35,.225,.27,-.20],[-.23,.275,.245,-.29],[-.10,.31,.27,-.345],[.035,.325,.255,-.365],[.15,.325,.29,-.37],[.28,.305,.27,-.35],[.40,.245,.20,-.28],[.475,.135,.075,-.155],[.505,.012,-.035,-.055]];
  const sample=(y:number,k:number)=>{
    let i=0;while(i<profile.length-2&&y>profile[i+1][0])i++;
    const a=profile[i],b=profile[i+1],prev=profile[Math.max(0,i-1)],next=profile[Math.min(profile.length-1,i+2)];
    const span=b[0]-a[0],u=T.MathUtils.clamp((y-a[0])/span,0,1),u2=u*u,u3=u2*u;
    const m0=(b[k]-prev[k])/(b[0]-prev[0]),m1=(next[k]-a[k])/(next[0]-a[0]);
    return (2*u3-3*u2+1)*a[k]+(u3-2*u2+u)*span*m0+(-2*u3+3*u2)*b[k]+(u3-u2)*span*m1;
  };
  const gaussian=(x:number,y:number,cx:number,cy:number,rx:number,ry:number)=>Math.exp(-Math.pow((x-cx)/rx,2)-Math.pow((y-cy)/ry,2));
  const rings:T.Vector3[][]=[];
  for(let j=0;j<=64;j++){
    const y=T.MathUtils.lerp(profile[0][0],profile[profile.length-1][0],j/64),width=sample(y,1),front=sample(y,2),back=sample(y,3),center=(front+back)/2;
    rings.push(Array.from({length:64},(_,i)=>{
      const angle=i/64*Math.PI*2,s=Math.sin(angle),x=width*Math.cos(angle);
      let z=center+(s>=0?front-center:center-back)*Math.sign(s)*Math.pow(Math.abs(s),s>=0?.65:1);
      if(s>0){
        const bridge=.05*gaussian(x,y,0,.005,.045,.15),tip=.105*gaussian(x,y,0,-.12,.062,.065);
        const wings=.025*(gaussian(x,y,-.055,-.145,.035,.03)+gaussian(x,y,.055,-.145,.035,.03));
        const brow=.023*(gaussian(x,y,-.12,.09,.105,.035)+gaussian(x,y,.12,.09,.105,.035));
        const eyes=-.035*(gaussian(x,y,-.13,.025,.075,.035)+gaussian(x,y,.13,.025,.075,.035));
        const cheeks=.025*(gaussian(x,y,-.20,-.10,.075,.075)+gaussian(x,y,.20,-.10,.075,.075));
        const lips=.018*gaussian(x,y,0,-.255,.11,.04)-.010*gaussian(x,y,0,-.263,.09,.009);
        z+=(bridge+tip+wings+brow+eyes+cheeks+lips)*Math.pow(s,4);
      }
      return new T.Vector3(x,y,z);
    }));
  }
  return ringsGeometry(rings);
}

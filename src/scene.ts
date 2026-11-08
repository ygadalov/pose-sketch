import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {skeleton,limbNames,quat,vec,type Pose,type V} from './model';
import {jointSelection, jointState} from './joints';
import {anatomy,footGeometry,toeShapes,handGeometry,torsoGeometry,segmentGeometry,limbGeometry,headGeometry} from './anatomy';
export class View {
 navigation=false;dirty=true;scene=new T.Scene(); model=new T.Group(); markers=new T.Group(); selection=new T.Object3D();
 renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false});
 ortho=new T.OrthographicCamera(-5,5,5,-5,.01,200);perspective=new T.PerspectiveCamera(38,1,.01,200);camera:T.Camera=this.ortho;
 controls:OrbitControls;transform:TransformControls;mode='Скелет';overlay=false;selected='root'; pose!:Pose;grid:T.GridHelper;onCameraChange=()=>{}; onSelect=(id:string)=>{};onTransform=(_v:V,_rot:V)=>{};onStart=()=>{};onEnd=()=>{};
 constructor(public host:HTMLElement){
 this.scene.background=new T.Color('#f1f1eb');this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.domElement.setAttribute('aria-label','Рабочая область 3D. Стрелки клавиатуры перемещают камеру.');this.renderer.domElement.setAttribute('role','img');this.renderer.domElement.tabIndex=0;host.append(this.renderer.domElement);this.scene.add(this.model,this.markers);
 this.scene.add(new T.HemisphereLight(0xffffff,0x999587,2.6));const light=new T.DirectionalLight(0xffffff,3);light.position.set(4,8,5);this.scene.add(light);
 this.grid=new T.GridHelper(20,40,0xd0d1c7,0xe3e4dc);this.scene.add(this.grid);this.ortho.position.set(8,6,12);this.perspective.position.copy(this.ortho.position);
 this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,3.4,0);this.controls.enableDamping=true;this.controls.listenToKeyEvents(this.renderer.domElement);this.controls.update();
 this.controls.addEventListener('change',()=>{this.dirty=true;this.onCameraChange();});
 this.transform=new TransformControls(this.camera,this.renderer.domElement);this.transform.setSize(.85);this.scene.add(this.transform.getHelper());
 this.transform.addEventListener('dragging-changed',e=>{this.controls.enabled=!e.value;if(e.value)this.onStart();else this.onEnd();});
 this.transform.addEventListener('change',()=>{this.dirty=true;});
 this.transform.addEventListener('objectChange',()=>{this.onTransform(this.selection.position.toArray() as V,this.selection.rotation.toArray().slice(0,3).map(n=>Number(n)*180/Math.PI) as V);});
 this.scene.add(this.selection);
 let down={x:0,y:0};this.renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
 this.renderer.domElement.addEventListener('pointerup',e=>{if(this.navigation)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5||this.transform.axis)return;const rect=this.renderer.domElement.getBoundingClientRect();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);const hit=ray.intersectObjects(this.markers.children).find(h=>h.object.userData.id);if(hit)this.onSelect(hit.object.userData.id);});
 new ResizeObserver(()=>this.resize()).observe(host);this.resize();this.renderer.setAnimationLoop(()=>{const changed=this.controls.update();if(changed||this.dirty||this.transform.dragging){for(const marker of this.markers.children)if(marker.userData.billboard)marker.quaternion.copy(this.camera.quaternion);this.renderer.render(this.scene,this.camera);this.dirty=false;}});
 }
 resize(){this.dirty=true;const w=this.host.clientWidth,h=this.host.clientHeight;if(!h)return;this.renderer.setSize(w,h);const aspect=w/h;this.ortho.left=-4.6*aspect;this.ortho.right=4.6*aspect;this.ortho.top=4.6;this.ortho.bottom=-4.6;this.ortho.updateProjectionMatrix();this.perspective.aspect=aspect;this.perspective.updateProjectionMatrix();}
 clear(group:T.Group){group.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});group.clear();}
 mesh(geo:T.BufferGeometry,color:number,parent:T.Group=this.model,opacity=1){const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.8,transparent:opacity<1,opacity,depthWrite:opacity===1}));parent.add(m);return m;}
 ball(pos:T.Vector3,r:number,color:number,parent=this.model){const m=this.mesh(new T.SphereGeometry(r,16,12),color,parent);m.position.copy(pos);return m;}
 bone(a:T.Vector3,b:T.Vector3,r:number,color=0x292c2d,opacity=1){const d=b.clone().sub(a);const m=this.mesh(new T.CylinderGeometry(r*.85,r,d.length(),12),color,this.model,opacity);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
 outlined(mesh:T.Mesh){
  const edge=new T.Mesh(mesh.geometry.clone(),new T.MeshBasicMaterial({color:0x303630,side:T.BackSide}));
  edge.position.copy(mesh.position);edge.quaternion.copy(mesh.quaternion);edge.scale.copy(mesh.scale).multiplyScalar(1.045);this.model.add(edge);
 }
 ellipsoid(pos:T.Vector3,size:V,q:T.Quaternion,color:number,opacity=1){
  const m=this.mesh(new T.SphereGeometry(1,24,18),color,this.model,opacity);m.position.copy(pos);m.scale.set(...size);m.quaternion.copy(q);return m;
 }
 foot(pos:T.Vector3,q:T.Quaternion,side:number,volume:boolean,opacity:number){
  const color=volume?anatomy.clay:0xf2f2e9;
  const foot=this.mesh(footGeometry(side),color,this.model,opacity);foot.position.copy(pos);foot.quaternion.copy(q);foot.userData.anatomy='foot';
  if(!volume)this.outlined(foot);
  for(const toe of toeShapes){
   const center=new T.Vector3(toe.x*side,-.075,toe.z).applyQuaternion(q).add(pos);
   const mesh=this.ellipsoid(center,[toe.width,.065,toe.length],q,color,opacity);if(!volume)this.outlined(mesh);
  }
 }
 hand(pos:T.Vector3,q:T.Quaternion,side:number,volume:boolean,opacity:number){
  if(!volume){const palm=this.mesh(handGeometry(side,false),0xf2f2e9,this.model);palm.position.copy(pos);palm.quaternion.copy(q);palm.userData.anatomy='hand';this.outlined(palm);return;}
  const point=(x:number,y:number,z=0)=>new T.Vector3(x*side,y,z).applyQuaternion(q).add(pos);
  const palm=this.ellipsoid(point(0,-.135),[.115,.165,.057],q,anatomy.clay,opacity);palm.userData.anatomy='hand';
  const fingers=[[-.065,-.23,-.075,-.43,.029],[-.005,-.25,-.005,-.47,.030],[.055,-.235,.065,-.445,.028],[.105,-.21,.125,-.39,.024],[-.09,-.085,-.18,-.25,.037]];
  for(const [x,y,tx,ty,r] of fingers){const start=point(x,y),end=point(tx,ty,.012);this.mesh(segmentGeometry(start,end,[[0,r,r*.85],[.18,r,r*.85],[.78,r*.8,r*.75],[1,.008,.008]]),anatomy.clay,this.model,opacity);this.ellipsoid(end,[r*.65,r*.65,r*.65],q,anatomy.clay,opacity);}
 }
 update(p:Pose){
  this.dirty=true;this.pose=p;this.clear(this.model);this.clear(this.markers);
  const sk=skeleton(p),rootQ=quat(p.rotation);
  const world=(v:T.Vector3)=>v.clone().applyQuaternion(rootQ).add(vec(p.root));
  const volume=this.mode==='Объём',showSkeleton=!volume||this.overlay,opacity=volume&&this.overlay?.3:1;
  const line=(a:T.Vector3,b:T.Vector3,r=.035)=>{if(showSkeleton)this.bone(world(a),world(b),r);};
  const marker=(pos:T.Vector3,id:string)=>{
   const w=world(pos),m=this.ball(w,id==='head'?.08:.12,id===this.selected?0xd7b98b:0xbb4938,this.markers);
   if(id==='head'||(volume&&!this.overlay&&id!==this.selected))m.visible=false;
   m.userData.id=id;
   const pick=new T.Mesh(new T.SphereGeometry(.26,12,8),new T.MeshBasicMaterial({visible:false}));pick.position.copy(w);pick.userData.id=id;this.markers.add(pick);
   if(id===this.selected){const ring=new T.Mesh(new T.TorusGeometry(.23,.02,8,32),new T.MeshBasicMaterial({color:0xa77c3a,depthTest:false}));this.markers.add(ring);ring.position.copy(w);ring.quaternion.copy(this.camera.quaternion);ring.renderOrder=10;ring.userData.billboard=true;}
  };
  line(sk.hip,sk.waist);line(sk.waist,sk.neck);line(sk.limbs.leftArm.start,sk.limbs.rightArm.start);line(sk.limbs.leftLeg.start,sk.limbs.rightLeg.start);
  const headPos=sk.neck.clone().add(new T.Vector3(0,.65,0).applyQuaternion(sk.cq));
  const headQ=sk.cq.clone().multiply(quat(p.head));
  line(sk.neck,headPos.clone().add(new T.Vector3(0,-.36,0).applyQuaternion(headQ)));
  if(volume){
   const head=this.mesh(headGeometry(),anatomy.clay,this.model,opacity);head.position.copy(world(headPos));head.quaternion.copy(rootQ.clone().multiply(headQ));head.userData.anatomy='head';
  }else{
   const head=this.ellipsoid(world(headPos),[.3655,.4945,.3526],rootQ.clone().multiply(headQ),0xf5f4ef);this.outlined(head);
   this.ellipsoid(world(new T.Vector3(0,-.025,.345).applyQuaternion(headQ).add(headPos)),[.055,.075,.09],rootQ.clone().multiply(headQ),0x52584e);
  }
  if(volume){
   const torso=this.mesh(torsoGeometry(p),anatomy.clay,this.model,opacity);torso.position.copy(vec(p.root));torso.quaternion.copy(rootQ);torso.userData.anatomy='torso';
   const neckBottom=sk.neck.clone().add(new T.Vector3(0,-.07,0).applyQuaternion(sk.cq));
   const neckTop=headPos.clone().add(new T.Vector3(0,-.36,0).applyQuaternion(headQ));
   const neck=this.mesh(segmentGeometry(world(neckBottom),world(neckTop),[[0,.21,.19],[.3,anatomy.neck,.16],[1,.15,.15]]),anatomy.clay,this.model,opacity);neck.userData.anatomy='neck';
  }
  for(const name of limbNames){
   const l=sk.limbs[name],leg=name.includes('Leg'),side=name.startsWith('left')?-1:1;
   line(l.start,l.joint);line(l.joint,l.end);
   if(volume){
    const limb=this.mesh(limbGeometry(l.start,l.joint,l.end,name),anatomy.clay,this.model,opacity);limb.position.copy(vec(p.root));limb.quaternion.copy(rootQ);limb.userData.anatomy=name;
   }
   if(showSkeleton){this.ball(world(l.start),.11,0xbb4938);this.ball(world(l.joint),.085,0xbb4938);this.ball(world(l.end),.10,0xbb4938);}
   marker(l.start,`${name}:base`);marker(l.joint,`${name}:bend`);marker(l.end,name);
   const endQ=rootQ.clone().multiply(leg?sk.pq:sk.cq).multiply(quat(p.limbs[name].rotation));
   if(leg)this.foot(world(l.end),endQ,side,volume,opacity);else this.hand(world(l.end),endQ,side,volume,opacity);
  }
  if(showSkeleton)this.ball(world(sk.hip),.10,0xbb4938);
  marker(sk.hip,'pelvis');marker(sk.waist.clone().lerp(sk.neck,.5),'chest');marker(headPos,'head');marker(new T.Vector3(0,0,0),'root');this.syncSelection();
 }
 setNavigation(enabled:boolean){
  if(this.transform.dragging)this.transform.pointerUp(null);
  this.navigation=enabled;this.transform.enabled=!enabled;this.controls.enabled=true;this.markers.visible=!enabled;
  this.renderer.domElement.style.cursor=enabled?'grab':'default';
  if(enabled)this.transform.detach();else this.syncSelection();this.dirty=true;
 }
 syncSelection(){if(this.navigation){this.transform.detach();return;}if(!this.pose)return;const p=this.pose,sk=skeleton(p);let pos:T.Vector3;let rotation:V=[0,0,0];const selectedJoint=jointSelection(this.selected);if(selectedJoint){const state=jointState(p,selectedJoint.limb);pos=selectedJoint.kind==='base'?state.start:state.joint;rotation=selectedJoint.kind==='base'?state.rotation:state.forearmRotation;}else if(this.selected in p.limbs){pos=sk.limbs[this.selected as keyof typeof p.limbs].end;rotation=p.limbs[this.selected as keyof typeof p.limbs].rotation;}else{pos=this.selected==='root'?new T.Vector3():this.selected==='pelvis'?sk.hip:this.selected==='chest'?sk.waist.clone().lerp(sk.neck,.5):sk.neck.clone().add(new T.Vector3(0,.65,0).applyQuaternion(sk.cq));rotation=p[this.selected as 'rotation'] as V;if(this.selected==='root')rotation=p.rotation;}
 this.selection.position.copy(pos.clone().applyQuaternion(quat(p.rotation)).add(vec(p.root)));if(selectedJoint)this.selection.quaternion.copy(quat(p.rotation).multiply(quat(rotation)));else this.selection.rotation.set(...rotation.map(n=>n*Math.PI/180) as V);if(this.transform.getMode()==='translate'&&this.selected!=='root'&&!(this.selected in p.limbs)&&selectedJoint?.kind!=='bend')this.transform.detach();else this.transform.attach(this.selection);}
 setProjection(perspective:boolean){this.dirty=true;const old=this.camera as T.PerspectiveCamera;const next=perspective?this.perspective:this.ortho;next.position.copy(old.position);next.quaternion.copy(old.quaternion);this.camera=next;this.controls.object=next;this.transform.camera=next;this.controls.update();}
 stopCameraMotion(){const damping=this.controls.enableDamping;this.controls.enableDamping=false;this.controls.update();this.controls.enableDamping=damping;}
 angle(name:string){this.stopCameraMotion();const dirs:Record<string,number[]>={'Спереди':[0,0,14],'Сзади':[0,0,-14],'Слева':[-14,0,0],'Справа':[14,0,0],'Сверху':[0,14,.001],'¾':[9,5,12],'Изометрия':[10,10,10]};const d=dirs[name]||dirs['¾'];this.camera.position.copy(this.controls.target).add(new T.Vector3(...d as V));this.controls.update();this.camera.updateMatrixWorld(true);}
 fit(){
  this.stopCameraMotion();
  const box=new T.Box3().setFromObject(this.model),center=box.getCenter(new T.Vector3());
  this.controls.target.copy(center);this.angle('¾');this.camera.updateMatrixWorld(true);
  const projected=new T.Box3();
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])projected.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(this.camera.matrixWorldInverse));
  const size=projected.getSize(new T.Vector3()),padding=1.18;
  this.ortho.zoom=Math.min((this.ortho.right-this.ortho.left)/(Math.max(.1,size.x)*padding),(this.ortho.top-this.ortho.bottom)/(Math.max(.1,size.y)*padding));
  this.ortho.updateProjectionMatrix();
  if(this.camera===this.perspective){
   const halfV=this.perspective.fov*Math.PI/360,halfH=Math.atan(Math.tan(halfV)*this.perspective.aspect);
   const distance=(Math.max(size.y/2/Math.tan(halfV),size.x/2/Math.tan(halfH))+size.z/2)*padding;
   this.camera.position.sub(center).normalize().multiplyScalar(distance).add(center);
  }
  this.controls.update();this.dirty=true;
 }
 png():Promise<Blob>{
  const visible=this.markers.visible,helper=this.transform.getHelper(),helperVisible=helper.visible;
  this.markers.visible=false;helper.visible=false;
  try{this.renderer.render(this.scene,this.camera);return new Promise((resolve,reject)=>this.renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed')),'image/png'));}
  finally{this.markers.visible=visible;helper.visible=helperVisible;this.dirty=true;}
 }
}

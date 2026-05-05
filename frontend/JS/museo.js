/* museo.js — Motor raycaster 2.5D */
'use strict';

renderNav('museo');

// Detecta dispositivo táctil o pantalla pequeña → muestra aviso y para
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
if (isMobile) {
  document.getElementById('mobile-notice').style.display = 'flex';
  document.querySelector('.museo-layout').style.display  = 'none';
  throw new Error('mobile'); // detiene la ejecución del resto del script
}

// ── Constantes ────────────────────────────────────────────────────────────────
const MOVE_SPD   = 0.026;   // velocidad avance/retroceso
const STRAFE_SPD = 0.022;   // strafe lateral
const ROT_SPD    = 0.020;   // velocidad giro
const PLANE_LEN  = 0.66;    // plano cámara → FOV ~66°
const COL_MARGIN = 0.22;    // margen de colisión (AABB del jugador)
const MIN_PERP   = 0.40;    // distancia mínima de render → evita distorsión al acercarse
const NEAR_DIST  = 1.5;     // distancia para activar diálogo / música
const INTERACT_D = 1.5;     // distancia máxima para E
const PAINT_U0   = 0.06;    // cuadro: margen horizontal en la pared [0-1]
const PAINT_U1   = 0.94;
const PAINT_V0   = 0.04;    // cuadro: margen vertical [0-1]
const PAINT_V1   = 0.94;
const FRAME_HW   = 0.10;    // anchura del marco lateral (fracción de la cara de muro, cada lado)
const FRAME_VF   = 0.09;    // altura del marco superior/inferior (fracción de wallH)
const BOB_SPD    = 0.09;    // velocidad balanceo
const BOB_AMP    = 0;       // sin balanceo (evita distorsión visual al caminar)
const TEX_W      = 64;      // tamaño textura ladrillo
const TEX_H      = 64;
const DIALOG_SPD = 1.1;     // chars/frame typewriter

// ── DOM ───────────────────────────────────────────────────────────────────────
const canvas      = document.getElementById('game-canvas');
const ctx         = canvas.getContext('2d');
const placeholder = document.getElementById('canvas-placeholder');
const hudTitle    = document.getElementById('hud-game-title');
const hudBadge    = document.getElementById('hud-badge');

// ── Jugador ───────────────────────────────────────────────────────────────────
const player = { x:1.5, y:1.5, dirX:1, dirY:0, planeX:0, planeY:PLANE_LEN };
let bobPhase=0, bobOffset=0;

// ── Estado ────────────────────────────────────────────────────────────────────
let W=0, H=0;
let MAP=[], MAP_W=0, MAP_H=0;
let paintings=[], paintingLUT={};
let nearPainting=null;
let audio=null, audioSrc='';
let dialogIdx=0;
let expandedDialog=false;
let keys={}, eConsumed=false;
let texLight=null, texDark=null;  // texturas ladrillo

// ── Textura de ladrillo (procedural) ─────────────────────────────────────────
function makeBrickTex(shadeFactor) {
  const tc=document.createElement('canvas');
  tc.width=TEX_W; tc.height=TEX_H;
  const tctx=tc.getContext('2d');

  const bW=20, bH=10;
  // Paleta de ladrillos: tono gris-cálido con variación
  const palette=[
    `rgb(${(118*shadeFactor)|0},${(108*shadeFactor)|0},${(100*shadeFactor)|0})`,
    `rgb(${(105*shadeFactor)|0},${(96*shadeFactor)|0},${(88*shadeFactor)|0})`,
    `rgb(${(130*shadeFactor)|0},${(120*shadeFactor)|0},${(112*shadeFactor)|0})`,
    `rgb(${(112*shadeFactor)|0},${(102*shadeFactor)|0},${(94*shadeFactor)|0})`,
  ];
  const mortar=`rgb(${(60*shadeFactor)|0},${(58*shadeFactor)|0},${(65*shadeFactor)|0})`;

  // Fondo (mortero)
  tctx.fillStyle=mortar;
  tctx.fillRect(0,0,TEX_W,TEX_H);

  for (let row=0; row<TEX_H/bH+1; row++) {
    const off=(row%2)*(bW/2);
    for (let col=-1; col<TEX_W/bW+2; col++) {
      const bx=col*bW+off, by=row*bH;
      const col_idx=(row*7+col*3)%palette.length;
      tctx.fillStyle=palette[col_idx];
      tctx.fillRect(bx+1, by+1, bW-2, bH-2);
      // Sombra interior superior (da volumen)
      tctx.fillStyle='rgba(0,0,0,0.12)';
      tctx.fillRect(bx+1, by+1, bW-2, 2);
    }
  }
  return tc;
}

// ── Generación del mapa basada en el nº de juegos ────────────────────────────
function buildMap(nGames) {
  const gSize = Math.max(2, Math.ceil(Math.sqrt(Math.max(nGames, 1) * 2.5)));
  const GW=gSize, GH=gSize;
  // S=3: salas 2×2 + 1 celda de muro entre ellas → pasillos de 2 celdas de ancho
  const S=3;
  MAP_W=GW*S+1; MAP_H=GH*S+1;
  MAP=Array.from({length:MAP_H},()=>Array(MAP_W).fill(1));

  function clearRoom(gx,gy) {
    const mc=gx*S+1, mr=gy*S+1;
    MAP[mr][mc]=0; MAP[mr][mc+1]=0;
    MAP[mr+1][mc]=0; MAP[mr+1][mc+1]=0;
  }

  function carve(gx,gy) {
    [[0,-1],[1,0],[0,1],[-1,0]].sort(()=>Math.random()-.5).forEach(([dx,dy])=>{
      const nx=gx+dx, ny=gy+dy;
      if (nx<0||nx>=GW||ny<0||ny>=GH) return;
      if (MAP[ny*S+1][nx*S+1]===0) return;  // ya visitado
      // Pasillos de 2 celdas de ancho entre salas
      if      (dx=== 1) { MAP[gy*S+1][gx*S+3]=0; MAP[gy*S+2][gx*S+3]=0; }
      else if (dx===-1) { MAP[gy*S+1][nx*S+3]=0; MAP[gy*S+2][nx*S+3]=0; }
      else if (dy=== 1) { MAP[gy*S+3][gx*S+1]=0; MAP[gy*S+3][gx*S+2]=0; }
      else              { MAP[ny*S+3][gx*S+1]=0; MAP[ny*S+3][gx*S+2]=0; }
      clearRoom(nx,ny);
      carve(nx,ny);
    });
  }

  clearRoom(0,0);
  carve(0,0);

  player.x=2; player.y=2;
  player.dirX=1; player.dirY=0;
  player.planeX=0; player.planeY=PLANE_LEN;
}

// ── Colocación de cuadros ─────────────────────────────────────────────────────
function placePaintings(games) {
  const withImg=games.filter(g=>g.imagen);

  // Caras de muro adyacentes a celda caminable
  const DIRS=[[0,-1,'N'],[1,0,'E'],[0,1,'S'],[-1,0,'W']];
  const faces=[];
  for (let cy=1;cy<MAP_H-1;cy++) {
    for (let cx=1;cx<MAP_W-1;cx++) {
      if (MAP[cy][cx]===0) continue;
      for (const [dx,dy,side] of DIRS) {
        if (MAP[cy+dy]?.[cx+dx]===0)
          faces.push({cx,cy,side,fromX:cx+dx,fromY:cy+dy});
      }
    }
  }

  // Ordenar por distancia al punto de inicio (1.5, 1.5) → cuadros cerca del jugador
  faces.sort((a,b)=>{
    const da=(a.fromX-1.5)**2+(a.fromY-1.5)**2;
    const db=(b.fromX-1.5)**2+(b.fromY-1.5)**2;
    return da-db;
  });

  paintings=[];
  const usedFaces=[];
  const MIN_PAINT_D=3; // distancia Manhattan mínima entre cuadros (en celdas del mapa)
  for (let i=0;i<faces.length&&paintings.length<withImg.length;i++) {
    const f=faces[i];
    if(usedFaces.some(u=>Math.abs(u.cx-f.cx)+Math.abs(u.cy-f.cy)<MIN_PAINT_D)) continue;
    const game=withImg[paintings.length];
    const img=new Image();
    img.crossOrigin='anonymous';
    const p={game,...f,img,imgReady:false};
    img.onload=()=>{ p.imgReady=true; };
    img.onerror=()=>{ p.imgReady=false; };
    img.src=game.imagen.startsWith('http')?game.imagen:`${API_BASE}/${game.imagen}`;
    paintings.push(p);
    usedFaces.push(f);
  }
  buildLUT();
}

function buildLUT() {
  // DDA: side=0 → cruzó línea X (pared vertical) | side=1 → línea Y (pared horizontal)
  // Cara N del muro (cy,cx): rayo va hacia ↓ (stepY=+1), side=1
  // Cara S: rayo hacia ↑ (stepY=-1), side=1
  // Cara W: rayo hacia → (stepX=+1), side=0
  // Cara E: rayo hacia ← (stepX=-1), side=0
  paintingLUT={};
  for (const p of paintings) {
    const k=p.side==='N'?`${p.cx},${p.cy},1,1`:
             p.side==='S'?`${p.cx},${p.cy},1,-1`:
             p.side==='W'?`${p.cx},${p.cy},0,1`:
                          `${p.cx},${p.cy},0,-1`;
    paintingLUT[k]=p;
  }
}

// ── Utilidades canvas ─────────────────────────────────────────────────────────
function rrect(x,y,w,h,r,fill,stroke) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  if (fill)   {ctx.fillStyle=fill;   ctx.fill();}
  if (stroke) {ctx.strokeStyle=stroke; ctx.lineWidth=1.5; ctx.stroke();}
}

function wrapText(text,x,y,maxW,lineH,maxLines) {
  const words=text.split(' ');
  let line='',n=0;
  for (const w of words) {
    if (n>=maxLines) break;
    const test=line+(line?' ':'')+w;
    if (ctx.measureText(test).width>maxW&&line){
      ctx.fillText(line,x,y+n*lineH); line=w; n++;
    } else line=test;
  }
  if (n<maxLines&&line) ctx.fillText(line,x,y+n*lineH);
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const horizon=(H/2+bobOffset*H)|0;

  // Cielo oscuro
  const sky=ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,'#04040c'); sky.addColorStop(1,'#0b0b1a');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,horizon);

  // Suelo gris
  const fl=ctx.createLinearGradient(0,horizon,0,H);
  fl.addColorStop(0,'#383838'); fl.addColorStop(1,'#1c1c1c');
  ctx.fillStyle=fl; ctx.fillRect(0,horizon,W,H-horizon);

  const hits=new Array(W).fill(null);

  for (let x=0;x<W;x++) {
    const camX=2*x/W-1;
    const rdx=player.dirX+player.planeX*camX;
    const rdy=player.dirY+player.planeY*camX;

    let mx=player.x|0, my=player.y|0;
    const ddx=rdx===0?1e30:Math.abs(1/rdx);
    const ddy=rdy===0?1e30:Math.abs(1/rdy);
    let sx,sy,sdx,sdy;
    if(rdx<0){sx=-1;sdx=(player.x-mx)*ddx;}else{sx=1;sdx=(mx+1-player.x)*ddx;}
    if(rdy<0){sy=-1;sdy=(player.y-my)*ddy;}else{sy=1;sdy=(my+1-player.y)*ddy;}

    let side;
    for (let lim=0;lim<128;lim++) {
      if(sdx<sdy){sdx+=ddx;mx+=sx;side=0;}
      else       {sdy+=ddy;my+=sy;side=1;}
      if(mx<0||mx>=MAP_W||my<0||my>=MAP_H) break;
      if(MAP[my][mx]===1) break;
    }

    const perp=Math.max(MIN_PERP,side===0
      ?(mx-player.x+(1-sx)*.5)/rdx
      :(my-player.y+(1-sy)*.5)/rdy);

    const wh=(H/perp)|0;
    const y0=Math.max(0, horizon-(wh>>1));
    const y1=Math.min(H, horizon+(wh>>1));

    // Textura ladrillo
    let wallX=side===0?player.y+perp*rdy:player.x+perp*rdx;
    wallX-=Math.floor(wallX);
    const texX=(wallX*TEX_W)|0;
    const tex=side===1?texDark:texLight;
    if (tex&&y1>y0) ctx.drawImage(tex,texX,0,1,TEX_H,x,y0,1,y1-y0);

    // Niebla de profundidad
    const fog=Math.min(0.78,perp/7);
    if (fog>0.01){ctx.fillStyle=`rgba(4,4,12,${fog.toFixed(2)})`;ctx.fillRect(x,y0,1,y1-y0);}

    // ¿Hay cuadro en esta cara del muro?
    const step=side===0?sx:sy;
    const p=paintingLUT[`${mx},${my},${side},${step}`];
    if (p&&wallX>=PAINT_U0&&wallX<=PAINT_U1) {
      // Corrección de espejo: depende de la dirección del rayo y la cara golpeada
      const mirror=(side===0&&rdx<0)||(side===1&&rdy>0);
      hits[x]={p,wallX,mirror,y0,y1,wallH:wh,wallTop:horizon-(wh>>1)};
    }
  }

  // ── Paso 2: imagen del cuadro (insetada dentro del marco) ────────────────
  for (let x=0;x<W;x++) {
    const h=hits[x];
    if (!h) continue;
    const {p,wallX,wallH,wallTop}=h;
    const inU0=PAINT_U0+FRAME_HW, inU1=PAINT_U1-FRAME_HW;
    if (wallX<inU0||wallX>inU1) continue;  // columna de marco lateral → sin imagen

    const py0u=(wallTop+PAINT_V0*wallH)|0;
    const py1u=(wallTop+PAINT_V1*wallH)|0;
    const fH=Math.max(8,Math.min(40,(wallH*FRAME_VF)|0));
    const iPy0u=py0u+fH, iPy1u=py1u-fH;
    const iPy0=Math.max(0,iPy0u), iPy1=Math.min(H,iPy1u);
    const iph=iPy1-iPy0;
    if(iph<=0) continue;

    if (p.imgReady) {
      const {mirror}=h;
      const raw=(wallX-inU0)/(inU1-inU0);
      const u=mirror?1-raw:raw;
      const imgX=Math.min((u*p.img.naturalWidth)|0,p.img.naturalWidth-1);
      const totalH=iPy1u-iPy0u;
      const srcY=totalH>0?Math.max(0,((iPy0-iPy0u)/totalH*p.img.naturalHeight)|0):0;
      const srcH=totalH>0?Math.max(1,(iph/totalH*p.img.naturalHeight)|0):1;
      ctx.drawImage(p.img,imgX,srcY,1,srcH,x,iPy0,1,iph);
    } else {
      ctx.fillStyle='rgba(195,180,152,0.55)';
      ctx.fillRect(x,iPy0,1,iph);
    }
  }

  // ── Paso 3: marco con bisel ───────────────────────────────────────────────
  for (let x=0;x<W;x++) {
    const h=hits[x];
    if (!h) continue;
    const {wallX,wallH,wallTop}=h;
    const py0u=(wallTop+PAINT_V0*wallH)|0;
    const py1u=(wallTop+PAINT_V1*wallH)|0;
    const py0=Math.max(0,py0u);
    const py1=Math.min(H,py1u);
    const ph=py1-py0;
    if(ph<=0) continue;

    const fH=Math.max(8,Math.min(40,(wallH*FRAME_VF)|0));
    const inU0=PAINT_U0+FRAME_HW, inU1=PAINT_U1-FRAME_HW;

    // ── Marco lateral ─────────────────────────────────────────────────────
    if (wallX<inU0||wallX>inU1) {
      const isL=wallX<inU0;
      const t=Math.max(0,Math.min(1,isL
        ?(wallX-PAINT_U0)/FRAME_HW
        :(PAINT_U1-wallX)/FRAME_HW));
      // t=0 borde exterior, t=1 borde interior
      // Lado izquierdo: iluminado; lado derecho: en sombra
      let col;
      if      (t<0.10) col=isL?'#c8911a':'#1a0b02';  // borde ext: dorado lit / oscuro sombra
      else if (t<0.85) col=isL?'#8a5215':'#4a2809';  // cuerpo: nogal lit / oscuro
      else             col='#0d0602';                  // borde interior: oscuro
      ctx.fillStyle=col; ctx.fillRect(x,py0,1,ph);
      continue;
    }

    // ── Marco superior ────────────────────────────────────────────────────
    if (py0u>=0&&py0u<H) {
      let fy=py0u;
      const b=(col,h)=>{
        if(h<=0)return; const a=Math.max(0,fy),z=Math.min(H,fy+h);
        if(z>a){ctx.fillStyle=col;ctx.fillRect(x,a,1,z-a);} fy+=h;
      };
      b('#0d0602',1);       // borde exterior oscuro
      b('#c8911a',2);       // destello dorado (cara superior iluminada)
      b('#7c471a',fH-5);    // cuerpo del marco (nogal cálido)
      b('#2a1204',2);       // sombra interior
    }

    // ── Marco inferior ────────────────────────────────────────────────────
    if (py1u>0&&py1u<=H) {
      let fy=py1u-fH;
      const b=(col,h)=>{
        if(h<=0)return; const a=Math.max(0,fy),z=Math.min(H,fy+h);
        if(z>a){ctx.fillStyle=col;ctx.fillRect(x,a,1,z-a);} fy+=h;
      };
      b('#2a1204',2);       // sombra interior
      b('#5a2d0b',fH-3);    // cuerpo (cara inferior, más oscura)
      b('#0d0602',1);       // borde exterior oscuro
    }

    // ── Sombra proyectada debajo del cuadro ───────────────────────────────
    if (py1u>0&&py1u<H) {
      for(let i=0;i<5;i++){
        const sy=py1u+i; if(sy>=H) break;
        ctx.fillStyle=`rgba(0,0,0,${(0.40-i*0.08).toFixed(2)})`;
        ctx.fillRect(x,sy,1,1);
      }
    }
  }

  // ── Diálogo ───────────────────────────────────────────────────────────────
  if (nearPainting) {
    if (expandedDialog) renderExpandedDialog();
    else renderDialog();
  }

  // ── Mira ──────────────────────────────────────────────────────────────────
  ctx.strokeStyle='rgba(255,255,255,0.42)';
  ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(W/2-8,H/2); ctx.lineTo(W/2+8,H/2);
  ctx.moveTo(W/2,H/2-8); ctx.lineTo(W/2,H/2+8);
  ctx.stroke();
}

function renderDialog() {
  const game=nearPainting.game;
  const pad=20, bh=130;
  const bw=Math.min(W-pad*2,640);
  const bx=(W-bw)/2, by=H-bh-pad;

  rrect(bx,by,bw,bh,10,'rgba(4,4,18,0.92)','rgba(100,72,200,0.40)');

  // Título
  ctx.fillStyle='#b89fff';
  ctx.font='bold 20px monospace';
  ctx.fillText('▶  '+game.titulo, bx+16, by+28);

  // Línea separadora
  ctx.fillStyle='rgba(100,72,200,0.25)';
  ctx.fillRect(bx+16,by+37,bw-32,1);

  // Descripción typewriter (3 líneas máximo)
  const desc=(game.descripcion||'').slice(0,dialogIdx|0);
  ctx.fillStyle='#cad0dc';
  ctx.font='16px monospace';
  wrapText(desc, bx+16, by+58, bw-32, 22, 3);

  // Botón [R] Leer más — lado izquierdo del footer
  if (game.descripcion) {
    const rText='[R]  Leer más';
    ctx.font='bold 15px monospace';
    const rw=ctx.measureText(rText).width;
    rrect(bx+16,by+bh-28,rw+16,20,4,'rgba(80,50,160,0.38)',null);
    ctx.fillStyle='rgba(180,150,255,0.90)';
    ctx.fillText(rText, bx+24, by+bh-12);
  }

  // Botón [E] Ver vídeo — lado derecho del footer
  if (game.video_url&&nearPainting.canInteract) {
    const eText='[E]  Ver vídeo →';
    ctx.font='bold 15px monospace';
    const tw=ctx.measureText(eText).width;
    rrect(bx+bw-tw-26,by+bh-28,tw+16,20,4,'rgba(80,50,160,0.38)',null);
    ctx.fillStyle='rgba(180,150,255,0.90)';
    ctx.fillText(eText, bx+bw-tw-18, by+bh-12);
  }
}

function renderExpandedDialog() {
  const game=nearPainting.game;
  const pad=30;
  const bw=Math.min(W-pad*2,740);
  const bh=Math.min(H-pad*2,480);
  const bx=(W-bw)/2, by=(H-bh)/2;

  // Fondo oscuro semitransparente sobre el juego
  ctx.fillStyle='rgba(0,0,8,0.86)';
  ctx.fillRect(0,0,W,H);

  rrect(bx,by,bw,bh,12,'rgba(4,4,24,0.97)','rgba(100,72,200,0.55)');

  // Título
  ctx.fillStyle='#b89fff';
  ctx.font='bold 20px monospace';
  ctx.fillText('▶  '+game.titulo, bx+20, by+32);

  // Separador
  ctx.fillStyle='rgba(100,72,200,0.25)';
  ctx.fillRect(bx+20,by+42,bw-40,1);

  // Descripción completa
  const lineH=20;
  const contentH=bh-88;
  const maxLines=Math.floor(contentH/lineH);
  ctx.fillStyle='#cad0dc';
  ctx.font='15px monospace';
  wrapText(game.descripcion||'', bx+20, by+62, bw-40, lineH, maxLines);

  // Botón [R] Cerrar — esquina inferior derecha
  const closeText='[R]  Cerrar';
  ctx.font='bold 15px monospace';
  const tw=ctx.measureText(closeText).width;
  rrect(bx+bw-tw-30,by+bh-28,tw+20,20,4,'rgba(80,50,160,0.38)',null);
  ctx.fillStyle='rgba(180,150,255,0.90)';
  ctx.fillText(closeText, bx+bw-tw-20, by+bh-12);
}

// ── Proximidad ────────────────────────────────────────────────────────────────
function getNearPainting() {
  let best=null, bestDist=NEAR_DIST;
  for (const p of paintings) {
    const dx=p.fromX+.5-player.x, dy=p.fromY+.5-player.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if (dist>=bestDist) continue;
    // Verificar que el jugador mira hacia el muro
    const wx=p.cx-player.x, wy=p.cy-player.y;
    const wlen=Math.sqrt(wx*wx+wy*wy)+.001;
    if ((player.dirX*wx+player.dirY*wy)/wlen>0.18){
      best=p; bestDist=dist;
    }
  }
  if (best) {
    const dx=best.cx+.5-player.x, dy=best.cy+.5-player.y;
    best.canInteract=Math.sqrt(dx*dx+dy*dy)<=INTERACT_D+.5;
  }
  return best;
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function updateAudio(np) {
  if (np?.game?.musica_url) {
    const raw=np.game.musica_url;
    const src=raw.startsWith('http')?raw:`${API_BASE}/${raw}`;
    if (!audio||audioSrc!==src) {
      audio?.pause();
      audio=new Audio(src);
      audio.loop=true; audio.volume=0;
      audio.play().catch(()=>{});
      audioSrc=src;
    }
    if (audio.volume<0.70) audio.volume=Math.min(0.70,audio.volume+0.010);
  } else if (audio) {
    audio.volume=Math.max(0,audio.volume-0.010);
    if (audio.volume<=0){audio.pause();audio=null;audioSrc='';}
  }
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD(np) {
  if (np){
    hudTitle.textContent=np.game.titulo;
    hudBadge.style.display='inline';
  } else {
    hudTitle.textContent='—';
    hudBadge.style.display='none';
  }
}

// ── Colisión / movimiento ─────────────────────────────────────────────────────
function tryMove(nx,ny) {
  const m=COL_MARGIN;
  // Verificar las 4 esquinas del AABB → evita muros invisibles en esquinas
  const canX=
    MAP[Math.floor(player.y-m)]?.[Math.floor(nx-m)]===0 &&
    MAP[Math.floor(player.y+m)]?.[Math.floor(nx-m)]===0 &&
    MAP[Math.floor(player.y-m)]?.[Math.floor(nx+m)]===0 &&
    MAP[Math.floor(player.y+m)]?.[Math.floor(nx+m)]===0;
  if (canX) player.x=nx;
  const canY=
    MAP[Math.floor(ny-m)]?.[Math.floor(player.x-m)]===0 &&
    MAP[Math.floor(ny+m)]?.[Math.floor(player.x-m)]===0 &&
    MAP[Math.floor(ny-m)]?.[Math.floor(player.x+m)]===0 &&
    MAP[Math.floor(ny+m)]?.[Math.floor(player.x+m)]===0;
  if (canY) player.y=ny;
}

function rotate(ang) {
  const c=Math.cos(ang), s=Math.sin(ang);
  const dx=player.dirX, px=player.planeX;
  player.dirX  =dx*c-player.dirY*s;
  player.dirY  =dx*s+player.dirY*c;
  player.planeX=px*c-player.planeY*s;
  player.planeY=px*s+player.planeY*c;
}

// ── Update ────────────────────────────────────────────────────────────────────
function update() {
  const cos=player.dirX, sin=player.dirY;
  let nx=player.x, ny=player.y;
  let moving=false;

  if (keys['KeyW']||keys['ArrowUp'])   {nx+=cos*MOVE_SPD;   ny+=sin*MOVE_SPD;   moving=true;}
  if (keys['KeyS']||keys['ArrowDown']) {nx-=cos*MOVE_SPD;   ny-=sin*MOVE_SPD;   moving=true;}
  if (keys['KeyA'])                    {nx+=sin*STRAFE_SPD; ny-=cos*STRAFE_SPD; moving=true;}
  if (keys['KeyD'])                    {nx-=sin*STRAFE_SPD; ny+=cos*STRAFE_SPD; moving=true;}
  if (keys['ArrowLeft'])  rotate(-ROT_SPD);
  if (keys['ArrowRight']) rotate( ROT_SPD);

  tryMove(nx,ny);

  // Head bob: sube/baja suavemente al caminar
  if (moving) {
    bobPhase+=BOB_SPD;
    bobOffset=Math.sin(bobPhase)*BOB_AMP;
  } else {
    bobOffset*=0.88;
    if (Math.abs(bobOffset)<0.0005) bobOffset=0;
  }

  nearPainting=getNearPainting();

  if (nearPainting) {
    const len=(nearPainting.game.descripcion||'').length;
    if (dialogIdx<len) dialogIdx+=DIALOG_SPD;
  } else {
    dialogIdx=0;
    expandedDialog=false;
  }

  updateAudio(nearPainting);
  updateHUD(nearPainting);
}

// ── Input ─────────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if (e.code==='KeyR'&&nearPainting) {
    expandedDialog=!expandedDialog;
  }
  if (e.code==='KeyE'&&!eConsumed&&nearPainting?.canInteract&&!expandedDialog) {
    eConsumed=true;
    const raw=nearPainting.game.video_url;
    if (raw) {
      const url=raw.startsWith('http')?raw:`${API_BASE}/${raw}`;
      window.open(url,'_blank','noopener');
    }
  }
  const nav=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
  if (nav.includes(e.code)) e.preventDefault();
});

document.addEventListener('keyup',e=>{
  keys[e.code]=false;
  if (e.code==='KeyE') eConsumed=false;
});

// ── Resize ────────────────────────────────────────────────────────────────────
function resize() {
  const dpr=window.devicePixelRatio||1;
  const area=canvas.parentElement;
  const aW=area.clientWidth, aH=area.clientHeight;
  // Canvas en 4:3 exacto, centrado — barras negras laterales si la pantalla es más ancha
  let cssW, cssH;
  if(aW/aH > 4/3){cssH=aH; cssW=Math.round(cssH*4/3);}
  else            {cssW=aW; cssH=Math.round(cssW*3/4);}
  W=canvas.width =Math.round(cssW*dpr);
  H=canvas.height=Math.round(cssH*dpr);
  canvas.style.width =cssW+'px';
  canvas.style.height=cssH+'px';
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // Texturas ladrillo
  texLight=makeBrickTex(1.0);
  texDark =makeBrickTex(0.68);

  // Cargar juegos primero → tamaño del mapa depende de ellos
  let games=[];
  try {
    const res=await fetch(`${API_BASE}/api/juegos`);
    if (res.ok) games=await res.json();
  } catch(e) {
    console.warn('No se pudieron cargar los juegos:',e);
  }

  buildMap(games.length);
  resize();
  window.addEventListener('resize',resize);

  placePaintings(games);

  placeholder.style.display='none';
  canvas.style.display='block';

  requestAnimationFrame(loop);
}

init();

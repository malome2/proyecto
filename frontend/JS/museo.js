/* museo.js — Motor raycaster 2.5D */
'use strict';

renderNav('museo');

// ── Constantes ────────────────────────────────────────────────────────────────
const MOVE_SPD   = 0.026;   // velocidad avance/retroceso
const STRAFE_SPD = 0.022;   // strafe lateral
const ROT_SPD    = 0.020;   // velocidad giro
const PLANE_LEN  = 0.66;    // plano cámara → FOV ~66°
const COL_MARGIN = 0.22;    // margen de colisión
const NEAR_DIST  = 1.5;     // distancia para activar diálogo / música
const INTERACT_D = 1.5;     // distancia máxima para E
const PAINT_U0   = 0.06;    // cuadro: margen horizontal en la pared [0-1]
const PAINT_U1   = 0.94;
const PAINT_V0   = 0.04;    // cuadro: margen vertical [0-1]
const PAINT_V1   = 0.94;
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
  // Grid lo justo: al menos 3×3 espacios para 2 juegos, crece con más
  const gSize = Math.max(2, Math.ceil(Math.sqrt(Math.max(nGames, 1) * 2.5)));
  const GW=gSize, GH=gSize;
  MAP_W=GW*2+1; MAP_H=GH*2+1;
  MAP=Array.from({length:MAP_H},()=>Array(MAP_W).fill(1));

  function carve(gx,gy) {
    [[0,-1],[1,0],[0,1],[-1,0]].sort(()=>Math.random()-.5).forEach(([dx,dy])=>{
      const nx=gx+dx, ny=gy+dy;
      if (nx<0||nx>=GW||ny<0||ny>=GH) return;
      const mx=nx*2+1, my=ny*2+1;
      if (MAP[my][mx]!==1) return;
      MAP[gy*2+1+dy][gx*2+1+dx]=0;
      MAP[my][mx]=0;
      carve(nx,ny);
    });
  }
  MAP[1][1]=0;
  carve(0,0);

  player.x=1.5; player.y=1.5;
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
    img.src=`${API_BASE}/${game.imagen}`;
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

    const perp=Math.max(0.001,side===0
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
    if (p&&wallX>=PAINT_U0&&wallX<=PAINT_U1)
      hits[x]={p,wallX,y0,y1,wallH:wh,wallTop:horizon-(wh>>1)};
  }

  // ── Paso 2: imagen del cuadro ─────────────────────────────────────────────
  for (let x=0;x<W;x++) {
    const h=hits[x];
    if (!h) continue;
    const {p,wallX,wallH,wallTop}=h;
    // Usar altura real de pared (sin recortar) para que el cuadro escale correctamente al acercarse
    const py0u=(wallTop+PAINT_V0*wallH)|0;
    const py1u=(wallTop+PAINT_V1*wallH)|0;
    const py0=Math.max(0,py0u);
    const py1=Math.min(H,py1u);
    const ph=py1-py0;
    if(ph<=0) continue;

    if (p.imgReady) {
      const u=(wallX-PAINT_U0)/(PAINT_U1-PAINT_U0);
      const imgX=Math.min((u*p.img.naturalWidth)|0,p.img.naturalWidth-1);
      const totalH=py1u-py0u;
      // Recortar la muestra de imagen vertical si el cuadro sale del canvas por arriba/abajo
      const srcY=Math.max(0,((py0-py0u)/totalH*p.img.naturalHeight)|0);
      const srcH=Math.max(1,(ph/totalH*p.img.naturalHeight)|0);
      ctx.drawImage(p.img,imgX,srcY,1,srcH,x,py0,1,ph);
    } else {
      ctx.fillStyle='rgba(195,180,152,0.55)';
      ctx.fillRect(x,py0,1,ph);
    }
  }

  // ── Paso 3: marco del cuadro (borde oscuro) ───────────────────────────────
  for (let x=0;x<W;x++) {
    const h=hits[x];
    if (!h) continue;
    const {p,wallH,wallTop}=h;
    const py0u=(wallTop+PAINT_V0*wallH)|0;
    const py1u=(wallTop+PAINT_V1*wallH)|0;
    const py0=Math.max(0,py0u);
    const py1=Math.min(H,py1u);
    const ph=py1-py0;
    if(ph<=1) continue;
    const thick=Math.min(Math.max(2,(wallH*0.035)|0),ph>>1);

    ctx.fillStyle='rgba(18,10,4,0.97)';
    ctx.fillRect(x,py0,1,thick);
    ctx.fillRect(x,py1-thick,1,thick);

    const pl=x>0?hits[x-1]:null;
    if (!pl||pl.p!==p) ctx.fillRect(x,py0,1,ph);

    const pr=x<W-1?hits[x+1]:null;
    if (!pr||pr.p!==p) ctx.fillRect(x,py0,1,ph);
  }

  // ── Diálogo ───────────────────────────────────────────────────────────────
  if (nearPainting) renderDialog();

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
  const pad=20, bh=122;
  const bw=Math.min(W-pad*2,640);
  const bx=(W-bw)/2, by=H-bh-pad;

  rrect(bx,by,bw,bh,10,'rgba(4,4,18,0.92)','rgba(100,72,200,0.40)');

  // Título
  ctx.fillStyle='#b89fff';
  ctx.font='bold 17px monospace';
  ctx.fillText('▶  '+game.titulo, bx+16, by+26);

  // Línea separadora
  ctx.fillStyle='rgba(100,72,200,0.25)';
  ctx.fillRect(bx+16,by+34,bw-32,1);

  // Descripción typewriter
  const desc=(game.descripcion||'').slice(0,dialogIdx|0);
  ctx.fillStyle='#cad0dc';
  ctx.font='14px monospace';
  wrapText(desc, bx+16, by+54, bw-32, 19, 3);

  // Prompt E si hay vídeo y el jugador está suficientemente cerca
  if (game.video_url&&nearPainting.canInteract) {
    const eText='[E]  Ver vídeo →';
    ctx.font='bold 13px monospace';
    const tw=ctx.measureText(eText).width;
    rrect(bx+bw-tw-26,by+bh-26,tw+16,18,4,'rgba(80,50,160,0.38)',null);
    ctx.fillStyle='rgba(180,150,255,0.90)';
    ctx.fillText(eText, bx+bw-tw-18, by+bh-12);
  }
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
  const cy=Math.floor(player.y);
  if (MAP[cy]?.[Math.floor(nx+m)]===0 && MAP[cy]?.[Math.floor(nx-m)]===0) player.x=nx;
  const cx=Math.floor(player.x);
  if (MAP[Math.floor(ny+m)]?.[cx]===0 && MAP[Math.floor(ny-m)]?.[cx]===0) player.y=ny;
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
  }

  updateAudio(nearPainting);
  updateHUD(nearPainting);
}

// ── Input ─────────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if (e.code==='KeyE'&&!eConsumed&&nearPainting?.canInteract) {
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

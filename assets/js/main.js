const SITE_CONFIG = {
  whatsappNumber: '5548998533354'
};

const header = document.querySelector('.site-header');
const menuBtn = document.querySelector('.menu-btn');
const mobileNav = document.querySelector('.mobile-nav');
const homeView = document.querySelector('[data-view="home"]');
const menuView = document.querySelector('[data-view="menu"]');
const dockMenu = document.querySelector('.mobile-cta-dock .dock-menu');

function closeMenu(){
  if(!menuBtn || !mobileNav) return;
  menuBtn.classList.remove('active');
  mobileNav.classList.remove('open');
  menuBtn.setAttribute('aria-expanded','false');
  mobileNav.setAttribute('aria-hidden','true');
  document.body.classList.remove('menu-open');
}

window.addEventListener('scroll',()=>{
  if(header) header.classList.toggle('scrolled',window.scrollY>8);
},{passive:true});

if(menuBtn && mobileNav){
  menuBtn.addEventListener('click',()=>{
    const open=menuBtn.classList.toggle('active');
    mobileNav.classList.toggle('open',open);
    menuBtn.setAttribute('aria-expanded',String(open));
    mobileNav.setAttribute('aria-hidden',String(!open));
    document.body.classList.toggle('menu-open',open);
  });
  mobileNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape') closeMenu();});
}

function normalizedPhone(){
  return String(SITE_CONFIG.whatsappNumber||'').replace(/\D/g,'');
}
function waMessageUrl(message){
  const encoded=encodeURIComponent(message||'Olá! Gostaria de falar com a Catafesta.');
  return `https://wa.me/${normalizedPhone()}?text=${encoded}`;
}
document.querySelectorAll('.wa-action').forEach(link=>{
  link.href=waMessageUrl(link.dataset.waMessage);
});

/* One index.html, two page-like views: Home and Menu */
function targetBelongsToMenu(hash){
  if(!menuView) return false;
  if(hash==='#menu') return true;
  if(!hash || hash==='#') return false;
  const id=decodeURIComponent(hash.slice(1));
  const target=document.getElementById(id);
  return !!(target && menuView.contains(target));
}
function setDockState(isMenu){
  if(!dockMenu) return;
  const kicker=dockMenu.querySelector('.dock-kicker');
  const strong=dockMenu.querySelector('strong');
  dockMenu.href=isMenu?'#inicio':'#menu-categorias';
  if(kicker) kicker.textContent=isMenu?'VOLTAR':'VER';
  if(strong) strong.textContent=isMenu?'Início':'Menu';
}
function showRoute(hash=window.location.hash, smooth=false){
  const isMenu=targetBelongsToMenu(hash);
  if(homeView){homeView.hidden=isMenu;homeView.setAttribute('aria-hidden',String(isMenu));}
  if(menuView){menuView.hidden=!isMenu;menuView.setAttribute('aria-hidden',String(!isMenu));}
  document.body.classList.toggle('view-menu',isMenu);
  document.title=isMenu?'Menu | Catafesta Art Culinária':'Catafesta Art Culinária';
  setDockState(isMenu);
  closeMenu();

  requestAnimationFrame(()=>{
    let target=null;
    if(hash && hash!=='#menu' && hash!=='#inicio' && hash!=='#') target=document.getElementById(decodeURIComponent(hash.slice(1)));
    if(target && !target.closest('[hidden]')){
      target.scrollIntoView({behavior:smooth?'smooth':'auto',block:'start'});
    }else{
      window.scrollTo({top:0,behavior:smooth?'smooth':'auto'});
    }
  });
}

window.addEventListener('hashchange',()=>showRoute(window.location.hash,true));
document.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="#"]');
  if(!link) return;
  const href=link.getAttribute('href');
  if(href===window.location.hash){
    e.preventDefault();
    showRoute(href,true);
  }
});
showRoute(window.location.hash||'#inicio',false);

const revealEls=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}
    });
  },{threshold:0.10,rootMargin:'0px 0px -24px 0px'});
  revealEls.forEach(el=>observer.observe(el));
}else{revealEls.forEach(el=>el.classList.add('visible'));}

const year=document.getElementById('year');
if(year) year.textContent=new Date().getFullYear();

/* ===== Simple order cart ===== */
const CART_STORAGE_KEY='catafestaPedidoV2';
const CART_NAME_KEY='catafestaPedidoNomeV1';
const cartTrigger=document.querySelector('.cart-trigger');
const cartCount=document.querySelector('.cart-count');
const cartDrawer=document.querySelector('.cart-drawer');
const cartOverlay=document.querySelector('.cart-overlay');
const cartClose=document.querySelector('.cart-close');
const cartItemsEl=document.querySelector('.cart-items');
const cartEmpty=document.querySelector('.cart-empty');
const cartTotal=document.querySelector('.cart-total');
const cartName=document.querySelector('.cart-name');
const cartError=document.querySelector('.cart-error');
const cartCheckout=document.querySelector('.cart-checkout');
const cartClear=document.querySelector('.cart-clear');
const cartToast=document.querySelector('.cart-toast');
let cart=[];
let toastTimer=null;

function moneyBRL(value){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);}
function loadCart(){
  try{const saved=JSON.parse(localStorage.getItem(CART_STORAGE_KEY)||'[]');cart=Array.isArray(saved)?saved.filter(i=>i&&i.id&&i.qty>0):[];}catch(e){cart=[];}
  if(cartName){try{cartName.value=localStorage.getItem(CART_NAME_KEY)||'';}catch(e){}}
}
function saveCart(){try{localStorage.setItem(CART_STORAGE_KEY,JSON.stringify(cart));}catch(e){}}
function cartQuantity(){return cart.reduce((sum,item)=>sum+item.qty,0);}
function cartValue(){return cart.reduce((sum,item)=>sum+(Number(item.price)||0)*item.qty,0);}
function productThumb(card){const img=card.querySelector('.menu-product-media img,.product-gallery img');return img?img.getAttribute('src'):'';}
function escapeHtml(text){return String(text||'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function renderCart(){
  if(!cartItemsEl) return;
  const count=cartQuantity();
  if(cartCount) cartCount.textContent=String(count);
  if(cartTrigger){cartTrigger.classList.toggle('has-items',count>0);cartTrigger.setAttribute('aria-label',`Abrir pedido, ${count} ${count===1?'item':'itens'}`);}
  if(cartEmpty) cartEmpty.hidden=count>0;
  if(cartTotal) cartTotal.textContent=moneyBRL(cartValue());
  if(cartCheckout) cartCheckout.disabled=count===0;
  if(cartClear) cartClear.disabled=count===0;
  cartItemsEl.innerHTML=cart.map(item=>`<article class="cart-item" data-cart-id="${escapeHtml(item.id)}">
    <div class="cart-item-thumb">${item.image?`<img alt="" src="${escapeHtml(item.image)}">`:''}</div>
    <div class="cart-item-main"><h3 class="cart-item-name">${escapeHtml(item.name)}</h3><div class="cart-item-price">${escapeHtml(item.priceLabel)}</div></div>
    <div class="cart-item-actions"><div class="cart-qty"><button aria-label="Diminuir quantidade" data-cart-action="minus" type="button">−</button><span>${item.qty}</span><button aria-label="Aumentar quantidade" data-cart-action="plus" type="button">+</button></div><button class="cart-remove" data-cart-action="remove" type="button">remover</button></div>
  </article>`).join('');
}
function showCartToast(name){
  if(!cartToast) return;
  const strong=cartToast.querySelector('strong');if(strong) strong.textContent=`${name} adicionado`;
  cartToast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>cartToast.classList.remove('show'),1800);
}
function addCardToCart(card){
  if(!card) return;
  const baseId=card.id||`item-${Date.now()}`;
  const baseName=card.dataset.productName||'Produto Catafesta';
  const option=card.querySelector('.product-option');
  const selected=option?.selectedOptions?.[0];
  const optionValue=selected?.value||'';
  const optionName=selected?.dataset.cartName||'';
  const id=optionValue?`${baseId}--${optionValue}`:baseId;
  const name=optionName?`${baseName} — ${optionName}`:baseName;
  const price=selected?Number(selected.dataset.price)||0:Number(card.dataset.productPrice)||0;
  const priceLabel=selected?.dataset.cartLabel||card.dataset.productPriceLabel||moneyBRL(price);
  if(price<=0) return;
  const existing=cart.find(i=>i.id===id);
  if(existing) existing.qty+=1;
  else cart.push({id,name,price,priceLabel,image:productThumb(card),qty:1});
  saveCart();renderCart();showCartToast(name);
  const btn=card.querySelector('.add-to-cart');if(btn){btn.classList.add('just-added');const label=btn.querySelector('span');const previous=label?label.textContent:'';if(label)label.textContent='Adicionado ✓';setTimeout(()=>{btn.classList.remove('just-added');if(label)label.textContent=previous||'Adicionar';},1000);}
}
function openCart(){if(!cartDrawer||!cartOverlay)return;if(cartToast){cartToast.classList.remove('show');clearTimeout(toastTimer);}document.body.classList.add('cart-open');cartDrawer.setAttribute('aria-hidden','false');cartOverlay.hidden=false;setTimeout(()=>cartClose&&cartClose.focus(),30);}
function closeCart(){if(!cartDrawer||!cartOverlay)return;document.body.classList.remove('cart-open');cartDrawer.setAttribute('aria-hidden','true');cartOverlay.hidden=true;}
function updateCartItem(id,action){
  const item=cart.find(i=>i.id===id);if(!item)return;
  if(action==='plus')item.qty+=1;
  if(action==='minus')item.qty-=1;
  if(action==='remove'||item.qty<=0)cart=cart.filter(i=>i.id!==id);
  saveCart();renderCart();
}
function checkoutMessage(customerName){
  const lines=cart.map(item=>`${item.qty}x ${item.name} — ${item.priceLabel}`);
  return `Olá Catafesta Art Culinária! Meu nome é ${customerName} e gostaria de realizar o seguinte pedido:\n\n${lines.join('\n')}\n\nTotal = ${moneyBRL(cartValue())}\n\nGostaria de confirmar a disponibilidade, sabores e detalhes do pedido.`;
}

document.addEventListener('click',e=>{
  const add=e.target.closest('.add-to-cart');if(add){addCardToCart(add.closest('.menu-product-card'));return;}
  if(e.target.closest('.cart-trigger,.cart-open-btn')){openCart();return;}
  if(e.target.closest('.cart-close,.cart-overlay')){closeCart();return;}
  const action=e.target.closest('[data-cart-action]');if(action){const row=action.closest('.cart-item');if(row)updateCartItem(row.dataset.cartId,action.dataset.cartAction);return;}
});
if(cartClear)cartClear.addEventListener('click',()=>{cart=[];saveCart();renderCart();});
if(cartName)cartName.addEventListener('input',()=>{if(cartError)cartError.hidden=true;try{localStorage.setItem(CART_NAME_KEY,cartName.value);}catch(e){}});
if(cartCheckout)cartCheckout.addEventListener('click',()=>{
  const name=(cartName?.value||'').trim();
  if(!cart.length)return;
  if(!name){if(cartError)cartError.hidden=false;cartName?.focus();return;}
  if(cartError)cartError.hidden=true;
  const url=waMessageUrl(checkoutMessage(name));
  window.open(url,'_blank','noopener');
});


document.addEventListener('change',e=>{
  const select=e.target.closest('.product-option');
  if(!select) return;
  const card=select.closest('.menu-product-card');
  const selected=select.selectedOptions?.[0];
  const strong=card?.querySelector('.menu-price strong');
  if(strong && selected){
    const label=selected.dataset.cartLabel||selected.textContent;
    strong.textContent=label.replace(' · ',' — ');
  }
});

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('cart-open'))closeCart();});
loadCart();renderCart();

/* ===== Product image galleries ===== */
function setGallerySlide(gallery,index){
  const slides=[...gallery.querySelectorAll('[data-slide]')];
  const dots=[...gallery.querySelectorAll('[data-gallery-dot]')];
  if(!slides.length) return;
  const next=((index%slides.length)+slides.length)%slides.length;
  gallery.dataset.index=String(next);
  slides.forEach((slide,i)=>slide.classList.toggle('is-active',i===next));
  dots.forEach((dot,i)=>dot.classList.toggle('is-active',i===next));
}
document.querySelectorAll('[data-gallery]').forEach(gallery=>{
  setGallerySlide(gallery,0);
  gallery.querySelector('[data-gallery-prev]')?.addEventListener('click',()=>setGallerySlide(gallery,(Number(gallery.dataset.index)||0)-1));
  gallery.querySelector('[data-gallery-next]')?.addEventListener('click',()=>setGallerySlide(gallery,(Number(gallery.dataset.index)||0)+1));
  gallery.querySelectorAll('[data-gallery-dot]').forEach(dot=>dot.addEventListener('click',()=>setGallerySlide(gallery,Number(dot.dataset.galleryDot)||0)));
  let startX=null;
  gallery.addEventListener('touchstart',e=>{startX=e.touches?.[0]?.clientX??null;},{passive:true});
  gallery.addEventListener('touchend',e=>{
    if(startX===null) return;
    const endX=e.changedTouches?.[0]?.clientX??startX;
    const delta=endX-startX; startX=null;
    if(Math.abs(delta)>45) setGallerySlide(gallery,(Number(gallery.dataset.index)||0)+(delta<0?1:-1));
  },{passive:true});
});

/* ===== Personalized cake videos: poster + centered play, permanently muted ===== */
document.querySelectorAll('.video-inspiration-card').forEach(card=>{
  const video=card.querySelector('video');
  const button=card.querySelector('[data-video-play]');
  if(!video||!button) return;
  video.muted=true;
  video.defaultMuted=true;
  button.addEventListener('click',()=>{
    video.muted=true;
    if(video.paused){
      document.querySelectorAll('.video-inspiration-card video').forEach(other=>{if(other!==video&&!other.paused)other.pause();});
      video.play().then(()=>card.classList.add('is-playing')).catch(()=>{});
    }else{
      video.pause(); card.classList.remove('is-playing');
    }
  });
  video.addEventListener('pause',()=>card.classList.remove('is-playing'));
  video.addEventListener('ended',()=>{card.classList.remove('is-playing');video.currentTime=0;});
  video.addEventListener('volumechange',()=>{if(!video.muted) video.muted=true;});
});

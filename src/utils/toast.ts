export function showToast(message: string, type: 'info' | 'error' | 'success' = 'info', duration = 3000) {
  const existing = document.getElementById('chonmap-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'chonmap-toast';
  const bg = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#3D2B1F';
  el.style.cssText = [
    'position:fixed', 'bottom:90px', 'left:50%', 'transform:translateX(-50%)',
    `background:${bg}`, 'color:white', 'padding:10px 20px', 'border-radius:20px',
    'font-size:13px', 'font-weight:600', 'z-index:9999',
    'box-shadow:0 4px 16px rgba(0,0,0,0.3)', 'max-width:300px',
    'text-align:center', 'pointer-events:none', 'transition:opacity 0.3s',
  ].join(';');
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

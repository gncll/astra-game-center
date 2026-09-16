const loader=document.getElementById('web-loading');
const status=document.getElementById('web-status');
const retry=document.getElementById('web-retry');
let ready=false;
function failed(message){if(ready)return;status.textContent=message||'The case file could not open. Please try again.';retry.hidden=false;}
window.addEventListener('fine-print-ready',()=>{ready=true;loader.hidden=true;});
window.addEventListener('fine-print-error',e=>failed(e.detail));
window.addEventListener('error',()=>failed());
retry.addEventListener('click',()=>location.reload());
setTimeout(()=>failed('Opening is taking longer than expected. You can try again.'),25000);

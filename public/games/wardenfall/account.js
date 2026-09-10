(async()=>{
  'use strict';
  const {watchLoading}=await import('/games/loading.mjs');
  const loading=watchLoading();
  try {
    const response=await fetch('/api/session',{cache:'no-store'});
    if(!response.ok){location.replace('/login');return;}
    const data=await response.json();
    if(typeof data.user?.id!=='string'||!/^[a-f0-9-]{36}$/i.test(data.user.id))throw new Error('Invalid account');
    window.AstraGameUserId=data.user.id;
    window.AstraSilentTest=new URLSearchParams(location.search).get('silent')==='1';
    for(const name of ['audio.js','engine.js','game.js'])await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=name+'?v=1.3.0-web1';script.onload=resolve;script.onerror=reject;document.body.appendChild(script);
    });
  }catch{
    loading.fail();
  }
})();

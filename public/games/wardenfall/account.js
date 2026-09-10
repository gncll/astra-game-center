(async()=>{
  'use strict';
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
    const panel=document.createElement('div');panel.className='paused-screen';
    panel.innerHTML='<h2>Your game could not load.</h2><p>Please return to Game Center and try again.</p><a class="gold-button" href="/library">Back to Game Center</a>';
    document.querySelector('.battlefield').appendChild(panel);
  }
})();

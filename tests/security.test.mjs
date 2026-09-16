import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validMutation,validEmail,validGameId,playableGame,libraryRows} from '../lib/security.mjs';
test('mutations require an allowed origin, JSON and the request header',()=>{
 const headers=new Headers({'Origin':'https://games.example','Content-Type':'application/json','X-Astra-Request':'1'});
 assert.ok(validMutation(headers,['https://games.example']));
 headers.set('Origin','https://attacker.example');assert.equal(validMutation(headers,['https://games.example']),false);
 headers.set('Origin','https://games.example');headers.delete('X-Astra-Request');assert.equal(validMutation(headers,['https://games.example']),false);
});
test('game launch whitelist keeps unavailable cards unavailable',()=>{
 assert.equal(playableGame('wardenfall'),true);
 for(const id of ['sunset','sidewalk','pine','fine-print']){assert.equal(validGameId(id),true);assert.equal(playableGame(id),true);}
 assert.equal(playableGame('mario'),false);assert.equal(validGameId('mario'),false);
 for(const id of ['../wardenfall','WARDENFALL','unknown','__proto__','constructor',null])assert.equal(playableGame(id),false);
});
test('invalid emails are rejected before contacting the email provider',()=>{
 for(const value of ['',null,'hello','a@b','a\nb@c.com','x'.repeat(255)+'@a.com'])assert.equal(validEmail(value),false);
 assert.equal(validEmail('player@example.com'),true);
});
test('library conversion preserves independent favorites and launch dates',()=>{
 const rows=[{game_id:'wardenfall',favorite:true,last_launched_at:'2026-09-10T10:00:00Z'},{game_id:'pine',favorite:true,last_launched_at:null},{game_id:'sunset',favorite:false,last_launched_at:null},{game_id:'mario',favorite:true,last_launched_at:'2026-09-10T10:00:00Z'}];
 assert.deepEqual(libraryRows(rows),{favorites:['wardenfall','pine'],recent:{wardenfall:'2026-09-10T10:00:00Z'}});
});

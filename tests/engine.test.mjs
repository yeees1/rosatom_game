import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,pairs,shuffle} from '../engine.js';
test('16 unique, initially hidden cards and eight semantic pairs',()=>{
 const g=new Game();assert.equal(g.cards.length,16);assert.equal(new Set(g.cards.map(c=>c.id)).size,16);
 for(const p of pairs)assert.equal(g.cards.filter(c=>c.pair===p.id).length,2);
 assert.ok(g.cards.every(c=>c.hidden&&!c.matched));assert.equal(g.select(g.cards[0].id),null);
});
test('a wrong pair hides in place, locks input and transfers the turn',()=>{
 const g=new Game({players:3});g.start(1000);const order=g.cards.map(c=>c.id);
 const a=g.cards[0],b=g.cards.find(c=>c.pair!==a.pair),third=g.cards.find(c=>c.id!==a.id&&c.id!==b.id);
 assert.equal(g.select(a.id,1001).type,'first');assert.equal(a.hidden,false);assert.equal(b.hidden,true);assert.equal(g.select(a.id,1002),null);
 assert.equal(g.select(b.id,1003).type,'miss');assert.equal(g.select(third.id,1004),null);
 g.resolveMiss(2000);assert.ok(a.hidden&&b.hidden);assert.equal(g.turn,1);assert.equal(g.mistakes,1);assert.deepEqual(g.cards.map(c=>c.id),order);
 assert.equal(g.select(a.id,2001).type,'first');assert.equal(a.hidden,false);
});
test('every valid pair is collected, final victory and custom cipher letter',()=>{
 const g=new Game({players:2,letter:'К'});g.start(0);
 for(const [i,p] of pairs.entries()){const [a,b]=g.cards.filter(c=>c.pair===p.id);g.select(a.id,10+i);const r=g.select(b.id,10+i);assert.equal(r.type,'match');assert.ok(a.matched&&b.matched);}
 assert.equal(g.status,'won');assert.equal(g.moves,8);assert.equal(g.found.length,8);assert.equal(g.letter,'К');assert.equal(g.tick(500000),false);assert.equal(g.select(g.cards[0].id,10),null);
});
test('deadline blocks late matches and easy mode uses six pairs',()=>{
 const g=new Game({count:6,seconds:240});assert.equal(g.cards.length,12);g.start(1000);const [a,b]=g.cards.filter(c=>c.pair===g.pairs[0].id);
 g.select(a.id,240999);assert.equal(g.select(b.id,241000),null);assert.equal(g.status,'timeout');assert.equal(g.found.length,0);assert.equal(g.remaining(241000),0);
});
test('expiry during wrong-pair delay remains terminal',()=>{
 const g=new Game();g.start(0);const a=g.cards[0],b=g.cards.find(c=>c.pair!==a.pair);g.select(a.id,239800);g.select(b.id,239900);g.resolveMiss(241000);assert.equal(g.status,'timeout');assert.equal(g.locked,false);assert.equal(g.found.length,0);
});
test('shuffle preserves all elements without mutating input',()=>{const values=[1,2,3,4];const result=shuffle(values,()=>0);assert.deepEqual(values,[1,2,3,4]);assert.deepEqual([...result].sort(),values);assert.notDeepEqual(result,values);});

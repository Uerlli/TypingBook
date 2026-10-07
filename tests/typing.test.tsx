import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost'});
for(const k of ['window','document','HTMLElement','HTMLInputElement','Event','InputEvent','KeyboardEvent'])Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
const React=await import('react'); const {act}=React; const {createRoot}=await import('react-dom/client');
const {default:TypingArea}=await import('../src/components/TypingArea');
const {alignTyping}=await import('../src/utils/typingMetrics');
const {buildSessions,buildSentenceSessions,normalizeContent}=await import('../src/utils/sessions');
const root=createRoot(document.getElementById('root')!);let result:any;let draft=0;
async function mount(text:string,props={}){result=undefined;draft=0;await act(async()=>root.render(<TypingArea key={Math.random()} text={text} onComplete={r=>{result=r;}} onDraft={n=>draft=n} {...props}/>));}
function input(){return document.querySelector('input')!;}
async function value(v:string){await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input(),v);input().dispatchEvent(new dom.window.Event('input',{bubbles:true}));});}
async function key(k:string){await act(async()=>{input().dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));});}
async function type(text:string){for(const c of text)await value(input().value+c);}
const target='A ação, o coração e a maçã.';
await mount(target.normalize('NFD'));await type(target);assert(result);assert.equal(result.correctCharacters,target.length);assert.equal(result.accuracy,100);assert(input().disabled);assert.equal(document.querySelectorAll('.tb-caret').length,0);
await mount('ação');await value('a');await value('ac\u0327');await value('aça\u0303');await value('ação');assert(result);assert.equal(result.accuracy,100);
await mount('abc');await value('abcd');assert.equal(draft,0);assert.equal(input().value,'');await type('abx');assert(result);assert.equal(result.accuracy,67);
await mount('um dois');await type('um ');await key('Backspace');await value('um');assert.equal(input().value,'um ');assert.equal(draft,3);
await mount('casa azul');await type('caxa');await key('Backspace');await value('cax');await key('Backspace');await value('ca');await type('sa');await key('Enter');assert.equal(draft,5);assert(document.querySelector('.decoration-lime-300'));await type('azul');assert.equal(result.correctedWords,1);assert.equal(result.accuracy,100);assert.equal(result.skippedWords,0);
await mount('casa azul');await type('cax');await key('Backspace');await value('ca');await key('Enter');assert.equal(draft,5);await type('azul');assert.equal(result.skippedWords,1);assert.equal(result.consumedCharacters,6);assert.equal(result.charactersTyped,7);
await mount('um dois',{timed:true,durationMinutes:null});await type('um');const stop=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='encerrar sessão')!;await act(async()=>stop.click());assert(result);assert.equal(result.consumedCharacters,2);
const realNow=Date.now;let clock=100000;Date.now=()=>clock;
await mount('um dois',{timed:true,durationMinutes:1});await type('u');clock+=60001;await act(async()=>{await new Promise(r=>setTimeout(r,130));});assert(result);assert.equal(result.consumedCharacters,1);assert.equal(result.seconds,60);Date.now=realNow;
const book=normalizeContent('O Dr. Silva leu a pág. 3. A Sra. Ana chegou! Fim?');const phrases=buildSentenceSessions(book,1);assert.equal(phrases.length,3);assert.equal(phrases.join(''),book);assert.equal(buildSentenceSessions(book,2).length,2);
const long=Array.from({length:501},(_,i)=>`palavra${i}`).join(' ');for(const n of [100,250,500]){const chunks=buildSessions(long,n);assert.equal(chunks.join(''),long);assert.equal(chunks.length,Math.ceil(501/n));}
assert.equal(alignTyping('abx','abc').complete,true);assert.equal(alignTyping('ab','abc').counts.pending,1);assert.equal(alignTyping('ação'.normalize('NFD'),'ação').complete,true);
const {useLibrary}=await import('../src/hooks/useLibrary');
const {STORAGE_KEYS}=await import('../src/utils/localStore');
window.localStorage.setItem(STORAGE_KEYS.books,JSON.stringify([{id:'test-book',title:'Livro',completedSessions:0,totalSessions:2,avgWpm:0,currentSession:0,progress:0}]));
let library:any;
function Probe(){library=useLibrary();return null;}
await act(async()=>root.render(<Probe/>));
await act(async()=>library.updateBook('test-book',{sessionMode:'time',durationMinutes:2,readingOffset:3,contentLength:10,progress:30}));
const stored=JSON.parse(window.localStorage.getItem(STORAGE_KEYS.books)!)[0];assert.equal(stored.sessionMode,'time');assert.equal(stored.durationMinutes,2);assert.equal(stored.readingOffset,3);assert.equal(stored.progress,30);
const sample={wpm:50,rawWpm:60,accuracy:90,seconds:60,charactersTyped:3,correctCharacters:3,totalErrors:0,correctedErrors:0,uncorrectedErrors:0,substitutions:0,extraCharacters:0,missingCharacters:0,backspaces:0,patterns:[]};
await act(async()=>{library.recordSession('test-book',0,sample);library.updateBook('test-book',{readingOffset:6,progress:60});});assert.equal(library.books[0].attempts,1);assert.equal(library.books[0].readingOffset,6);assert.equal(library.books[0].avgWpm,50);
await act(async()=>root.unmount());console.log('PASS: accented completion, NFC/NFD, overflow, final errors, word lock, corrected/skipped words, free/timed finish, sentence abbreviations, all word sizes.');

dom.window.close();

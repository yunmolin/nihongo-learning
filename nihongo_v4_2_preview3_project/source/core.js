(function(root){
'use strict';
const Interactive=typeof module!=='undefined'&&module.exports?require('./learning-core.js'):root.NHLearning;
const levels=['五十音','N5','N4','N3','N2','N1'];
const domains=['五十音','文字・語彙','文法・讀解','聽解'];
const statuses=['draft','pending_review','approved','published','disabled'];
const clone=x=>JSON.parse(JSON.stringify(x));
const norm=s=>s.normalize('NFKC').replace(/\s/g,'');
const stable=x=>JSON.stringify(x&&typeof x==='object'?Array.isArray(x)?x.map(v=>JSON.parse(stable(v))):Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(stable(x[k]))])):x);
function text(v,name,max=10000){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error(name+' 必須是非空白文字，且不可超過 '+max+' 字。');return v}
function upgradeQuestion(q){
 q=clone(q);if(q.kind!==undefined)return q;
 const status={sample:'pending_review',approved:'pending_review',draft:'draft',disabled:'disabled'}[q.reviewStatus]||'draft';
 return {...q,kind:q.domain==='聽解'?'listening':q.domain==='文字・語彙'?'vocabulary':q.domain==='五十音'?'kana':/閱讀|讀解|資訊/.test(q.category)?'reading':'grammar',topics:q.topics||[q.category],courseIds:q.courseIds||[],reviewStatus:status,legacyDemo:q.reviewStatus==='sample',licenseStatus:'unverified',generationBatch:'legacy-v3',reviewRecords:[],history:[],changeLog:[{version:q.version||1,note:'從 V3 保留原 ID 匯入；內容尚未獨立審核。'}]};
}
function validateQuestion(raw){
 const q=upgradeQuestion(raw);
 for(const k of ['id','level','domain','category','difficulty','question','explanation','source','reviewStatus','kind','licenseStatus','generationBatch'])text(q[k],k);
 if(!/^[A-Za-z0-9_-]{1,80}$/.test(q.id))throw Error('題目 ID 格式錯誤。');
 if(!levels.includes(q.level)||!domains.includes(q.domain)||!statuses.includes(q.reviewStatus))throw Error('題目級別、領域或狀態錯誤。');
 if((q.level==='五十音')!==(q.domain==='五十音'))throw Error('五十音級別和領域須一致。');
 if(!['kana','vocabulary','grammar','reading','listening'].includes(q.kind))throw Error('kind 不受支援。');
 if((q.kind==='kana')!==(q.domain==='五十音')||(q.kind==='listening')!==(q.domain==='聽解')||(q.kind==='vocabulary')!==(q.domain==='文字・語彙'))throw Error('kind 與領域不一致。');
 if(!Array.isArray(q.options)||q.options.length!==4)throw Error('必須有四個選項。');
 q.options.forEach(o=>text(o,'選項',2000));if(new Set(q.options.map(norm)).size!==4)throw Error('選項不可重複。');
 if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)throw Error('答案索引須為 0～3。');
 if(!Number.isInteger(q.version)||q.version<1)throw Error('版本須為正整數。');
 for(const k of ['topics','courseIds']){if(!Array.isArray(q[k])||q[k].some(x=>typeof x!=='string'||!x.trim()))throw Error(k+' 必須是文字陣列。')}
 if(q.knowledgePointIds!==undefined&&(!Array.isArray(q.knowledgePointIds)||q.knowledgePointIds.some(x=>typeof x!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(x))||new Set(q.knowledgePointIds).size!==q.knowledgePointIds.length))throw Error('知識點 ID 格式錯誤。');
 for(const k of ['reviewRecords','history','changeLog'])if(!Array.isArray(q[k]))throw Error(k+' 必須是陣列。');
 if(q.history.length>1000||q.history.some(h=>!h||h.id!==q.id||!Number.isInteger(h.version)||h.version>=q.version||typeof h.question!=='string'||!Array.isArray(h.options)||h.options.length!==4||typeof h.explanation!=='string'))throw Error('歷史版本格式錯誤或版本順序不合法。');
 if(new Set(q.history.map(h=>h.version)).size!==q.history.length)throw Error('歷史版本重複。');
 for(const h of q.history){if(!Array.isArray(h.history)||h.history.length)throw Error('歷史快照不能巢狀保存其他歷史。');validateQuestion(h)}
 if(q.changeLog.some(r=>!r||typeof r!=='object'||!Number.isInteger(r.version)||r.version<1||r.version>q.version||typeof r.note!=='string'||!r.note.trim()))throw Error('修改紀錄格式錯誤。');
 if(q.reviewRecords.some(r=>!r||typeof r!=='object'||typeof r.type!=='string'||!r.type.trim()||!Number.isInteger(r.version)||r.version<1||r.version>q.version))throw Error('審核紀錄格式錯誤。');
 if(!['unverified','original_pending','original_confirmed','licensed'].includes(q.licenseStatus))throw Error('授權狀態錯誤。');
 if(['approved','published'].includes(q.reviewStatus)){
  if(!['original_confirmed','licensed'].includes(q.licenseStatus))throw Error('核准／發布前須確認授權。');
  if(!q.reviewRecords.some(r=>r&&r.type==='human'&&r.version===q.version&&r.japanese===true&&r.uniqueAnswer===true&&r.traditionalChinese===true&&typeof r.reviewer==='string'&&r.reviewer.trim()&&Number.isFinite(Date.parse(r.at))))throw Error('缺少此版本的人工語意與繁體中文審核紀錄。');
  if(q.kind==='listening'&&(!q.audio||q.audio.verified!==true||!q.audio.path||!q.transcript))throw Error('聽力發布前須有已驗證音檔與稿件。');
 }
 return q;
}
function validateBank(raw,existing=[],allowEmpty=false){
 if(!raw||![1,2].includes(raw.schemaVersion)||!Array.isArray(raw.questions)||(!allowEmpty&&!raw.questions.length))throw Error('題庫需包含 schemaVersion（1 或 2）與 questions 陣列。');
 if(raw.questions.length>10000)throw Error('單次最多 10,000 題。');
 const ids=new Set(existing.map(q=>q.id)),stems=new Set(existing.map(q=>q.level+'|'+norm(q.question)));
 return raw.questions.map((raw,i)=>{try{const q=validateQuestion(raw);if(ids.has(q.id))throw Error('ID 重複：'+q.id);const sig=q.level+'|'+norm(q.question);if(stems.has(sig))throw Error('同級別題幹完全重複。');ids.add(q.id);stems.add(sig);return q}catch(e){throw Error('第 '+(i+1)+' 題：'+e.message)}});
}
function similar(bank){const pairs=[],grams=s=>{const str=norm(s);return new Set(Array.from({length:Math.max(0,str.length-1)},(_,i)=>str.slice(i,i+2)))};for(let i=0;i<bank.length;i++)for(let j=i+1;j<bank.length;j++){const a=bank[i],b=bank[j];if(a.level!==b.level||a.kind!==b.kind)continue;const x=grams(a.question),y=grams(b.question);let shared=0;x.forEach(v=>{if(y.has(v))shared++});const ratio=shared/(x.size+y.size-shared||1);if(ratio>=.72)pairs.push({a:a.id,b:b.id,similarity:Math.round(ratio*100)})}return pairs}
function validateLearning(s){
 if(!s||typeof s!=='object'||Array.isArray(s)||!Array.isArray(s.attempts)||!Array.isArray(s.completed))throw Error('學習資料需包含 attempts 與 completed 陣列。');
 if(s.schemaVersion!==undefined&&![1,2].includes(s.schemaVersion))throw Error('不支援的學習資料版本。');
 if(s.attempts.length>200000||s.completed.length>10000)throw Error('學習紀錄過大。');
 if(s.interactive!==undefined)Interactive.validateProgress(s.interactive);
 const attempts=s.attempts.map(a=>{if(!a||typeof a.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(a.id)||typeof a.correct!=='boolean'||typeof a.time!=='string'||!Number.isFinite(Date.parse(a.time)))throw Error('作答紀錄缺少有效 ID、結果或時間。');if(a.selectedAnswer!==undefined&&(!Number.isInteger(a.selectedAnswer)||a.selectedAnswer<0||a.selectedAnswer>3))throw Error('作答選項錯誤。');if(a.questionVersion!==undefined&&(!Number.isInteger(a.questionVersion)||a.questionVersion<1))throw Error('作答版本錯誤。');if(a.snapshot){const q=validateQuestion(a.snapshot);if(q.id!==a.id||q.version!==a.questionVersion)throw Error('題目快照與作答紀錄不一致。')}return clone(a)});
 for(const a of attempts)if(a.attemptId!==undefined&&(typeof a.attemptId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(a.attemptId)))throw Error('作答紀錄 ID 格式錯誤。');
 if(s.completed.some(v=>typeof v!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(v)))throw Error('完成課程資料錯誤。');
 for(const key of ['favoriteIds','laterReviewIds'])if(s[key]!==undefined&&(!Array.isArray(s[key])||s[key].length>10000||s[key].some(x=>typeof x!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(x))))throw Error(key+' 格式錯誤。');
 if(s.lastCourse!=null&&(typeof s.lastCourse!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(s.lastCourse)))throw Error('上次課程 ID 錯誤。');
 if(s.courseCompletions!==undefined&&(!s.courseCompletions||typeof s.courseCompletions!=='object'||Array.isArray(s.courseCompletions)||Object.entries(s.courseCompletions).some(([k,v])=>!/^[A-Za-z0-9_-]{1,80}$/.test(k)||typeof v!=='string'||!Number.isFinite(Date.parse(v)))))throw Error('課程完成時間格式錯誤。');
 const session=s.resume;if(session){if(!Array.isArray(session.list)||!session.list.length||!Number.isInteger(session.idx)||session.idx<0||session.idx>=session.list.length||!Number.isInteger(session.score)||session.score<0||session.score>session.list.length||typeof session.answered!=='boolean')throw Error('續練紀錄錯誤。');session.list.forEach(validateQuestion);if(session.answered&&(!Array.isArray(session.shuffled)||session.shuffled.length!==4||new Set(session.shuffled.map(o=>o.i)).size!==4||session.shuffled.some(o=>!Number.isInteger(o.i)||o.i<0||o.i>3||o.text!==session.list[session.idx].options[o.i])))throw Error('續練選項紀錄錯誤。')}
 if(session&&(session.score>session.idx+(session.answered?1:0)||(session.answered&&(!Number.isInteger(session.selected)||session.selected<0||session.selected>3))))throw Error('續練結果或選項索引錯誤。');
 if(session&&new Set(session.list.map(q=>q.id)).size!==session.list.length)throw Error('續練題目重複。');
 if(session&&session.answerLog!==undefined&&(!Array.isArray(session.answerLog)||session.answerLog.length!==session.idx+(session.answered?1:0)||session.answerLog.some((a,i)=>!a||a.id!==session.list[i].id||typeof a.correct!=='boolean')||session.answerLog.filter(a=>a.correct).length!==session.score))throw Error('續練作答歷程與進度不一致。');
 return {...clone(s),schemaVersion:2,attempts,completed:[...new Set(s.completed)],resume:session?clone(session):null};
}
function mergeLearning(a,b){a=validateLearning(a);b=validateLearning(b);const m=new Map;for(const x of [...a.attempts,...b.attempts]){const key=x.attemptId||[x.id,x.questionVersion||1,x.time,x.correct,x.selectedAnswer??''].join('|');if(x.attemptId&&m.has(key)&&stable(m.get(key))!==stable(x))throw Error('相同作答 ID 內容衝突：'+key);m.set(key,x)}const courseCompletions={...(b.courseCompletions||{}),...(a.courseCompletions||{})};for(const[k,v]of Object.entries(b.courseCompletions||{}))if(!courseCompletions[k]||Date.parse(v)>Date.parse(courseCompletions[k]))courseCompletions[k]=v;return {...a,...(a.interactive!==undefined||b.interactive!==undefined?{interactive:Interactive.mergeProgress(a.interactive,b.interactive)}:{}),attempts:[...m.values()].sort((x,y)=>Date.parse(x.time)-Date.parse(y.time)),completed:[...new Set([...a.completed,...b.completed])],favoriteIds:[...new Set([...(a.favoriteIds||[]),...(b.favoriteIds||[])])],laterReviewIds:[...new Set([...(a.laterReviewIds||[]),...(b.laterReviewIds||[])])],courseCompletions,lastCourse:a.lastCourse||b.lastCourse||null,resume:a.resume||b.resume||null}}
function revisionContent(q){return Object.fromEntries(Object.entries(q).filter(([k])=>!['reviewStatus','reviewRecords','changeLog','legacyDemo'].includes(k)))}
function mergedHistory(old,q){const versions=new Map;for(const snapshot of [...old.history,...q.history,{...clone(old),history:[]}]){const item={...clone(snapshot),history:[]},previous=versions.get(item.version);versions.set(item.version,previous?mergeBank([previous],[item])[0]:item)}return [...versions.values()].sort((a,b)=>a.version-b.version)}
function mergeBank(current,incoming){const next=current.map(clone);for(const q of incoming){const index=next.findIndex(x=>x.id===q.id);if(index<0){if(next.some(x=>x.level===q.level&&norm(x.question)===norm(q.question)))throw Error('題幹與現有題庫重複。');next.push(q);continue}const old=next[index];if(stable(old)===stable(q))continue;if(q.version===old.version&&stable(revisionContent(old))===stable(revisionContent(q))){const prefix=(a,b)=>a.length<=b.length&&stable(a)===stable(b.slice(0,a.length));if(prefix(q.changeLog,old.changeLog)&&prefix(q.reviewRecords,old.reviewRecords)&&q.changeLog.length<old.changeLog.length)continue;if(!prefix(old.changeLog,q.changeLog)||!prefix(old.reviewRecords,q.reviewRecords)||(old.reviewStatus!==q.reviewStatus&&q.changeLog.length<=old.changeLog.length))throw Error(q.id+' 審核歷程衝突，拒絕覆蓋。');next[index]={...q,legacyDemo:old.legacyDemo===true&&q.legacyDemo===true};continue}if(q.version<=old.version)throw Error(q.id+' 內容衝突：修改須使用更高版本。');if(next.some((x,j)=>j!==index&&x.level===q.level&&norm(x.question)===norm(q.question)))throw Error('修改後題幹重複。');next[index]={...q,history:mergedHistory(old,q),legacyDemo:false};}return next}
function derived(s,now=new Date()){
 const map=Object.create(null);for(const a of s.attempts){const x=map[a.id]||{attempts:0,correct:0,wrong:0,streak:0};x.attempts++;a.correct?x.correct++:x.wrong++;x.streak=a.correct?x.streak+1:0;x.lastPracticed=a.time;x.mastery=Math.min(100,x.streak*25);const days=a.correct?[1,3,7,14,30][Math.min(4,x.streak-1)]:1;x.nextReview=new Date(Date.parse(a.time)+days*86400000).toISOString();x.lastCorrect=a.correct;map[a.id]=x}return map;
}
function today(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
function isPlayable(q,demo){return q.kind!=='listening'&&(q.reviewStatus==='published'||(demo&&q.legacyDemo&&q.reviewStatus==='pending_review'))}
function transaction(store,updates){const old=Object.fromEntries(Object.keys(updates).map(k=>[k,store.getItem(k)]));const journal='nihongo-v4-transaction';if(store.getItem(journal))throw Error('有待復原交易，請先重新載入。');store.setItem(journal,JSON.stringify({old}));try{for(const [k,v]of Object.entries(updates))store.setItem(k,v);store.removeItem(journal)}catch(e){try{for(const[k,v]of Object.entries(old)){if(v===null)store.removeItem(k);else store.setItem(k,v)}store.removeItem(journal)}catch{throw Error('儲存失敗，復原日誌已保留；請勿清除瀏覽器資料，重新開啟後重試。')}throw Error('儲存失敗，原資料已保留：'+e.message)}}
function recover(store){const raw=store.getItem('nihongo-v4-transaction');if(!raw)return;const j=JSON.parse(raw);if(!j||!j.old||typeof j.old!=='object'||Array.isArray(j.old)||!Object.keys(j.old).length||Object.keys(j.old).some(k=>!['nihongo-learning-v4','nihongo-bank-v4','nihongo-management-v41'].includes(k))||Object.values(j.old).some(v=>v!==null&&typeof v!=='string'))throw Error('交易復原日誌不合法，原資料未修改。');for(const[k,v]of Object.entries(j.old)){if(v===null)store.removeItem(k);else store.setItem(k,v)}store.removeItem('nihongo-v4-transaction')}
const api={levels,domains,statuses,clone,stable,norm,validateQuestion,validateBank,validateLearning,mergeLearning,mergeBank,similar,derived,today,isPlayable,transaction,recover,upgradeQuestion};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NHCore=api;
})(typeof globalThis==='undefined'?this:globalThis);

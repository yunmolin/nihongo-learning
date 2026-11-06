// One-time extraction from preserved V3; do not regenerate after manual compat edits.
const fs=require('fs'),path=require('path');const base=path.resolve(__dirname,'..');let html=fs.readFileSync(path.join(base,'previous/nihongo_v3.html'),'utf8');let code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
code=code.slice(0,code.indexOf("try { go('home'); }"));
code=code.replace(/const kana=[\s\S]*?const KEY='nihongo-mvp-v1';let state;[\s\S]*?let session=null;/,'const kana=AppData.kana.hira;const katakana=AppData.kana.kata;const questions=[];\nconst KEY="nihongo-learning-v4";let state=NHStorage.loadLearning();\nlet session=null;');
code=code.replace(/const save=\(\)=>\{[\s\S]*?\};const esc=/,'let save=()=>NHStorage.saveLearning(state);const esc=');
code=code.replace("const BANK_KEY='nihongo-question-bank-v3';","const BANK_KEY='nihongo-bank-v4';");
code=code.replace(/const EXTRA=[\s\S]*?const DOMAINS=/,'const EXTRA=[];\nconst DOMAINS=');
code=code.replace(/const BUILTIN=[\s\S]*?let bankError=/,'const BUILTIN=AppData.bank.questions;\nlet bankError=');
code=code.replace(/function validateBank\(raw,existing=\[\]\)\{[\s\S]*?let filters=/,`function validateBank(raw,existing=[]){const incoming=NHCore.validateBank(raw);NHCore.mergeBank(existing,incoming);return incoming}\nlet custom=NHStorage.loadBank(BUILTIN);\nquestions.splice(0,questions.length,...NHCore.mergeBank(BUILTIN,custom));\nconst available=()=>questions.filter(q=>NHCore.isPlayable(q,true));\nconst statusName=s=>({draft:'草稿',pending_review:'待審核',approved:'已核准',published:'已發布',disabled:'已停用'}[s]||s);\nlet filters=`);
code=code.replaceAll("alert('此瀏覽器不支援語音播放')","NHStorage.notice('此瀏覽器不支援語音播放')");
fs.writeFileSync(path.join(base,'source/v3-compat.js'),code);
html=html.replace(/<script>[\s\S]*?<\/script>/,'<!-- APP_BUNDLE -->').replace('V3 · 正式題庫系統','V4 預覽 · V3 穩定化').replace('<div id="content"','<div id="content" tabindex="-1"').replace('<main>','<main><div id="app-notices" class="hidden" role="status" style="white-space:pre-wrap"></div>');
html=html.replace('<!-- APP_BUNDLE -->','<!-- APP_BUNDLE -->');
fs.writeFileSync(path.join(base,'source/shell.html'),html);
console.log('Extracted V3 UI and behavior into source/v3-compat.js');

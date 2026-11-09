const fs=require('fs'),vm=require('vm'),path=require('path');
const src=['cultures.js','eras.js','engine.js'].map(f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8')).join('\n');
const ctx={module:{exports:{}},console,Date,Math,JSON};vm.createContext(ctx);vm.runInContext(src,ctx);
module.exports=ctx.module.exports;

"""Build the user-facing botanical demo deck; no user data is used."""
import sqlite3,json,zipfile,tempfile,pathlib,time,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
now=int(time.time())
base=1730800000000
basic={'id':base,'name':'问答','type':0,'mod':now,'usn':-1,'sortf':0,'did':base,'tmpls':[{'name':'卡片 1','ord':0,'qfmt':'<div class="topic">{{Front}}</div>','afmt':'{{FrontSide}}<hr id="answer"><div class="answer">{{Back}}</div>','did':None,'bqfmt':'','bafmt':''}],'flds':[{'name':'Front','ord':0,'sticky':False,'rtl':False,'font':'Arial','size':20},{'name':'Back','ord':1,'sticky':False,'rtl':False,'font':'Arial','size':20}],'css':'.card {font-family: -apple-system, "PingFang SC", sans-serif; color:#234534; text-align:center; font-size:22px; line-height:1.8;} .topic{padding:20px 0;font-weight:500}.answer{font-size:18px;color:#516747} small{display:block;font-size:13px;color:#71816c;margin-top:12px} .cloze{color:#4e7437;font-weight:bold}','latexPre':'','latexPost':'','latexsvg':False,'req':[[0,'any',[0]]],'tags':[],'vers':[]}
cloze=json.loads(json.dumps(basic));cloze.update({'id':base+1,'name':'填空','type':1})
cloze['flds'][0]['name']='Text';cloze['flds'][1]['name']='Extra'
cloze['tmpls'][0].update({'qfmt':'{{cloze:Text}}','afmt':'{{cloze:Text}}<br><small>{{Extra}}</small>'})
cloze['req']=[]
decks={str(base):{'id':base,'name':'植物的日常','mod':now,'usn':-1,'desc':'拾卡原创示例','dyn':0,'collapsed':False,'conf':1,'extendNew':0,'extendRev':0},str(base+1):{'id':base+1,'name':'植物的日常::叶与光','mod':now,'usn':-1,'desc':'','dyn':0,'collapsed':False,'conf':1,'extendNew':0,'extendRev':0}}
content=[
('叶片为什么是绿色的？','叶绿素主要吸收红光与蓝紫光，反射和透过的绿光较多。<small>叶片的颜色来自光与色素的相遇。</small>',['叶片','基础'],False,base+1),
('光合作用发生在哪里？','主要发生在叶肉细胞的叶绿体中。',['光合作用','基础'],False,base+1),
('叶片上的气孔有什么作用？','调节二氧化碳、氧气和水蒸气的交换。<small>气孔的开合受保卫细胞调节。</small>',['叶片'],False,base+1),
('植物的水分主要通过{{c1::木质部}}向上运输。','韧皮部主要运输光合作用形成的有机物。',['运输','填空'],True,base),
('什么是蒸腾作用？','水分以水蒸气形式从植物体表散失到大气中的过程。<small>大部分蒸腾通过叶片气孔进行。</small>',['叶片','水分'],False,base+1),
('根尖的根毛有什么作用？','增大根与土壤的接触面积，有利于吸收水和无机盐。',['根','基础'],False,base),
('银杏属于被子植物吗？','不属于。银杏是裸子植物，种子没有果皮包被。',['分类'],False,base),
('花的哪一部分通常发育成果实？','子房通常发育成果实，胚珠发育成种子。',['花与果实'],False,base),
('仙人掌的刺是什么结构变来的？','叶片。叶片退化为刺，绿色的茎承担主要光合作用。',['适应'],False,base),
('植物细胞壁的主要成分包括{{c1::纤维素}}。','细胞壁提供支持与保护。',['细胞','填空'],True,base),
('为什么有些叶片在秋天变黄？','叶绿素分解后，原有的类胡萝卜素颜色更容易显现。',['叶片','色素'],False,base+1),
('种子萌发通常需要哪些环境条件？','适量的水分、充足的空气和适宜的温度。<small>不同植物对光照的要求有所不同。</small>',['种子','基础'],False,base)
]
with tempfile.TemporaryDirectory() as temp:
    dbpath=pathlib.Path(temp)/'collection.anki2';db=sqlite3.connect(dbpath)
    db.executescript('''CREATE TABLE col(id integer primary key,crt integer,mod integer,scm integer,ver integer,dty integer,usn integer,ls integer,conf text,models text,decks text,dconf text,tags text);
CREATE TABLE notes(id integer primary key,guid text,mid integer,mod integer,usn integer,tags text,flds text,sfld integer,csum integer,flags integer,data text);
CREATE TABLE cards(id integer primary key,nid integer,did integer,ord integer,mod integer,usn integer,type integer,queue integer,due integer,ivl integer,factor integer,reps integer,lapses integer,left integer,odue integer,odid integer,flags integer,data text);
CREATE TABLE revlog(id integer primary key,cid integer,usn integer,ease integer,ivl integer,lastIvl integer,factor integer,time integer,type integer);
CREATE TABLE graves(usn integer,oid integer,type integer);
CREATE INDEX ix_notes_usn on notes(usn);CREATE INDEX ix_cards_usn on cards(usn);CREATE INDEX ix_cards_nid on cards(nid);CREATE INDEX ix_cards_sched on cards(did,queue,due);CREATE INDEX ix_revlog_usn on revlog(usn);CREATE INDEX ix_revlog_cid on revlog(cid);CREATE INDEX ix_notes_csum on notes(csum);''')
    db.execute('INSERT INTO col VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',(1,now,now*1000,now*1000,11,0,0,0,'{}',json.dumps({str(base):basic,str(base+1):cloze}),json.dumps(decks),'{}','{}'))
    for i,(front,back,tags,iscloze,did) in enumerate(content):
        nid=base+100+i;checksum=int(hashlib.sha1(front.encode()).hexdigest()[:8],16)
        db.execute('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)',(nid,f'shika-{i}',base+int(iscloze),now,-1,' '+' '.join(tags)+' ',front+'\x1f'+back,front,checksum,0,''))
        db.execute('INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(base+200+i,nid,did,0,now,-1,0,0,i+1,0,2500,0,0,0,0,0,0,''))
    db.commit();db.close()
    with zipfile.ZipFile(root/'dist/sample.apkg','w',zipfile.ZIP_DEFLATED) as archive:
        archive.write(dbpath,'collection.anki2');archive.writestr('media','{}')
print('Created botanical sample: 12 cards')

from PIL import Image, ImageDraw, ImageFont
F="/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
W,H=1200,440
img=Image.new("RGB",(W,H)); d=ImageDraw.Draw(img)
# sky gradient
for y in range(H):
    t=y/H
    r=int(74+ (150-74)*t); g=int(160+(205-160)*t); b=int(235+(246-235)*t)
    d.line([(0,y),(W,y)],fill=(r,g,b))
def cloud(cx,cy,s):
    col=(255,255,255)
    for dx,dy,rr in [(-40,0,30),(-10,-12,38),(28,-4,30),(60,4,26),(10,12,34)]:
        d.ellipse([cx+dx*s-rr*s,cy+dy*s-rr*s,cx+dx*s+rr*s,cy+dy*s+rr*s],fill=col)
cloud(150,90,1.0); cloud(1000,80,1.1); cloud(650,60,0.8)
# ground
gy=H-96
d.rectangle([0,gy,W,gy+20],fill=(96,178,54))         # grass top
d.rectangle([0,gy+20,W,H],fill=(198,120,40))          # dirt
for x in range(0,W,44):                                 # dirt texture
    d.rectangle([x,gy+20,x+2,H],fill=(170,98,30))
for x in range(22,W,44):
    d.rectangle([x,gy+56,x+2,H],fill=(170,98,30))
# grass tufts
def bush(cx):
    col=(96,178,54)
    for dx,rr in [(-26,20),(-6,28),(20,22)]:
        d.ellipse([cx+dx-rr,gy-rr,cx+dx+rr,gy+rr],fill=col)
bush(90); bush(1130)
# green pipe (right)
px=1040; pw=120
d.rectangle([px-14,gy-70,px+pw+14,gy-46],fill=(70,170,60))   # rim
d.rectangle([px-14,gy-70,px+pw+14,gy-46],outline=(30,110,40),width=4)
d.rectangle([px,gy-46,px+pw,gy],fill=(84,190,72))            # body
d.rectangle([px,gy-46,px+pw,gy],outline=(30,110,40),width=4)
d.rectangle([px+12,gy-42,px+30,gy-4],fill=(150,225,140))     # highlight
# question block
def qblock(x,y,sz=56):
    d.rounded_rectangle([x,y,x+sz,y+sz],radius=6,fill=(240,180,30),outline=(150,95,10),width=4)
    for cx,cy in [(x+8,y+8),(x+sz-8,y+8),(x+8,y+sz-8),(x+sz-8,y+sz-8)]:
        d.ellipse([cx-3,cy-3,cx+3,cy+3],fill=(150,95,10))
    f=ImageFont.truetype(F,int(sz*0.66)); tw=d.textlength("?",font=f)
    d.text((x+(sz-tw)/2,y+sz*0.10),"?",font=f,fill=(255,255,255))
def brick(x,y,sz=56):
    d.rectangle([x,y,x+sz,y+sz],fill=(150,74,30),outline=(90,45,18),width=3)
    d.line([(x,y+sz//2),(x+sz,y+sz//2)],fill=(90,45,18),width=3)
    d.line([(x+sz//2,y),(x+sz//2,y+sz//2)],fill=(90,45,18),width=3)
    d.line([(x+sz//4,y+sz//2),(x+sz//4,y+sz)],fill=(90,45,18),width=3)
    d.line([(x+3*sz//4,y+sz//2),(x+3*sz//4,y+sz)],fill=(90,45,18),width=3)
by=gy-150
qblock(150,by); brick(360,by); qblock(416,by); brick(472,by)
qblock(300,by-120)
# text panel (translucent rounded) center
panel=Image.new("RGBA",(W,H),(0,0,0,0)); pd=ImageDraw.Draw(panel)
pw2,ph2=760,250; pxc=(W-pw2)//2; pyc=70
pd.rounded_rectangle([pxc,pyc,pxc+pw2,pyc+ph2],radius=28,fill=(20,28,40,205),outline=(255,214,0,255),width=5)
img=Image.alpha_composite(img.convert("RGBA"),panel).convert("RGB"); d=ImageDraw.Draw(img)
f_top=ImageFont.truetype(F,46); f_big=ImageFont.truetype(F,104); f_bot=ImageFont.truetype(F,40)
def ctext(txt,f,y,fill):
    tw=d.textlength(txt,font=f); d.text(((W-tw)/2,y),txt,font=f,fill=fill)
ctext("인테리어 배관 설비 · 담다",f_top,pyc+26,(255,214,0))
ctext("010-5863-4044",f_big,pyc+82,(255,255,255))
ctext("▶ 여기를 눌러 전화 상담",f_bot,pyc+198,(210,235,255))
img.save("img/cta.png","PNG"); print("cta.png saved", img.size)

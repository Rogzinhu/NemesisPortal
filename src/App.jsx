import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, setDoc, deleteDoc, getDoc, updateDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from 'firebase/auth';
import { 
  Book, LayoutDashboard, LogOut, Plus, Trash2, 
  Users, Home, MessageSquare, AlertTriangle,
  Camera, Settings, Loader2, Palette, Lock, Link as LinkIcon, ImageIcon, User, Globe, ChevronRight, ArrowLeft, Edit3, Sparkles, Send, BrainCircuit, Activity,
  Twitter, Youtube, Twitch, MessageCircle, UserCircle,
  Heart, Download, X, Edit2
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDhATgpXHx05KdkxKvvdyoCGLem8875_4k",
  authDomain: "nemesis-portal.firebaseapp.com",
  projectId: "nemesis-portal",
  storageBucket: "nemesis-portal.firebasestorage.app",
  messagingSenderId: "866418817027",
  appId: "1:866418817027:web:87a7fc61ad596ca9d27636",
  measurementId: "G-BXC92BNY27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'nemesis-2-app';

// --- GEMINI API CONFIG ---
const GEMINI_API_KEY = "AIzaSyCx3iWFtwKdlMF3PO_7NHhYioSxq-MmKxU"; 
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

// --- SUB-COMPONENTES AUXILIARES ---

const TikTokIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const DesktopNavBtn = ({ active, onClick, Icon, label }) => (
  <button onClick={onClick} className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all duration-300 overflow-hidden group ${active ? 'scale-105' : 'text-gray-500 hover:text-white hover:scale-105 active:scale-95'}`}>
      <div className={`absolute inset-0 transition-opacity duration-300 rounded-xl ${active ? 'bg-yellow-500/10 opacity-100' : 'bg-white/5 opacity-0 group-hover:opacity-100'}`}></div>
      <Icon size={16} className={`relative z-10 transition-all duration-300 ${active ? 'text-yellow-400 drop-shadow-[0_0_8px_#facc15]' : 'text-gray-500 group-hover:text-white'}`} /> 
      <span className={`relative z-10 transition-colors duration-300 ${active ? 'text-yellow-400 drop-shadow-[0_0_5px_#facc15]' : ''}`}>{label}</span>
      {active && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-yellow-400 shadow-[0_0_12px_#facc15] rounded-t-full"></div>}
  </button>
);

const MobileNavBtn = ({ active, onClick, Icon, label }) => (
  <button onClick={onClick} className={`relative flex flex-col items-center gap-1.5 transition-all duration-300 transform active:scale-90 p-2 ${active ? 'text-yellow-400 scale-110 drop-shadow-[0_0_12px_#facc15]' : 'text-gray-600 hover:text-gray-300'}`}>
    <Icon size={24} className={active ? 'animate-float' : ''} />
    <span className="text-[7px] font-black uppercase tracking-[0.2em]">{label}</span>
    {active && <div className="absolute -bottom-2 w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_8px_#facc15]"></div>}
  </button>
);

const LoreChapter = ({ num, title, children }) => (
  <section className="glass-panel p-10 rounded-[3rem] border border-white/5 shadow-2xl hover:border-yellow-500/30 transition-all duration-500 relative overflow-hidden group hover:shadow-[0_0_40px_rgba(250,204,21,0.05)] hover:-translate-y-1">
    <div className="absolute -top-10 -left-10 text-[180px] font-black text-white/[0.01] italic select-none group-hover:text-yellow-500/5 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-3 origin-top-left">{num}</div>
    <div className="relative z-10 flex items-center gap-8 mb-8">
      <span className="text-7xl font-black text-white/[0.05] italic leading-none group-hover:text-yellow-500/20 transition-colors duration-500">{num}</span>
      <h3 className="text-3xl font-black text-yellow-500 uppercase italic tracking-tighter group-hover:translate-x-3 transition-transform duration-500 drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]">{title}</h3>
    </div>
    <p className="relative z-10 text-gray-400 leading-[2.2] font-medium text-justify border-l-4 border-white/10 pl-10 text-xl group-hover:text-gray-200 group-hover:border-yellow-500/50 transition-all duration-500">{children}</p>
  </section>
);

const TeamSection = ({ color, name, players, reverse, isMobile, onPlayerClick }) => (
  <div className={`flex flex-col ${reverse ? 'lg:items-end lg:text-right' : 'lg:items-start'} space-y-12`}>
    <div className={reverse ? 'text-right' : 'text-left'}>
       <div className={`h-1.5 w-24 rounded-full mb-5 shadow-lg ${reverse ? 'ml-auto' : ''} transition-all duration-700 ease-out hover:w-40`} style={{ backgroundColor: color, boxShadow: `0 0 25px ${color}` }}></div>
       <h2 className="font-black italic uppercase tracking-tighter leading-none transition-all duration-500 hover:scale-105 cursor-default drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:drop-shadow-[0_0_30px_var(--team-color)]" style={{color, fontSize: isMobile ? '3rem' : '5rem', '--team-color': color}}>{name}</h2>
       <p className="text-gray-700 uppercase font-black tracking-[0.8em] text-[10px] mt-4 italic opacity-50 flex items-center gap-2 justify-end">
          {!reverse && <span className="w-8 h-[1px] bg-gray-700"></span>} Lords Registados {reverse && <span className="w-8 h-[1px] bg-gray-700"></span>}
       </p>
    </div>
    <div className={`grid w-full gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
      {players.length === 0 ? <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-3xl font-black uppercase text-[10px] text-gray-800 tracking-widest glass-panel">Nação a aguardar Lordes ativos</div> : 
        players.map((p, i) => (
        <div key={p.id} onClick={() => onPlayerClick(p)} className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border-b-4 font-black italic text-2xl shadow-2xl flex items-center justify-between group overflow-hidden relative transition-all duration-500 hover:-translate-y-3 cursor-pointer hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)]" style={{ borderBottomColor: color, animationDelay: `${i * 100}ms` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--team-color)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{'--team-color': color}}></div>
          <div className="relative z-10 flex items-center gap-4">
             <div className="relative">
               <img src={p.photoUrl || 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop'} className="w-12 h-12 rounded-full object-cover border-2 border-white/10 group-hover:border-[var(--team-color)] transition-all duration-500 group-hover:shadow-[0_0_15px_var(--team-color)] relative z-10" alt={p.name} style={{'--team-color': color}} />
             </div>
             <span className="relative z-10 truncate text-white/80 group-hover:text-white transition-colors tracking-tight">{p.name}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SideCard = ({ color, name, desc }) => (
  <div className="glass-panel p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-5 group hover:border-[var(--card-color)]/30 transition-all duration-500 overflow-hidden relative hover:shadow-[0_0_40px_rgba(0,0,0,0.8)] hover:-translate-y-2" style={{'--card-color': color}}>
     <div className="absolute -inset-1 bg-gradient-to-b from-[var(--card-color)]/20 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700 pointer-events-none"></div>
     <h4 className="font-black text-3xl italic uppercase leading-none tracking-tighter transition-all duration-500 group-hover:scale-105 group-hover:drop-shadow-[0_0_15px_var(--card-color)] relative z-10" style={{color}}>{name}</h4>
     <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity relative z-10">{desc}</p>
     <div className="mt-8 h-1.5 w-full bg-black/50 rounded-full overflow-hidden shadow-inner relative z-10 border border-white/5">
        <div className="h-full w-[20%] group-hover:w-full transition-all duration-[1500ms] ease-out shadow-[0_0_15px_inset]" style={{backgroundColor: color, boxShadow: `0 0 15px ${color}`}}></div>
     </div>
  </div>
);

const OracleModal = ({ setShowOracle, oracleResponse, oracleQuery, setOracleQuery, handleAskOracle, aiLoading }) => (
  <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 sm:p-10">
     <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={() => setShowOracle(false)}></div>
     <div className="bg-[#050505] w-full max-w-2xl rounded-[3rem] border border-purple-500/30 shadow-[0_0_80px_rgba(168,85,247,0.15)] overflow-hidden relative animate-scale-up z-10 ring-1 ring-white/5">
        <div className="p-8 md:p-10 space-y-8 relative z-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 group">
                  <div className="p-3 bg-purple-500/10 rounded-2xl group-hover:bg-purple-500/20 transition-colors border border-purple-500/20">
                    <BrainCircuit className="text-purple-400 animate-pulse-slow" size={28}/>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">Oráculo de Arkanis</h2>
                  </div>
              </div>
              <button onClick={() => setShowOracle(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300">
                <Plus size={20} className="rotate-45" />
              </button>
           </div>
           <div className="bg-black/80 border border-purple-500/20 shadow-inner p-6 md:p-8 rounded-[2rem] min-h-[180px] flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
              {aiLoading ? (
                <div className="flex flex-col items-center gap-4 text-purple-400">
                  <Loader2 className="animate-spin" size={36}/>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Sintetizando Fluxo Dimensional...</p>
                </div>
              ) : (
                <p className="text-purple-100/80 text-sm md:text-base leading-relaxed font-medium italic whitespace-pre-wrap relative z-10">
                  {oracleResponse || "Lorde, que conhecimento do passado ou do futuro buscas nas fissuras do tempo? Aproxime-se do núcleo."}
                </p>
              )}
           </div>
           <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <input 
                type="text" 
                placeholder="Insira sua consulta neural..." 
                className="relative w-full bg-black/90 border border-white/10 p-6 rounded-2xl font-black text-sm text-purple-100 placeholder-purple-500/30 focus:border-purple-500/50 outline-none pr-16 transition-all shadow-inner"
                value={oracleQuery}
                onChange={e => setOracleQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskOracle()}
              />
              <button onClick={handleAskOracle} className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600 p-3 rounded-xl text-white hover:bg-purple-500 active:scale-90 shadow-lg">
                <Send size={20}/>
              </button>
           </div>
        </div>
     </div>
  </div>
);

const ProfileView = ({ player, loggedPlayer, communityPosts, siteSettings, setSelectedProfile, setActiveTab, isEditingProfile, setIsEditingProfile, editProfileData, setEditProfileData, handleGenerateBio, aiLoading, updateProfile, handleUpload, profilePicInputRef, bannerPicInputRef, setSelectedPostId }) => {
  const playerPosts = communityPosts.filter(p => p.author === player.name);
  const isMyProfile = loggedPlayer?.id === player.id;
  const tColor = player.team === 'andromeda' ? '#bc13fe' : '#22c55e';

  const SocialBtn = ({ icon: Icon, href, colorClass }) => {
    if (!href) return null;
    return (
      <a href={href.startsWith('http') ? href : `https://${href}`} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-xl bg-white/5 border border-white/10 hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden ${colorClass}`}>
        <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-20 transition-opacity"></div>
        <Icon size={18} className="relative z-10" />
      </a>
    );
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <button onClick={() => { setSelectedProfile(null); setActiveTab('community'); }} className="flex items-center gap-2 text-gray-500 hover:text-white uppercase font-black text-[10px] tracking-widest transition-all hover:-translate-x-2 py-2">
         <ArrowLeft size={16}/> Regressar à Galeria
      </button>

      {/* CARD PRINCIPAL DO PERFIL */}
      <div className="glass-panel rounded-[3rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative overflow-hidden group hover:border-white/10 transition-all duration-500 flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1.5 transition-all duration-700 opacity-80 group-hover:opacity-100 group-hover:h-2 z-20" style={{ backgroundColor: tColor, boxShadow: `0 0 20px ${tColor}` }}></div>
          
          <div className="relative w-full h-48 md:h-64 bg-black overflow-hidden flex-shrink-0">
             {player.bannerUrl ? (
                <img src={player.bannerUrl} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500" alt="Banner" />
             ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-900 relative">
                   <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                </div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,10,0.6)] via-transparent to-transparent"></div>
             {isMyProfile && (
               <>
                 <button onClick={() => bannerPicInputRef.current?.click()} className="absolute top-6 right-6 bg-black/50 backdrop-blur-md text-white p-3 rounded-full shadow-lg hover:bg-white/10 hover:scale-110 active:scale-95 transition-all z-20 border border-white/10 group/bannerbtn">
                   <Camera size={20} className="group-hover/bannerbtn:text-yellow-400 transition-colors"/>
                 </button>
                 <input type="file" ref={bannerPicInputRef} className="hidden" onChange={e => handleUpload(e, 'banner')} />
               </>
             )}
          </div>

          <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.01] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-white/[0.02] transition-colors duration-1000 z-10"></div>
          
          <div className="px-8 md:px-12 pb-8 md:pb-12 relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-14">
             <div className="relative group/avatar -mt-20 md:-mt-24">
                <div className="absolute inset-0 rounded-full animate-spin-slow opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" style={{border: `2px dashed ${tColor}`}}></div>
                <img src={player.photoUrl || siteSettings.logoUrl} className="w-36 h-36 md:w-48 md:h-48 rounded-full object-cover border-8 border-[rgba(10,10,10,0.8)] ring-1 ring-white/10 shadow-2xl transition-all duration-700 group-hover/avatar:scale-105 relative z-10 bg-[#0a0a0a]" style={{boxShadow: `0 0 40px ${tColor}33`}} alt={player.name} />
                {isMyProfile && (
                  <button onClick={() => profilePicInputRef.current?.click()} className="absolute bottom-4 right-4 bg-yellow-500 text-black p-3 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.5)] hover:bg-yellow-400 hover:scale-110 active:scale-95 transition-all z-20 border-2 border-[rgba(10,10,10,0.8)]">
                    <Camera size={20}/>
                  </button>
                )}
                <input type="file" ref={profilePicInputRef} className="hidden" onChange={e => handleUpload(e, 'profile')} />
             </div>
             
             <div className="flex-1 text-center md:text-left space-y-5 pt-2 md:pt-4 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex flex-col md:flex-row md:items-center gap-5">
                      <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter drop-shadow-md">{player.name}</h2>
                      <span className="px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/50 border backdrop-blur-md shadow-inner transition-all hover:scale-105 cursor-default inline-block mx-auto md:mx-0" style={{ color: tColor, borderColor: `${tColor}40` }}>
                        Nação {player.team.toUpperCase()}
                      </span>
                   </div>
                   {!isEditingProfile && (
                     <div className="flex items-center justify-center md:justify-end gap-3 mt-4 md:mt-0 flex-wrap">
                        <SocialBtn icon={MessageCircle} href={player.discord} colorClass="text-[#5865F2] hover:border-[#5865F2]" />
                        <SocialBtn icon={Twitter} href={player.twitter} colorClass="text-[#1DA1F2] hover:border-[#1DA1F2]" />
                        <SocialBtn icon={Youtube} href={player.youtube} colorClass="text-[#FF0000] hover:border-[#FF0000]" />
                        <SocialBtn icon={Twitch} href={player.twitch} colorClass="text-[#9146FF] hover:border-[#9146FF]" />
                        <SocialBtn icon={TikTokIcon} href={player.tiktok} colorClass="text-[#FE2C55] hover:border-[#FE2C55]" />
                     </div>
                   )}
                </div>

                {isEditingProfile ? (
                   <div className="space-y-6 w-full bg-black/40 p-6 md:p-8 rounded-3xl border border-white/5 shadow-inner">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Editor de Perfil</span>
                           <button onClick={handleGenerateBio} disabled={aiLoading} className="flex items-center gap-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-purple-600/40 transition-all active:scale-95 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                              {aiLoading ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Sintetizar IA ✨
                           </button>
                        </div>
                        <textarea className="w-full bg-black/80 border border-white/10 p-5 rounded-xl text-sm h-28 focus:border-yellow-500/50 outline-none transition-all resize-none shadow-inner" value={editProfileData.bio} onChange={e => setEditProfileData({...editProfileData, bio: e.target.value})} placeholder="Registe o seu propósito na Arca..."></textarea>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                           <div className="flex items-center bg-black/80 border border-white/10 rounded-xl overflow-hidden focus-within:border-[#5865F2]/50 transition-all">
                              <div className="p-3 bg-white/5 text-[#5865F2]"><MessageCircle size={18}/></div>
                              <input type="text" placeholder="Link do Discord" className="w-full bg-transparent p-3 text-xs outline-none text-white placeholder-gray-600" value={editProfileData.discord} onChange={e => setEditProfileData({...editProfileData, discord: e.target.value})} />
                           </div>
                           <div className="flex items-center bg-black/80 border border-white/10 rounded-xl overflow-hidden focus-within:border-[#1DA1F2]/50 transition-all">
                              <div className="p-3 bg-white/5 text-[#1DA1F2]"><Twitter size={18}/></div>
                              <input type="text" placeholder="Link do Twitter" className="w-full bg-transparent p-3 text-xs outline-none text-white placeholder-gray-600" value={editProfileData.twitter} onChange={e => setEditProfileData({...editProfileData, twitter: e.target.value})} />
                           </div>
                           <div className="flex items-center bg-black/80 border border-white/10 rounded-xl overflow-hidden focus-within:border-[#FF0000]/50 transition-all">
                              <div className="p-3 bg-white/5 text-[#FF0000]"><Youtube size={18}/></div>
                              <input type="text" placeholder="Link do Youtube" className="w-full bg-transparent p-3 text-xs outline-none text-white placeholder-gray-600" value={editProfileData.youtube} onChange={e => setEditProfileData({...editProfileData, youtube: e.target.value})} />
                           </div>
                           <div className="flex items-center bg-black/80 border border-white/10 rounded-xl overflow-hidden focus-within:border-[#9146FF]/50 transition-all">
                              <div className="p-3 bg-white/5 text-[#9146FF]"><Twitch size={18}/></div>
                              <input type="text" placeholder="Link da Twitch" className="w-full bg-transparent p-3 text-xs outline-none text-white placeholder-gray-600" value={editProfileData.twitch} onChange={e => setEditProfileData({...editProfileData, twitch: e.target.value})} />
                           </div>
                           <div className="flex items-center bg-black/80 border border-white/10 rounded-xl overflow-hidden focus-within:border-[#FE2C55]/50 transition-all md:col-span-2">
                              <div className="p-3 bg-white/5 text-[#FE2C55]"><TikTokIcon size={18}/></div>
                              <input type="text" placeholder="Link do TikTok" className="w-full bg-transparent p-3 text-xs outline-none text-white placeholder-gray-600" value={editProfileData.tiktok} onChange={e => setEditProfileData({...editProfileData, tiktok: e.target.value})} />
                           </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-white/5">
                           <button onClick={updateProfile} className="bg-green-600 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-green-500 active:scale-95 transition-all shadow-lg">Sincronizar</button>
                           <button onClick={() => setIsEditingProfile(false)} className="bg-white/5 text-gray-300 px-8 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-white/10 hover:text-white transition-all">Cancelar</button>
                        </div>
                      </div>
                   </div>
                ) : (
                   <div className="relative group/bio">
                      <div className="absolute -left-4 top-0 bottom-0 w-1 rounded-full opacity-50 group-hover/bio:opacity-100 transition-opacity duration-500" style={{backgroundColor: tColor}}></div>
                      <p className="text-gray-300/90 text-sm md:text-base leading-relaxed max-w-2xl font-medium">
                         {player.bio || "Este Lorde ainda não registou o seu manifesto nas Crónicas."}
                      </p>
                   </div>
                )}
                {isMyProfile && !isEditingProfile && (
                  <button onClick={() => { 
                    setEditProfileData({
                      bio: player.bio || '', discord: player.discord || '', twitter: player.twitter || '', youtube: player.youtube || '', twitch: player.twitch || '', tiktok: player.tiktok || ''
                    }); 
                    setIsEditingProfile(true); 
                  }} className="inline-flex items-center gap-2 text-yellow-500/80 font-black text-[10px] uppercase tracking-[0.2em] hover:text-yellow-400 hover:scale-105 transition-all mt-2 p-2 rounded-lg hover:bg-yellow-500/10">
                     <Edit3 size={14}/> Atualizar Registo
                  </button>
                )}
             </div>
          </div>
      </div>

      {/* FEED VISUAL DO PERFIL */}
      <div className="space-y-8 animate-fade-in" style={{animationDelay: '100ms'}}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5"><ImageIcon size={24} className="text-gray-400"/></div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Feed Visual</h3>
              <p className="text-[10px] font-black tracking-[0.3em] text-gray-600 mt-1 uppercase">Arquivo de {player.name}</p>
            </div>
          </div>
          {playerPosts.length === 0 ? (
            <div className="p-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] text-gray-600 font-black uppercase text-xs italic glass-panel flex flex-col items-center gap-4 shadow-inner">
              <Globe size={32} className="opacity-20 mb-2"/>
              Este Lorde não possui registos visuais capturados.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {playerPosts.map((p, i) => (
                  <div key={p.id} onClick={() => setSelectedPostId(p.id)} className="aspect-square relative group cursor-pointer overflow-hidden rounded-2xl bg-black/50 border border-white/5 hover:border-white/20 transition-all shadow-xl animate-fade-in" style={{animationDelay: `${i * 50}ms`}}>
                     {p.mediaUrl ? (
                        <img src={p.mediaUrl} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110 ease-out" alt="Post" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center p-4 text-center bg-white/[0.02]">
                           <p className="text-xs text-gray-400 line-clamp-4">{p.content}</p>
                        </div>
                     )}
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-sm">
                        <span className="flex items-center gap-1.5 text-white font-black text-sm"><Heart size={16} className={p.likes?.includes(loggedPlayer?.name) ? "fill-yellow-500 text-yellow-500" : ""}/> {p.likes?.length || 0}</span>
                        <span className="flex items-center gap-1.5 text-white font-black text-sm"><MessageCircle size={16}/> {p.comments?.length || 0}</span>
                     </div>
                  </div>
               ))}
            </div>
          )}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (APP) ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null); 
  const [isMobile, setIsMobile] = useState(false);
  
  // Estados de Dados
  const [posts, setPosts] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]); 
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');

  // Estados do Modal do Post (Lightbox)
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [editMode, setEditMode] = useState({ type: null, id: null, text: '' });

  // Estados Gemini AI
  const [aiLoading, setAiLoading] = useState(false);
  const [showOracle, setShowOracle] = useState(false);
  const [oracleQuery, setOracleQuery] = useState('');
  const [oracleResponse, setOracleResponse] = useState('');

  // Estado do Servidor de Minecraft
  const [serverStatus, setServerStatus] = useState({ online: false, players: 0, maxPlayers: 0, loading: true });

  // Estados de Edição de Perfil
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ bio: '', discord: '', twitter: '', youtube: '', twitch: '', tiktok: '' });

  // Estados de Formulário
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); 
  const [authError, setAuthError] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminAuthPass, setAdminAuthPass] = useState('');

  const [newPost, setNewPost] = useState({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  const [newCommPost, setNewCommPost] = useState({ author: '', content: '', mediaUrl: '', mediaType: 'image' });
  const [newPlayer, setNewPlayer] = useState({ name: '', team: 'andromeda', email: '' });

  // Configurações
  const [siteSettings, setSiteSettings] = useState({
    logoUrl: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop',
    siteName: 'NÊMESIS 2'
  });
  const [ghConfig, setGhConfig] = useState({ token: '', owner: '', repo: '', path: 'media' });
  const [showSettings, setShowSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const fileInputRef = useRef(null);
  const commFileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const profilePicInputRef = useRef(null);
  const bannerPicInputRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchServerStatus = async () => {
      try {
        const response = await fetch('https://api.mcsrvstat.us/2/plus-06.bedhosting.com.br:14398');
        const data = await response.json();
        setServerStatus({
          online: data.online,
          players: data.players?.online || 0,
          maxPlayers: data.players?.max || 0,
          loading: false
        });
      } catch (error) {
        setServerStatus(prev => ({ ...prev, loading: false }));
      }
    };
    
    fetchServerStatus();
    const statusInterval = setInterval(fetchServerStatus, 60000); 
    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch (e) {}
      }
      setUser(u);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubPosts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
      setLoading(false);
    });
    const unsubComm = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'community'), (snap) => {
      setCommunityPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });
    const unsubPlayers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'players'), (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSite = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site'), (snap) => {
      if (snap.exists()) setSiteSettings(snap.data());
    });
    const unsubGh = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), (snap) => {
      if (snap.exists()) setGhConfig(snap.data());
    });

    return () => { unsubPosts(); unsubComm(); unsubPlayers(); unsubSite(); unsubGh(); };
  }, [user]);

  const displayAndromeda = players.filter(p => p.team === 'andromeda');
  const displayHelix = players.filter(p => p.team === 'helix');
  const isRealUser = user && !user.isAnonymous;
  const loggedPlayer = isRealUser ? players.find(p => p.email?.toLowerCase() === user.email?.toLowerCase()) : null;

  // Encontra o post ativo para mostrar na Lightbox
  const activePost = communityPosts.find(p => p.id === selectedPostId);

  // --- ACÇÕES DE REDE SOCIAL ---
  const handleToggleLike = async (post) => {
    if (!loggedPlayer) return setGlobalError("Apenas Lordes registados podem curtir.");
    const likes = post.likes || [];
    const hasLiked = likes.includes(loggedPlayer.name);
    const newLikes = hasLiked ? likes.filter(n => n !== loggedPlayer.name) : [...likes, loggedPlayer.name];
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', post.id), { likes: newLikes });
  };

  const handleAddComment = async (post) => {
      if (!loggedPlayer) return setGlobalError("Apenas Lordes registados podem comentar.");
      if (!commentText.trim()) return;
      const newComment = { id: Date.now().toString(), author: loggedPlayer.name, text: commentText.trim(), timestamp: Date.now() };
      const comments = post.comments || [];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', post.id), { comments: [...comments, newComment] });
      setCommentText('');
  };

  const handleDeleteComment = async (post, commentId) => {
      const comments = post.comments || [];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', post.id), { comments: comments.filter(c => c.id !== commentId) });
  };

  const handleSaveEdit = async (post) => {
      if (editMode.type === 'post') {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', post.id), { content: editMode.text });
      } else if (editMode.type === 'comment') {
          const comments = post.comments || [];
          const updatedComments = comments.map(c => c.id === editMode.id ? { ...c, text: editMode.text } : c);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', post.id), { comments: updatedComments });
      }
      setEditMode({ type: null, id: null, text: '' });
  };

  const downloadImage = (url, author) => {
    fetch(url).then(resp => resp.blob()).then(blob => {
            const tempUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.style.display = 'none'; a.href = tempUrl; a.download = `nemesis_${author}_capture.png`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(tempUrl);
        }).catch(() => window.open(url, '_blank'));
  };

  // --- GEMINI API ---
  const callGemini = async (prompt, systemInstruction = "") => {
    setAiLoading(true);
    const maxRetries = 5;
    const delays = [1000, 2000, 4000, 8000, 16000];

    const run = async (attempt = 0) => {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
          })
        });

        if (!response.ok) throw new Error(`Gemini Error ${response.status}`);
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } catch (err) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delays[attempt]));
          return run(attempt + 1);
        }
        return null;
      }
    };

    const res = await run();
    setAiLoading(false);
    if (!res) setGlobalError("Oráculo indisponível. Verifica a tua rede.");
    return res;
  };

  const handleGenerateBio = async () => {
    if (!loggedPlayer) return;
    const system = `És o Oráculo de Arkanis. Escreve uma biografia para um Lorde da nação ${loggedPlayer.team} no mundo de Nêmesis 2. Estilo gamer épico, curto (máximo 160 char).`;
    const res = await callGemini(`Cria um manifesto curto para o Lorde ${loggedPlayer.name}`, system);
    if (res) setEditProfileData({...editProfileData, bio: res.trim()});
  };

  const handleCinematize = async () => {
    if (!newCommPost.content) return;
    const system = `És um cronista do Protocolo Eternus. Transforma o relato no site de guerra Nêmesis 2 num log dramático e épico (máximo 200 char).`;
    const res = await callGemini(newCommPost.content, system);
    if (res) setNewCommPost({ ...newCommPost, content: res.trim() });
  };

  const handleAskOracle = async () => {
    if (!oracleQuery) return;
    const system = `És o Oráculo de Arkanis. Guarda a história do Protocolo Eternus e das Nações Andrómeda e Hélix. Responde de forma curta e mística aos sobreviventes.`;
    const res = await callGemini(oracleQuery, system);
    if (res) setOracleResponse(res);
  };

  const handleUpload = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress('Sincronizando...');
    try {
      const url = await uploadToGitHub(file, target === 'official' ? 'official' : (target === 'profile' || target === 'banner') ? 'profiles' : 'community');
      if (target === 'official') setNewPost(p => ({ ...p, mediaUrl: url }));
      else if (target === 'community') setNewCommPost(p => ({ ...p, mediaUrl: url }));
      else if (target === 'profile' && loggedPlayer) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', loggedPlayer.id), { photoUrl: url });
      else if (target === 'banner' && loggedPlayer) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', loggedPlayer.id), { bannerUrl: url });
      setUploadProgress('Concluído!');
    } catch (err) { setGlobalError("Erro no upload."); }
    finally { setIsUploading(false); setTimeout(() => setUploadProgress(''), 3000); }
  };

  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token) throw new Error("Chaves do GitHub ausentes!");
    const path = subPath || 'media';
    const fileName = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const content = reader.result.split(',')[1];
        try {
          const resp = await fetch(`https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${path}/${fileName}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${ghConfig.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Upload via Nucleus`, content })
          });
          const data = await resp.json();
          resolve(data.content.download_url);
        } catch(e) { reject(e); }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePlayerAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        if (!players.some(p => p.email?.toLowerCase() === authEmail.toLowerCase())) { 
          setAuthError('E-mail não está na Whitelist!'); return; 
        }
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (err) { setAuthError('Terminal recusou acesso.'); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      if (!isRealUser) await signInWithEmailAndPassword(auth, adminEmail, adminAuthPass);
      if (adminPass === 'ROGZINHU-T10b20cd00n804') { setIsAdmin(true); setAdminRole('master'); }
      else if (adminPass === 'ADMNEMESIS15') { setIsAdmin(true); setAdminRole('admin'); }
      else setAuthError('Chave Master Incorreta.');
    } catch (err) { setAuthError('Credenciais inválidas.'); }
  };

  const createPost = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), { ...newPost, author: adminRole === 'master' ? 'Mestre' : 'Operador', timestamp: Date.now() });
    setNewPost({ title: '', content: '', mediaUrl: '' });
  };

  const createCommPost = async (e, force) => {
    e.preventDefault();
    const name = force || newCommPost.author;
    if (!name || (!newCommPost.content && !newCommPost.mediaUrl)) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community'), { ...newCommPost, author: name, timestamp: Date.now(), likes: [], comments: [] });
    setNewCommPost({ author: '', content: '', mediaUrl: '' });
  };

  const updateProfile = async () => {
    const target = selectedProfile || loggedPlayer;
    if (!target) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', target.id), editProfileData);
    setIsEditingProfile(false);
    setGlobalError("Perfil Sincronizado!");
  };

  const handleLogoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToGitHub(file, 'system');
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site'), { ...siteSettings, logoUrl: url }, { merge: true });
    } catch (err) { setGlobalError("Erro ao mudar logo."); }
    finally { setIsUploading(false); }
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name || !newPlayer.email) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'players'), { ...newPlayer, timestamp: Date.now() });
    setNewPlayer({ name: '', team: 'andromeda', email: '' });
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-yellow-500/30 font-sans overflow-x-hidden">
       
       {/* LUZES AMBIENTES */}
       <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-15%] left-[-10%] w-[120%] md:w-[70%] h-[70%] bg-purple-900/10 blur-[180px] rounded-full animate-pulse-slow"></div>
          <div className="absolute bottom-[-15%] right-[-10%] w-[120%] md:w-[70%] h-[70%] bg-green-900/10 blur-[180px] rounded-full animate-pulse-slow" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-blue-900/5 blur-[120px] rounded-full animate-pulse-slow" style={{animationDelay: '1s'}}></div>
       </div>

       {!isMobile && (
         <nav className="sticky top-0 z-50 glass-panel border-b border-white/10 h-[72px] shadow-2xl">
           <div className="max-w-7xl mx-auto px-10 h-full flex items-center justify-between">
              <div className="flex items-center gap-4 cursor-pointer group hover:opacity-90 transition-opacity" onClick={() => { setActiveTab('home'); setSelectedProfile(null); }}>
                <img src={siteSettings.logoUrl} className="w-11 h-11 rounded-xl object-cover border border-white/10 group-hover:border-yellow-500/50 transition-all duration-500 transform group-hover:rotate-6 shadow-lg relative z-10" alt="Logo" />
                <span className="font-black text-2xl italic uppercase tracking-tighter text-white group-hover:text-yellow-400 transition-all duration-300">{siteSettings.siteName}</span>
              </div>
              <div className="flex items-center gap-2">
                 <DesktopNavBtn active={activeTab === 'home' && !selectedProfile} onClick={() => { setActiveTab('home'); setSelectedProfile(null); }} Icon={Home} label="Mural" />
                 <DesktopNavBtn active={activeTab === 'community' && !selectedProfile} onClick={() => { setActiveTab('community'); setSelectedProfile(null); }} Icon={ImageIcon} label="Galeria" />
                 <DesktopNavBtn active={activeTab === 'lore' && !selectedProfile} onClick={() => { setActiveTab('lore'); setSelectedProfile(null); }} Icon={Book} label="Lore" />
                 <DesktopNavBtn active={activeTab === 'teams' && !selectedProfile} onClick={() => { setActiveTab('teams'); setSelectedProfile(null); }} Icon={Users} label="Nações" />
                 {loggedPlayer && <DesktopNavBtn active={selectedProfile?.id === loggedPlayer.id} onClick={() => { setSelectedProfile(loggedPlayer); setActiveTab('community'); }} Icon={UserCircle} label="Meu Perfil" />}
                 <button onClick={() => setShowOracle(true)} className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-600 hover:text-white transition-all shadow-lg active:scale-95 hover:scale-105"><BrainCircuit size={20} /></button>
                 <button onClick={() => { setActiveTab('admin'); setSelectedProfile(null); setAuthError(''); }} className={`p-2.5 rounded-xl transition-all transform hover:scale-105 active:scale-95 border ${activeTab === 'admin' ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'border-transparent text-gray-500 hover:bg-white/10 hover:text-white'}`}>
                    <LayoutDashboard size={20}/>
                 </button>
              </div>
           </div>
         </nav>
       )}

       <main className={`relative z-10 max-w-7xl mx-auto ${isMobile ? 'px-4 pb-28 pt-6' : 'px-10 py-12'}`}>
          {selectedProfile ? (
            <ProfileView player={selectedProfile} loggedPlayer={loggedPlayer} communityPosts={communityPosts} siteSettings={siteSettings} setSelectedProfile={setSelectedProfile} setActiveTab={setActiveTab} isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile} editProfileData={editProfileData} setEditProfileData={setEditProfileData} handleGenerateBio={handleGenerateBio} aiLoading={aiLoading} updateProfile={updateProfile} handleUpload={handleUpload} profilePicInputRef={profilePicInputRef} bannerPicInputRef={bannerPicInputRef} setSelectedPostId={setSelectedPostId} />
          ) : (
            <>
              {activeTab === 'home' && (
                <div className="space-y-12 animate-fade-in">
                  <div className="relative rounded-[3rem] overflow-hidden aspect-video md:aspect-[21/9] flex items-center justify-center border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] group animate-scanline">
                    <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.25] transition-transform duration-[3000ms] group-hover:scale-110 ease-out" />
                    <div className="relative z-20 text-center transform transition-all duration-700 group-hover:scale-105">
                      <h2 className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 font-black text-5xl md:text-8xl uppercase italic tracking-tighter drop-shadow-[0_0_40px_rgba(250,204,21,0.6)] leading-none mb-4">As Nações</h2>
                      <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-black/50 border border-yellow-500/20 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_10px_#facc15]"></span>
                        <p className="text-yellow-500/80 tracking-[0.4em] uppercase text-[9px] md:text-xs font-black">Protocolo Eternus Sincronizado</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* ARCA NÊMESIS STATUS BANNER - RESTAURADO */}
                  <div className="glass-panel border border-white/5 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-r from-green-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                     <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
                        <div className="relative">
                          <div className={`absolute inset-0 rounded-full blur-md opacity-50 transition-colors duration-500 ${serverStatus.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center relative z-10 transition-colors duration-500 bg-black/50 backdrop-blur-sm ${serverStatus.online ? 'text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-red-400 border-red-500/50'}`}>
                            <Activity size={24} className={serverStatus.online ? 'animate-pulse-slow' : ''} />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-black text-xl md:text-2xl uppercase italic tracking-tighter text-white drop-shadow-sm leading-none mb-1">Arca Nêmesis</h3>
                          <p className="text-[10px] text-gray-400 font-bold tracking-[0.3em] uppercase">Integridade do Núcleo</p>
                        </div>
                     </div>
                     <div className="flex items-center justify-between md:justify-end gap-6 bg-black/60 px-6 py-4 rounded-2xl border border-white/5 relative z-10 w-full md:w-auto shadow-inner">
                        <div className="flex flex-col text-left md:text-right">
                           <span className={`font-black text-sm uppercase tracking-[0.2em] transition-colors duration-500 ${serverStatus.online ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-red-400'}`}>
                              {serverStatus.online ? 'Conexão Estável' : 'Sinal Perdido'}
                           </span>
                           {serverStatus.online && <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase mt-1">{serverStatus.players} de {serverStatus.maxPlayers} Lordes Ativos</span>}
                        </div>
                        <div className="relative flex h-4 w-4">
                          {serverStatus.online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                          <span className={`relative inline-flex rounded-full h-4 w-4 transition-colors duration-500 ${serverStatus.online ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></span>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                     <div className="lg:col-span-8 space-y-10">
                       {posts.map((p, index) => (
                         <article key={p.id} className="glass-panel border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl hover:border-yellow-500/30 transition-all duration-500 animate-fade-in group/post" style={{animationDelay: `${index * 100}ms`}}>
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                               <div className="flex items-center gap-4">
                                  <img src={siteSettings.logoUrl} className="w-12 h-12 rounded-full border border-yellow-500/30 object-cover shadow-lg" />
                                  <div><h4 className="font-black text-sm uppercase text-white tracking-widest">{p.title}</h4><p className="text-[9px] text-gray-500 uppercase font-black mt-1">{p.author} • {new Date(p.timestamp).toLocaleDateString()}</p></div>
                               </div>
                               {isAdmin && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', p.id))} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-75 shadow-lg border border-red-500/20"><Trash2 size={16}/></button>}
                            </div>
                            {p.mediaUrl && <div className="overflow-hidden bg-black relative"><img src={p.mediaUrl} className="w-full object-cover max-h-[500px] group-hover/post:scale-105 transition-transform duration-[1.5s]" alt="Post" /></div>}
                            <div className="p-8 text-gray-300 leading-relaxed text-sm md:text-base font-medium whitespace-pre-wrap">{p.content}</div>
                         </article>
                       ))}
                     </div>
                     {!isMobile && (
                       <aside className="lg:col-span-4 space-y-8 sticky top-28 h-fit pb-10">
                          <SideCard color="#bc13fe" name="Andromeda" desc="Reconstruir a glória humana através da tecnologia das Arcas." />
                          <SideCard color="#22c55e" name="Helix" desc="Simbiose orgânica com as novas correntes de Arkanis." />
                       </aside>
                     )}
                  </div>
                </div>
              )}

              {activeTab === 'community' && (
                <div className="space-y-12 animate-fade-in">
                   <div className="text-center space-y-4 group cursor-default relative">
                     <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white relative z-10 drop-shadow-md">Galeria</h2>
                     <div className="w-16 h-1.5 bg-blue-600 mx-auto rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all group-hover:w-40 duration-700 relative z-10"></div>
                   </div>

                   {/* LOGIN FORM INTEGRADO NA GALERIA */}
                   {!isRealUser && !isAdmin && (
                     <div className="max-w-md mx-auto glass-panel p-10 rounded-[3rem] border border-blue-500/20 shadow-2xl text-center space-y-8 animate-fade-in relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse-slow"></div>
                        <Lock size={32} className="mx-auto text-blue-400 relative z-10" />
                        <div className="relative z-10"><h3 className="font-black uppercase italic text-xl">Sincronização Exigida</h3><p className="text-[10px] text-gray-500 font-bold uppercase mt-2">Autentica-te para participar no feed</p></div>
                        <form onSubmit={handlePlayerAuth} className="space-y-4 relative z-10">
                            <input type="email" placeholder="CÓDIGO DE ACESSO (EMAIL)" className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl text-xs font-black focus:border-blue-500 outline-none text-white shadow-inner" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                            <input type="password" placeholder="CHAVE NEURAL (SENHA)" className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl text-xs font-black focus:border-blue-500 outline-none text-white shadow-inner" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                            <button className="w-full bg-blue-600 p-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-95 transition-all text-white mt-2">Estabelecer Ligação</button>
                        </form>
                        {authError && <p className="text-red-500 text-[10px] font-black uppercase relative z-10">{authError}</p>}
                        <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[9px] text-gray-500 font-black uppercase hover:text-blue-400 transition-colors relative z-10 tracking-widest">{authMode === 'login' ? 'Criar Nova Ligação' : 'Já possuo Chave Neural'}</button>
                     </div>
                   )}

                   {(isAdmin || isRealUser) && (
                      <div className="glass-panel p-8 md:p-12 rounded-[3rem] border border-blue-500/30 shadow-2xl space-y-8 relative overflow-hidden group">
                         <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3"><ImageIcon className="text-blue-500" size={24}/><span className="font-black uppercase text-sm text-white italic">Novo Registro de Memória</span></div>
                            {isRealUser && <button onClick={() => signOut(auth)} className="text-[10px] text-red-500 uppercase font-black hover:text-red-400 px-3 py-1 bg-red-500/10 rounded-lg">Desconectar</button>}
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-5">
                               {isAdmin ? (
                                 <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-xs uppercase font-black text-gray-300 focus:border-blue-500 outline-none shadow-inner" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                                    <option value="">AUTOR DO REGISTRO</option>
                                    {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                 </select>
                               ) : <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/30 text-blue-300 text-xs font-black uppercase shadow-inner backdrop-blur-sm">Lorde Autorizado: {loggedPlayer?.name}</div>}
                               <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="h-40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer bg-black/40 group/file overflow-hidden relative shadow-inner hover:border-blue-500/50 transition-all">
                                  {isUploading ? <Loader2 className="animate-spin text-blue-400" size={28}/> : <Camera size={28} className="text-gray-500 group-hover/file:text-white transition-all"/>}
                                  <span className="text-[10px] font-black uppercase text-gray-500 group-hover/file:text-white tracking-widest">{isUploading ? uploadProgress : 'Sincronizar Mídia'}</span>
                                  {newCommPost.mediaUrl && !isUploading && <img src={newCommPost.mediaUrl} className="absolute inset-0 z-0 opacity-40 object-cover w-full h-full group-hover/file:opacity-60 transition-opacity" alt="Preview" />}
                               </div>
                               <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'community')} />
                            </div>
                            <div className="space-y-4 flex flex-col">
                               <textarea placeholder="Insira o relato da missão..." className="w-full flex-1 bg-black/60 border border-white/10 p-5 rounded-2xl text-sm outline-none focus:border-blue-500 text-white resize-none shadow-inner" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                               <button onClick={handleCinematize} disabled={aiLoading || !newCommPost.content} className="w-full bg-purple-600/10 text-purple-400 p-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all shadow-lg active:scale-95">
                                  {aiLoading ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} Cronizar Relato ✨
                               </button>
                            </div>
                         </div>
                         <button onClick={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="relative w-full bg-blue-600 p-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] shadow-lg hover:bg-blue-500 active:scale-95 transition-all text-white group/submit z-10 overflow-hidden">
                           <span className="relative z-10">Publicar Registro</span>
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/submit:animate-[scanline_2s_linear_infinite]"></div>
                         </button>
                      </div>
                   )}

                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
                      {communityPosts.map((p, i) => (
                          <div key={p.id} onClick={() => setSelectedPostId(p.id)} className="aspect-square relative group cursor-pointer overflow-hidden rounded-2xl bg-black/50 border border-white/5 hover:border-white/20 transition-all shadow-xl animate-fade-in" style={{animationDelay: `${i * 50}ms`}}>
                             {p.mediaUrl ? <img src={p.mediaUrl} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110 ease-out" alt="Post" /> : <div className="w-full h-full flex items-center justify-center p-4 text-center bg-white/[0.02] shadow-inner backdrop-blur-sm"><p className="text-xs text-gray-400 line-clamp-4">{p.content}</p></div>}
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-sm">
                                <span className="flex items-center gap-1.5 text-white font-black text-sm"><Heart size={16} className={p.likes?.includes(loggedPlayer?.name) ? "fill-yellow-500 text-yellow-500" : ""}/> {p.likes?.length || 0}</span>
                                <span className="flex items-center gap-1.5 text-white font-black text-sm"><MessageCircle size={16}/> {p.comments?.length || 0}</span>
                             </div>
                          </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'lore' && (
                <div className="max-w-4xl mx-auto space-y-16 py-6 animate-fade-in relative">
                  <header className="text-center">
                    <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-md">Lore</h2>
                    <div className="w-16 h-1.5 bg-yellow-500 mx-auto rounded-full mt-6 shadow-[0_0_10px_#facc15]"></div>
                  </header>
                  <div className="space-y-12">
                      <LoreChapter num="I" title="A Era do Arkanis">Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda...</LoreChapter>
                      <LoreChapter num="II" title="O Olho de Hórus">Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder...</LoreChapter>
                      <LoreChapter num="III" title="A Guerra dos Nêmesis">As nações mais poderosas se fecharam e culpavam umas às outras pelo ocorrido. Em meio à briga e ao desespero, dois grupos se formaram...</LoreChapter>
                      <LoreChapter num="IV" title="O Grande Colapso">Com a estabilidade do mundo comprometida, o tecido da realidade rasgou-se. Gigantescas tempestades de energia Arkanis varreram os continentes...</LoreChapter>
                      <LoreChapter num="V" title="O Surgimento das Nações">Séculos se passaram e as antigas ideologias consolidaram-se em Nações soberanas. A Nação Andrômeda ergueu-se como o pináculo da vontade humana...</LoreChapter>
                      <LoreChapter num="VI" title="O Protocolo Eternus">Neste novo mundo de Nêmesis 2, a guerra não é apenas territorial, é pela própria definição de realidade. O Protocolo Eternus foi ativado...</LoreChapter>
                  </div>
                </div>
              )}

              {activeTab === 'teams' && (
                <div className="space-y-28 pb-24 animate-fade-in pt-10">
                   <TeamSection color="#bc13fe" name="Andromeda" players={displayAndromeda} onPlayerClick={setSelectedProfile} isMobile={isMobile} />
                   <TeamSection color="#22c55e" name="Helix" players={displayHelix} reverse onPlayerClick={setSelectedProfile} isMobile={isMobile} />
                </div>
              )}

              {activeTab === 'admin' && (
                <div className="max-w-4xl mx-auto py-10 space-y-12 animate-fade-in">
                   {!isAdmin ? (
                     <div className="glass-panel p-12 md:p-20 rounded-[3rem] border border-yellow-500/20 text-center shadow-2xl relative overflow-hidden group">
                        <Lock size={64} className="relative mx-auto text-yellow-500 drop-shadow-md mb-10 group-hover:scale-110 transition-transform duration-500" />
                        <h2 className="text-4xl md:text-5xl font-black italic uppercase mb-12 tracking-tighter text-white">Terminal Master</h2>
                        <form onSubmit={handleAdminLogin} className="max-w-md mx-auto space-y-6 relative z-10">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <input type="email" placeholder="OPERADOR" className="bg-black/60 border border-white/10 p-4 rounded-xl font-black text-xs outline-none focus:border-yellow-500 text-white shadow-inner transition-all" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                              <input type="password" placeholder="SENHA" className="bg-black/60 border border-white/10 p-4 rounded-xl font-black text-xs outline-none focus:border-yellow-500 text-white shadow-inner transition-all" value={adminAuthPass} onChange={e => setAdminAuthPass(e.target.value)} />
                           </div>
                           <input type="password" placeholder="CHAVE MESTRA ARKANIS" className="w-full bg-black/80 border border-yellow-500/30 p-5 rounded-2xl text-center font-black focus:border-yellow-400 outline-none text-xl shadow-inner text-yellow-500 tracking-widest" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
                           <button className="w-full bg-yellow-500 text-black font-black p-5 rounded-2xl uppercase tracking-[0.3em] shadow-lg active:scale-95 transition-all hover:bg-yellow-400 hover:shadow-[0_0_20px_#facc1555]">Abrir Núcleo</button>
                        </form>
                     </div>
                   ) : (
                      <div className="space-y-12 animate-scale-up">
                         <header className="glass-panel p-8 md:p-10 rounded-[3rem] border border-white/5 flex justify-between items-center shadow-2xl backdrop-blur-xl">
                            <h3 className="font-black text-3xl uppercase italic tracking-tighter text-white leading-none">Mestre <span className="text-yellow-500">{adminRole}</span></h3>
                            <div className="flex gap-4">
                               {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-2xl transition-all border ${showSettings ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_#facc15]' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}><Settings size={24}/></button>}
                               <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-90"><LogOut size={24}/></button>
                            </div>
                         </header>
                         {showSettings && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                              <div className="glass-panel p-8 rounded-[3rem] border border-yellow-500/20 space-y-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                                 <h4 className="font-black uppercase italic text-yellow-500 text-xl flex items-center gap-3"><Palette size={24}/> Identidade Visual</h4>
                                 <div className="flex flex-col sm:flex-row items-center gap-6 group/logo relative z-10">
                                    <img src={siteSettings.logoUrl} className="w-24 h-24 rounded-3xl object-cover border-2 border-yellow-500/30 shadow-2xl bg-black group-hover:scale-105 transition-transform duration-500" alt="Logo" />
                                    <button onClick={() => logoInputRef.current?.click()} className="flex-1 w-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 font-black p-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-yellow-500 hover:text-black transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"><Camera size={16}/> Substituir Logo</button>
                                    <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoUpdate} />
                                 </div>
                              </div>
                              <div className="glass-panel p-8 rounded-[3rem] border border-blue-500/20 space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                                 <h4 className="font-black uppercase italic text-blue-400 text-xl flex items-center gap-3"><Settings size={24}/> Nucleus API</h4>
                                 <div className="space-y-4 relative z-10">
                                   <input type="password" placeholder="GITHUB TOKEN" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl font-black text-xs outline-none focus:border-blue-500 text-white shadow-inner" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} />
                                   <div className="grid grid-cols-2 gap-4">
                                      <input type="text" placeholder="OWNER" className="bg-black/60 border border-white/10 p-4 rounded-xl font-black text-xs shadow-inner outline-none focus:border-blue-500 text-white uppercase" value={ghConfig.owner} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} />
                                      <input type="text" placeholder="REPO" className="bg-black/60 border border-white/10 p-4 rounded-xl font-black text-xs shadow-inner outline-none focus:border-blue-500 text-white uppercase" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} />
                                   </div>
                                   <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), ghConfig); setShowSettings(false); setGlobalError('Nucleus Sincronizado!'); }} className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/40 font-black p-4 rounded-xl uppercase text-[10px] tracking-[0.2em] shadow-lg hover:bg-blue-600 hover:text-white transition-all active:scale-95">Salvar Protocolo</button>
                                 </div>
                              </div>
                           </div>
                         )}
                         <div className="glass-panel p-8 md:p-12 rounded-[4rem] border border-white/5 space-y-10 shadow-2xl relative overflow-hidden group backdrop-blur-xl">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6 relative z-10">
                              <Plus size={28} className="text-yellow-500"/><h3 className="text-2xl md:text-3xl font-black italic uppercase text-yellow-500 tracking-tighter drop-shadow-md">Disparar Mural Oficial</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                               <div className="space-y-6 text-center flex flex-col">
                                  <div onClick={() => !isUploading && fileInputRef.current?.click()} className="flex-1 min-h-[200px] bg-black/40 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-black/60 hover:border-yellow-500/40 transition-all group/upload overflow-hidden relative shadow-inner">
                                     {newPost.mediaUrl ? <img src={newPost.mediaUrl} className="w-full h-full object-cover" alt="Post" /> : <Camera size={48} className="text-gray-600 group-hover/upload:text-yellow-500 transition-all" />}
                                     {isUploading && <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3"><Loader2 className="animate-spin text-yellow-500" size={40}/><span className="text-yellow-500 font-black text-[10px] uppercase tracking-widest">{uploadProgress}</span></div>}
                                  </div>
                                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'official')} />
                               </div>
                               <form onSubmit={createPost} className="space-y-6 flex flex-col">
                                  <input type="text" placeholder="TÍTULO DA TRANSMISSÃO" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl font-black uppercase text-xs focus:border-yellow-500 outline-none shadow-inner text-white" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                                  <textarea placeholder="Relatório operacional para comando central..." className="w-full flex-1 min-h-[160px] bg-black/60 border border-white/10 p-6 rounded-[2rem] text-sm focus:border-yellow-500 outline-none shadow-inner text-white resize-none" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}></textarea>
                                  <button className="w-full bg-yellow-500 text-black font-black p-5 rounded-2xl uppercase tracking-[0.3em] shadow-lg hover:bg-yellow-400 active:scale-95 transition-all text-[11px]">Transmitir Relatório</button>
                               </form>
                            </div>
                         </div>
                         <div className="glass-panel p-8 md:p-12 rounded-[4rem] border border-white/5 space-y-10 shadow-2xl group hover:border-green-500/20 transition-all duration-500 relative overflow-hidden backdrop-blur-xl">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6 relative z-10"><Users size={28} className="text-green-500"/><h3 className="text-2xl md:text-3xl font-black italic uppercase text-green-500 tracking-tighter drop-shadow-md">Alistamento de Lordes</h3></div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 relative z-10">
                               <form onSubmit={addPlayer} className="md:col-span-5 space-y-5 flex flex-col justify-center">
                                  <input type="text" placeholder="NOME DO LORDE" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl font-black uppercase text-xs outline-none focus:border-green-500 shadow-inner text-white transition-all" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
                                  <input type="email" placeholder="EMAIL VINCULADO" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl font-black text-xs outline-none focus:border-green-500 shadow-inner text-white transition-all" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
                                  <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl font-black uppercase text-xs outline-none focus:border-green-500 text-gray-300 cursor-pointer shadow-inner" value={newPlayer.team} onChange={e => setNewPlayer({...newPlayer, team: e.target.value})}>
                                     <option value="andromeda">Andrômeda (Tecnologia)</option>
                                     <option value="helix">Hélix (Biologia)</option>
                                  </select>
                                  <button className="w-full bg-green-600/20 text-green-400 border border-green-500/40 font-black p-5 rounded-2xl uppercase tracking-[0.3em] shadow-lg hover:bg-green-600 hover:text-white active:scale-95 transition-all text-[11px]">Registrar na Arca</button>
                               </form>
                               <div className="md:col-span-7 bg-black/30 border border-white/5 rounded-[2.5rem] p-4 shadow-inner overflow-hidden">
                                 <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                                    {players.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).map((p, i) => (
                                      <div key={p.id} className="flex items-center justify-between bg-black/60 p-5 rounded-[1.5rem] border border-white/5 group/row hover:border-white/20 transition-all shadow-sm animate-fade-in" style={{animationDelay: `${i * 50}ms`}}>
                                         <div className="flex items-center gap-5 cursor-pointer flex-1" onClick={() => setSelectedProfile(p)}>
                                            <span className={`block w-3.5 h-3.5 rounded-full ${p.team === 'andromeda' ? 'bg-[#bc13fe] shadow-[0_0_10px_#bc13fe]' : 'bg-[#22c55e] shadow-[0_0_10px_#22c55e]'}`}></span>
                                            <div className="min-w-0">
                                               <h4 className="font-black text-white/90 uppercase text-xs truncate group-hover/row:text-white transition-colors">{p.name}</h4>
                                               <p className="text-[9px] text-gray-500 font-bold uppercase truncate">{p.email}</p>
                                            </div>
                                         </div>
                                         <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id))} className="p-3 text-gray-600 hover:text-red-400 active:scale-90 transition-all active:scale-75"><Trash2 size={16}/></button>
                                      </div>
                                    ))}
                                 </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
              )}
            </>
          )}
       </main>

       {/* MODAL DA GALERIA (LIGHTBOX) INTEGRADO COM NAVEGAÇÃO DE PERFIL */}
       {activePost && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-10">
              <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-fade-in" onClick={() => { setSelectedPostId(null); setEditMode({type:null, id:null, text:''}); }}></div>
              <div className="bg-[#050505] w-full max-w-6xl max-h-[90vh] rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden relative animate-scale-up z-10 flex flex-col md:flex-row shadow-[0_0_80px_rgba(0,0,0,0.8)]">
                  <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                      {activePost.mediaUrl ? (
                          <img src={activePost.mediaUrl} className="max-w-full max-h-[50vh] md:max-h-[90vh] object-contain" alt="Post" />
                      ) : <div className="p-10 text-center text-gray-400 font-black italic uppercase tracking-widest opacity-20">Registro de Dados</div>}
                      {activePost.mediaUrl && <button onClick={() => downloadImage(activePost.mediaUrl, activePost.author)} className="absolute top-4 left-4 p-3 bg-black/50 hover:bg-white/10 text-white rounded-full backdrop-blur-md shadow-lg transition-all active:scale-90" title="Transferir Mídia"><Download size={20}/></button>}
                      <button onClick={() => { setSelectedPostId(null); setEditMode({type:null, id:null, text:''}); }} className="md:hidden absolute top-4 right-4 p-3 bg-black/50 text-white rounded-full backdrop-blur-md transition-all active:scale-90"><X size={20}/></button>
                  </div>
                  <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col bg-[#0a0a0a] border-l border-white/5 h-[50vh] md:h-full">
                      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                          <div className="flex items-center gap-3 cursor-pointer group/author" onClick={() => { 
                             const authorPlayer = players.find(pl => pl.name === activePost.author);
                             if (authorPlayer) { setSelectedProfile(authorPlayer); setSelectedPostId(null); }
                          }}>
                              <img src={players.find(pl => pl.name === activePost.author)?.photoUrl || siteSettings.logoUrl} className="w-10 h-10 rounded-full border border-white/10 object-cover bg-black group-hover:scale-105 transition-all shadow-md" alt="Avatar" />
                              <div><h4 className="font-black text-sm uppercase text-white group-hover/author:text-yellow-400 transition-colors">{activePost.author}</h4><span className="text-[9px] text-gray-500 uppercase font-black">{new Date(activePost.timestamp).toLocaleDateString()}</span></div>
                          </div>
                          <div className="hidden md:flex items-center gap-2">
                              {(isAdmin || activePost.author === loggedPlayer?.name) && <button onClick={() => { deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', activePost.id)); setSelectedPostId(null); }} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-all active:scale-75"><Trash2 size={16}/></button>}
                              <button onClick={() => { setSelectedPostId(null); setEditMode({type:null, id:null, text:''}); }} className="p-2 text-gray-400 hover:text-white transition-all"><X size={20}/></button>
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                          <div className="group/post relative">
                              {editMode.type === 'post' && editMode.id === activePost.id ? (
                                  <div className="space-y-2">
                                      <textarea className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-blue-500 text-gray-200 resize-none shadow-inner" value={editMode.text} onChange={e => setEditMode({...editMode, text: e.target.value})} rows={4} />
                                      <div className="flex gap-2"><button onClick={() => handleSaveEdit(activePost)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 active:scale-95 transition-all">Sincronizar</button><button onClick={() => setEditMode({type:null, id:null, text:''})} className="bg-white/5 text-gray-400 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all">Cancelar</button></div>
                                  </div>
                              ) : (
                                  <div><p className="text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">{activePost.content}</p>
                                  {(isAdmin || activePost.author === loggedPlayer?.name) && <button onClick={() => setEditMode({ type: 'post', id: activePost.id, text: activePost.content })} className="text-[10px] uppercase font-black text-gray-500 hover:text-blue-400 mt-2 flex items-center gap-1.5 opacity-0 group-hover/post:opacity-100 transition-opacity"><Edit2 size={10}/> Editar Registro</button>}</div>
                              )}
                          </div>
                          <div className="w-full h-[1px] bg-white/5"></div>
                          <div className="space-y-5">
                              {(!activePost.comments || activePost.comments.length === 0) && <p className="text-center text-[10px] text-gray-600 font-black uppercase italic pt-4 opacity-50">Sem registros neurais adicionais.</p>}
                              {activePost.comments?.map(c => (
                                  <div key={c.id} className="flex gap-3 group/comment animate-fade-in">
                                      <img src={players.find(pl => pl.name === c.author)?.photoUrl || siteSettings.logoUrl} className="w-8 h-8 rounded-full border border-white/10 object-cover bg-black flex-shrink-0" alt="Author" />
                                      <div className="flex-1 space-y-1">
                                          <div className="flex items-baseline justify-between"><span className="font-black text-[11px] uppercase text-white/90">{c.author}</span><span className="text-[8px] text-gray-600 uppercase font-black">{new Date(c.timestamp).toLocaleDateString()}</span></div>
                                          {editMode.type === 'comment' && editMode.id === c.id ? (
                                              <div className="space-y-2 mt-1"><input type="text" className="w-full bg-black/60 border border-white/10 px-3 py-2 rounded-lg text-xs focus:border-blue-500 text-white outline-none shadow-inner" value={editMode.text} onChange={e => setEditMode({...editMode, text: e.target.value})} autoFocus /><div className="flex gap-2"><button onClick={() => handleSaveEdit(activePost)} className="text-blue-500 text-[10px] font-black uppercase active:scale-95">Salvar</button><button onClick={() => setEditMode({type:null, id:null, text:''})} className="text-gray-500 text-[10px] font-black uppercase active:scale-95">Cancelar</button></div></div>
                                          ) : <p className="text-xs text-gray-400 leading-relaxed break-words">{c.text}</p>}
                                          {!editMode.type && (isAdmin || c.author === loggedPlayer?.name) && <div className="flex gap-3 opacity-0 group-hover/comment:opacity-100 transition-opacity mt-1"><button onClick={() => setEditMode({ type: 'comment', id: c.id, text: c.text })} className="text-[9px] uppercase font-black text-gray-500 hover:text-blue-400 transition-all">Editar</button><button onClick={() => handleDeleteComment(activePost, c.id)} className="text-[9px] uppercase font-black text-gray-500 hover:text-red-400 transition-all">Apagar</button></div>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="p-4 md:p-6 border-t border-white/5 bg-[#080808] space-y-4">
                          <div className="flex items-center justify-between"><button onClick={() => handleToggleLike(activePost)} className="flex items-center gap-2 group/like active:scale-90 transition-all"><Heart size={24} className={activePost.likes?.includes(loggedPlayer?.name) ? "fill-yellow-500 text-yellow-500 drop-shadow-[0_0_8px_#facc15]" : "text-gray-400 group-hover/like:text-white"} /><span className="font-black text-sm">{activePost.likes?.length || 0}</span></button></div>
                          <div className="relative">
                            <input type="text" placeholder={loggedPlayer ? "Adiciona o teu comentário..." : "Entra na Arca para comentar"} disabled={!loggedPlayer} className="w-full bg-black/60 border border-white/10 py-4 pl-4 pr-12 rounded-2xl text-xs outline-none focus:border-blue-500 text-white disabled:opacity-50 shadow-inner placeholder:text-gray-700" value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment(activePost)} />
                            <button onClick={() => handleAddComment(activePost)} disabled={!loggedPlayer || !commentText.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-blue-500 hover:text-blue-400 transition-all bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-0"><Send size={16} /></button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
       )}

       {isMobile && (
         <nav className="fixed bottom-0 left-0 w-full glass-panel border-t border-white/10 h-20 flex items-center justify-around px-2 z-[100] shadow-2xl pb-safe">
            <MobileNavBtn active={activeTab === 'home'} onClick={() => { setSelectedProfile(null); setActiveTab('home'); }} Icon={Home} label="Mural" />
            <MobileNavBtn active={activeTab === 'community'} onClick={() => { setSelectedProfile(null); setActiveTab('community'); }} Icon={ImageIcon} label="Galeria" />
            <MobileNavBtn active={activeTab === 'lore'} onClick={() => { setSelectedProfile(null); setActiveTab('lore'); }} Icon={Book} label="Lore" />
            <MobileNavBtn active={activeTab === 'teams'} onClick={() => { setSelectedProfile(null); setActiveTab('teams'); }} Icon={Users} label="Nações" />
            {loggedPlayer && <MobileNavBtn active={selectedProfile?.id === loggedPlayer.id} onClick={() => { setSelectedProfile(loggedPlayer); setActiveTab('community'); }} Icon={UserCircle} label="Perfil" />}
         </nav>
       )}

       {showOracle && <OracleModal setShowOracle={setShowOracle} oracleResponse={oracleResponse} oracleQuery={oracleQuery} setOracleQuery={setOracleQuery} handleAskOracle={handleAskOracle} aiLoading={aiLoading} />}

       {globalError && (
        <div className={`fixed top-6 md:top-10 left-1/2 -translate-x-1/2 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase text-center z-[500] shadow-2xl border backdrop-blur-xl animate-fade-in ${globalError.includes('Sucesso') || globalError.includes('Sincronizado') ? 'bg-green-600/20 border-green-500/50 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 'bg-red-600/20 border-red-500/50 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.2)]'} flex items-center gap-6`}>
          <span className="tracking-widest flex items-center gap-2"><AlertTriangle size={14}/> {globalError}</span>
          <button onClick={() => setGlobalError('')} className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 transition-all active:scale-90">X</button>
        </div>
      )}
    </div>
  );
}

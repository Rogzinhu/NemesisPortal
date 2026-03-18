import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, setDoc, deleteDoc, getDoc, updateDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  Book, LayoutDashboard, LogOut, Plus, Trash2, 
  Users, Home, MessageSquare, AlertTriangle,
  Camera, Settings, Loader2, Palette, Lock, Link as LinkIcon, ImageIcon, User, Globe, ChevronRight, ArrowLeft, Edit3, Sparkles, Send, BrainCircuit, Zap, Shield, Target
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'nemesis-2-app';

const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

// --- ESTILOS GLOBAIS VIA CSS ---
const globalStyles = `
  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-gradient {
    background-size: 200% 200%;
    animation: gradient 5s ease infinite;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.1);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
  }
  .glass {
    background: rgba(10, 10, 10, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

// --- SUB-COMPONENTES EXTERNOS (Evita remounting) ---

const DesktopNavBtn = ({ active, onClick, Icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-500 relative group overflow-hidden ${
      active ? 'text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'
    }`}
  >
    {active && <div className="absolute inset-0 bg-yellow-500 animate-in fade-in zoom-in duration-300"></div>}
    <div className="relative z-10 flex items-center gap-2">
      <Icon size={16} className={`${active ? 'text-black' : 'group-hover:scale-110 transition-transform'}`} /> 
      <span>{label}</span>
    </div>
  </button>
);

const MobileNavBtn = ({ active, onClick, Icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${active ? 'text-yellow-500 scale-110' : 'text-gray-600 opacity-60'}`}>
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : ''}`}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[7px] font-black uppercase tracking-[0.25em]">{label}</span>
  </button>
);

const SideCard = ({ color, name, desc, Icon = Zap }) => (
  <div className="glass p-8 rounded-[2.5rem] shadow-2xl space-y-5 group hover:border-white/20 transition-all overflow-hidden relative border-l-4" style={{ borderLeftColor: color }}>
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.02] rounded-full group-hover:scale-150 transition-all duration-700"></div>
      <div className="flex items-center gap-3">
        <Icon size={18} style={{ color }} />
        <h4 className="font-black text-2xl italic uppercase leading-none tracking-tighter" style={{color}}>{name}</h4>
      </div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">{desc}</p>
      <div className="pt-4">
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
           <div className="h-full w-[30%] group-hover:w-full transition-all duration-[3s] ease-out" style={{backgroundColor: color, boxShadow: `0 0 10px ${color}`}}></div>
        </div>
      </div>
  </div>
);

const LoreChapter = ({ num, title, children }) => (
  <section className="glass p-12 rounded-[3.5rem] shadow-2xl hover:border-yellow-500/20 transition-all relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-yellow-500/0 via-yellow-500/40 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div className="relative z-10 flex items-center gap-10 mb-8">
      <span className="text-8xl font-black text-white/[0.03] italic group-hover:text-yellow-500/10 transition-all leading-none absolute -left-4">{num}</span>
      <div className="pl-16">
        <h3 className="text-4xl font-black text-yellow-500 uppercase italic tracking-tighter group-hover:translate-x-2 transition-transform">{title}</h3>
      </div>
    </div>
    <div className="relative z-10 text-gray-400 leading-[2.2] font-medium text-justify border-l border-white/10 pl-12 text-lg group-hover:text-gray-300 transition-colors">
      {children}
    </div>
  </section>
);

const TeamSection = ({ color, name, players, reverse, isMobile, onPlayerClick }) => (
  <div className={`flex flex-col ${reverse ? 'lg:items-end lg:text-right' : 'lg:items-start'} space-y-12`}>
    <div className={reverse ? 'text-right' : 'text-left'}>
       <div className={`h-1 w-32 rounded-full mb-6 ${reverse ? 'ml-auto' : ''}`} style={{ backgroundColor: color, boxShadow: `0 0 30px ${color}` }}></div>
       <h2 className={`font-black italic uppercase tracking-tighter leading-none ${isMobile ? 'text-5xl' : 'text-9xl'}`} style={{color}}>{name}</h2>
       <div className={`flex items-center gap-3 mt-4 opacity-40 uppercase font-black tracking-[0.6em] text-[9px] italic ${reverse ? 'justify-end' : ''}`}>
          <Shield size={12}/> <span>Lordes Ativos</span>
       </div>
    </div>
    <div className={`grid w-full gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
      {players.length === 0 ? (
        <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] font-black uppercase text-[10px] text-gray-700 tracking-widest">
          Sincronização pendente na {name}...
        </div>
      ) : (
        players.map(p => (
          <div key={p.id} onClick={() => onPlayerClick(p)} className="glass p-8 rounded-[3rem] font-black italic text-2xl shadow-2xl flex items-center justify-between group overflow-hidden relative transition-all hover:-translate-y-3 hover:bg-white/[0.03] cursor-pointer border-b-[6px]" style={{ borderBottomColor: color }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex items-center gap-5">
               <div className="relative">
                 <img src={p.photoUrl || 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop'} className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-xl group-hover:scale-110 transition-transform" alt={p.name} />
                 <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black" style={{ backgroundColor: color }}></div>
               </div>
               <span className="truncate text-white/80 group-hover:text-white transition-colors tracking-tighter">{String(p.name)}</span>
            </div>
            {p.link && <Target size={20} className="relative z-10 text-gray-700 group-hover:text-white transition-all group-hover:rotate-12" />}
          </div>
        ))
      )}
    </div>
  </div>
);

const OracleModal = ({ setShowOracle, oracleResponse, oracleQuery, setOracleQuery, handleAskOracle, aiLoading }) => (
  <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-500">
     <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" onClick={() => setShowOracle(false)}></div>
     <div className="glass w-full max-w-3xl rounded-[4rem] border border-purple-500/30 shadow-[0_0_100px_rgba(168,85,247,0.15)] overflow-hidden relative animate-in zoom-in-95 duration-500">
        <div className="h-2 w-full bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 animate-gradient"></div>
        <div className="p-12 md:p-16 space-y-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-purple-600/20 rounded-[1.5rem] text-purple-400 border border-purple-500/20"><BrainCircuit size={32}/></div>
                 <div>
                   <h2 className="text-4xl font-black italic uppercase tracking-tighter">Oráculo Arkanis</h2>
                   <p className="text-[10px] text-purple-500 uppercase font-black tracking-[0.5em] mt-1">Sincronização Atemporal</p>
                 </div>
              </div>
              <button onClick={() => setShowOracle(false)} className="text-gray-600 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest">Fechar</button>
           </div>
           <div className="bg-black/60 border border-white/5 p-10 rounded-[2.5rem] min-h-[250px] flex flex-col justify-center shadow-inner relative group">
              <div className="absolute top-4 right-6 text-purple-600 opacity-20"><Sparkles size={40}/></div>
              {aiLoading ? (
                <div className="flex flex-col items-center gap-6 text-purple-400">
                  <Loader2 className="animate-spin" size={48}/>
                  <p className="text-xs font-black uppercase tracking-[0.8em] animate-pulse">Cruzando Fluxos Dimensionais...</p>
                </div>
              ) : (
                <p className="text-gray-200 text-xl leading-relaxed font-medium italic whitespace-pre-wrap text-center">
                  {oracleResponse || "Comandante, que frequências do futuro ou ecos do passado buscas nas fissuras do tempo? Digita a tua dúvida..."}
                </p>
              )}
           </div>
           <div className="relative group">
              <input 
                type="text" 
                placeholder="CONECTAR AO ORÁCULO..." 
                className="w-full bg-black/80 border border-white/10 p-8 rounded-[2.5rem] font-black text-lg focus:border-purple-500 outline-none pr-24 shadow-2xl transition-all group-hover:border-purple-500/40 italic"
                value={oracleQuery}
                onChange={e => setOracleQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskOracle()}
              />
              <button onClick={handleAskOracle} className="absolute right-4 top-1/2 -translate-y-1/2 bg-purple-600 p-5 rounded-[1.5rem] text-white hover:bg-purple-500 transition-all active:scale-90 shadow-2xl shadow-purple-900/40">
                <Send size={24}/>
              </button>
           </div>
        </div>
     </div>
  </div>
);

const ProfileView = ({ player, loggedPlayer, communityPosts, siteSettings, setSelectedProfile, setActiveTab, isEditingProfile, setIsEditingProfile, editBio, setEditBio, handleGenerateBio, aiLoading, updateBio, handleUpload, profilePicInputRef }) => {
  const playerPosts = communityPosts.filter(p => p.author === player.name);
  const isMyProfile = loggedPlayer?.id === player.id;
  const teamColor = player.team === 'andromeda' ? '#bc13fe' : '#22c55e';

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      <button onClick={() => { setSelectedProfile(null); setActiveTab('community'); }} className="flex items-center gap-3 text-gray-500 hover:text-white uppercase font-black text-[10px] tracking-[0.3em] transition-all group">
         <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar ao Arquivo
      </button>

      <div className="glass rounded-[3.5rem] p-10 md:p-16 shadow-2xl relative overflow-hidden border-t-8" style={{ borderColor: teamColor }}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/[0.03] to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
             <div className="relative group">
               <img src={player.photoUrl || siteSettings.logoUrl} className="w-40 h-40 md:w-56 md:h-56 rounded-[3rem] object-cover border-4 border-white/5 shadow-2xl transition-all group-hover:scale-105 group-hover:rotate-2" alt="Profile" />
               {isMyProfile && (
                 <button onClick={() => profilePicInputRef.current?.click()} className="absolute -bottom-3 -right-3 bg-yellow-500 text-black p-4 rounded-2xl shadow-2xl hover:scale-110 transition-all active:scale-95">
                   <Camera size={20}/>
                 </button>
               )}
               <input type="file" ref={profilePicInputRef} className="hidden" onChange={e => handleUpload(e, 'profile')} />
             </div>
             <div className="flex-1 text-center md:text-left space-y-6">
                <div className="flex flex-col md:flex-row md:items-end gap-5">
                   <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">{String(player.name)}</h2>
                   <span className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10" style={{ color: teamColor }}>
                     Nação {String(player.team)}
                   </span>
                </div>
                {isEditingProfile ? (
                   <div className="space-y-5">
                      <button onClick={handleGenerateBio} disabled={aiLoading} className="flex items-center gap-2 bg-purple-600/10 text-purple-400 border border-purple-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-purple-600 hover:text-white transition-all">
                         {aiLoading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} Canalizar Manifesto ✨
                      </button>
                      <textarea className="w-full bg-black/40 border border-white/10 p-6 rounded-3xl text-lg h-32 focus:border-yellow-500 outline-none transition-all custom-scrollbar shadow-inner" value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Insira o seu registro nas crônicas..."></textarea>
                      <div className="flex gap-3 justify-center md:justify-start">
                         <button onClick={updateBio} className="bg-green-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-900/20">Registrar</button>
                         <button onClick={() => setIsEditingProfile(false)} className="bg-white/5 px-8 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-white/10">Abortar</button>
                      </div>
                   </div>
                ) : (
                   <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-3xl font-medium italic">
                      "{String(player.bio) || "Este Lorde ainda não registou o seu manifesto nas Crónicas."}"
                   </p>
                )}
                {isMyProfile && !isEditingProfile && (
                  <button onClick={() => { setEditBio(player.bio || ''); setIsEditingProfile(true); }} className="flex items-center gap-2 text-yellow-500 font-black text-[10px] uppercase tracking-[0.4em] hover:opacity-70 transition-opacity">
                     <Edit3 size={14}/> Modificar Perfil
                  </button>
                )}
             </div>
          </div>
      </div>

      <div className="space-y-10">
          <h3 className="text-2xl font-black uppercase italic tracking-[0.3em] flex items-center gap-4 text-white/40"><ImageIcon size={24}/> Arquivo Visual</h3>
          {playerPosts.length === 0 ? (
            <div className="p-32 text-center border-2 border-dashed border-white/5 rounded-[4rem] text-gray-800 font-black uppercase text-xs tracking-widest">
              Este lorde não possui transmissões salvas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {playerPosts.map(p => (
                  <article key={p.id} className="glass rounded-[3rem] border border-white/5 overflow-hidden group hover:border-yellow-500/30 transition-all duration-500 shadow-2xl">
                     <div className="aspect-square overflow-hidden">
                        {p.mediaUrl && <img src={p.mediaUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Capture" />}
                     </div>
                     <div className="p-8">
                        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 italic">"{String(p.content)}"</p>
                        <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-4">
                          <span className="text-[9px] text-gray-700 uppercase font-black tracking-widest">{new Date(p.timestamp).toLocaleDateString()}</span>
                          <Target size={14} className="text-gray-800" />
                        </div>
                     </div>
                  </article>
               ))}
            </div>
          )}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

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

  // Estados Gemini AI
  const [aiLoading, setAiLoading] = useState(false);
  const [showOracle, setShowOracle] = useState(false);
  const [oracleQuery, setOracleQuery] = useState('');
  const [oracleResponse, setOracleResponse] = useState('');

  // Estados de Edição de Perfil
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState('');

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
  const [newPlayer, setNewPlayer] = useState({ name: '', team: 'andromeda', link: '', email: '' });

  // Configurações
  const [siteSettings, setSiteSettings] = useState({
    logoUrl: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop',
    siteName: 'NÊMESIS 2'
  });
  const [ghConfig, setGhConfig] = useState({ token: '', owner: '', repo: '', path: 'media', geminiKey: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const fileInputRef = useRef(null);
  const commFileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const profilePicInputRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token).catch(() => signInAnonymously(auth));
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubAuth = onAuthStateChanged(auth, setUser);
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubPosts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
      setLoading(false);
    }, (err) => console.error(err));

    const unsubComm = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'community'), (snap) => {
      setCommunityPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
    }, (err) => console.error(err));

    const unsubPlayers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'players'), (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    const unsubSite = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site'), (snap) => {
      if (snap.exists()) setSiteSettings(snap.data());
    }, (err) => console.error(err));

    const unsubGh = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), (snap) => {
      if (snap.exists()) setGhConfig(snap.data());
    }, (err) => console.error(err));

    return () => { unsubPosts(); unsubComm(); unsubPlayers(); unsubSite(); unsubGh(); };
  }, [user]);

  const displayAndromeda = players.filter(p => p.team === 'andromeda');
  const displayHelix = players.filter(p => p.team === 'helix');
  const isRealUser = user && !user.isAnonymous;
  const loggedPlayer = isRealUser ? players.find(p => p.email?.toLowerCase() === user.email?.toLowerCase()) : null;

  // --- ACTIONS ---
  const callGemini = async (prompt, systemInstruction = "") => {
    const apiKey = ghConfig.geminiKey || "";
    if (!apiKey) { setGlobalError("Chave Gemini ausente no Painel Master."); return null; }
    setAiLoading(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });
      if (!response.ok) throw new Error(`Gemini Error ${response.status}`);
      const result = await response.json();
      setAiLoading(false);
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
      setAiLoading(false);
      setGlobalError("Conexão interrompida com o Oráculo.");
      return null;
    }
  };

  const handleGenerateBio = async () => {
    if (!loggedPlayer) return;
    const system = `És o Oráculo. Escreve uma bio gamer curta (150 char) para Lorde de ${loggedPlayer.team}.`;
    const res = await callGemini(`Cria manifesto para ${loggedPlayer.name}`, system);
    if (res) setEditBio(res.trim());
  };

  const handleCinematize = async () => {
    if (!newCommPost.content) return;
    const system = `Transforma o texto num log épico de guerra futurista (máximo 200 char).`;
    const res = await callGemini(newCommPost.content, system);
    if (res) setNewCommPost({ ...newCommPost, content: res.trim() });
  };

  const handleAskOracle = async () => {
    if (!oracleQuery) return;
    const system = `És o Oráculo Arkanis. Responde misticamente sobre o mundo de Nêmesis 2.`;
    const res = await callGemini(oracleQuery, system);
    if (res) setOracleResponse(res);
  };

  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token) throw new Error("GitHub não configurado!");
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
            body: JSON.stringify({ message: `Upload via Portal`, content })
          });
          const data = await resp.json();
          resolve(data.content.download_url);
        } catch(e) { reject(e); }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress('Enviando...');
    try {
      const url = await uploadToGitHub(file, target === 'official' ? 'official' : target === 'profile' ? 'profiles' : 'community');
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      if (target === 'official') setNewPost(p => ({ ...p, mediaUrl: url, mediaType: type }));
      else if (target === 'community') setNewCommPost(p => ({ ...p, mediaUrl: url, mediaType: type }));
      else if (target === 'profile' && loggedPlayer) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', loggedPlayer.id), { photoUrl: url });
      setUploadProgress('Concluído!');
    } catch (err) { setGlobalError("Erro no upload."); }
    finally { setIsUploading(false); setTimeout(() => setUploadProgress(''), 3000); }
  };

  const handlePlayerAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        if (!players.some(p => p.email?.toLowerCase() === authEmail.toLowerCase())) { setAuthError('E-mail não está na Whitelist!'); return; }
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (err) { setAuthError('Acesso recusado.'); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      if (!isRealUser) await signInWithEmailAndPassword(auth, adminEmail, adminAuthPass);
      if (adminPass === 'ROGZINHU-T10b20cd00n804') { setIsAdmin(true); setAdminRole('master'); }
      else if (adminPass === 'ADMNEMESIS15') { setIsAdmin(true); setAdminRole('admin'); }
      else setAuthError('Chave incorreta.');
    } catch (err) { setAuthError('Terminal recusou as credenciais.'); }
  };

  const createPost = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), { ...newPost, author: adminRole === 'master' ? 'Master' : 'Operador', timestamp: Date.now() });
    setNewPost({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const createCommPost = async (e, force) => {
    e.preventDefault();
    const name = force || newCommPost.author;
    if (!name || (!newCommPost.content && !newCommPost.mediaUrl)) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community'), { ...newCommPost, author: name, timestamp: Date.now() });
    setNewCommPost({ author: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const updateBio = async () => {
    if (!selectedProfile) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedProfile.id), { bio: editBio });
    setIsEditingProfile(false);
  };

  const handleLogoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToGitHub(file, 'system');
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site'), { ...siteSettings, logoUrl: url }, { merge: true });
    } catch (err) { setGlobalError(err.message); }
    finally { setIsUploading(false); }
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name || !newPlayer.email) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'players'), { ...newPlayer, timestamp: Date.now() });
    setNewPlayer({ name: '', team: 'andromeda', link: '', email: '' });
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-yellow-500 selection:text-black font-sans tracking-tight">
       <style>{globalStyles}</style>
       
       {/* LUZES AMBIENTES */}
       <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[70%] bg-purple-900/10 blur-[180px] rounded-full animate-pulse opacity-50"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[70%] bg-green-900/10 blur-[180px] rounded-full animate-pulse opacity-50" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-blue-900/5 blur-[150px] rounded-full"></div>
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>
       </div>

       {/* LOADING SCREEN */}
       {loading && (
         <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center gap-6">
            <div className="relative">
               <div className="w-24 h-24 border-4 border-yellow-500/20 rounded-[2rem] animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center text-yellow-500 animate-pulse"><Zap size={32} /></div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[1em] text-white/40">Sincronizando Nações...</p>
         </div>
       )}

       {/* CONTEÚDO PRINCIPAL (UNIFICADO PARA EVITAR PERDA DE FOCO) */}
       <div className="relative z-10 animate-in fade-in duration-1000">
         
         {/* NAV DESKTOP */}
         {!isMobile && (
           <nav className="sticky top-0 z-[100] bg-black/60 backdrop-blur-2xl border-b border-white/5 h-20">
             <div className="max-w-7xl mx-auto px-10 h-full flex items-center justify-between">
                 <div className="flex items-center gap-5 cursor-pointer group" onClick={() => { setActiveTab('home'); setSelectedProfile(null); }}>
                   <div className="relative">
                     <div className="absolute inset-0 bg-yellow-500 blur-md opacity-0 group-hover:opacity-20 transition-opacity"></div>
                     <img src={siteSettings.logoUrl} className="w-12 h-12 rounded-2xl object-cover border border-white/10 relative z-10" alt="Logo" />
                   </div>
                   <span className="font-black text-2xl italic uppercase tracking-tighter text-white group-hover:text-yellow-500 transition-all">{siteSettings.siteName}</span>
                 </div>
                 <div className="flex items-center gap-4 bg-white/[0.02] p-2 rounded-3xl border border-white/5">
                   <DesktopNavBtn active={activeTab === 'home' && !selectedProfile} onClick={() => { setActiveTab('home'); setSelectedProfile(null); }} Icon={Home} label="Mural" />
                   <DesktopNavBtn active={activeTab === 'community' && !selectedProfile} onClick={() => { setActiveTab('community'); setSelectedProfile(null); }} Icon={ImageIcon} label="Galeria" />
                   <DesktopNavBtn active={activeTab === 'lore' && !selectedProfile} onClick={() => { setActiveTab('lore'); setSelectedProfile(null); }} Icon={Book} label="Lore" />
                   <DesktopNavBtn active={activeTab === 'teams' && !selectedProfile} onClick={() => { setActiveTab('teams'); setSelectedProfile(null); }} Icon={Users} label="Nações" />
                   <div className="w-px h-6 bg-white/10 mx-2"></div>
                   <button onClick={() => setShowOracle(true)} className="p-3 bg-purple-600/10 text-purple-400 rounded-2xl hover:bg-purple-600 hover:text-white transition-all shadow-xl active:scale-90 border border-purple-500/20"><BrainCircuit size={18}/></button>
                   <button onClick={() => { setActiveTab('admin'); setSelectedProfile(null); setAuthError(''); }} className={`p-3 rounded-2xl transition-all ${activeTab === 'admin' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:bg-white/10'}`}><LayoutDashboard size={18}/></button>
                 </div>
             </div>
           </nav>
         )}

         {/* HEADER MOBILE */}
         {isMobile && !selectedProfile && (
           <div className="px-6 pt-10 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="relative">
                  <div className="absolute inset-0 bg-yellow-500 blur-sm opacity-20"></div>
                  <img src={siteSettings.logoUrl} className="w-12 h-12 rounded-xl object-cover border border-white/10 relative z-10 shadow-lg" alt="Logo" />
               </div>
               <h1 className="font-black text-2xl italic uppercase tracking-tighter">{siteSettings.siteName}</h1>
             </div>
             <button onClick={() => setActiveTab('admin')} className={`p-4 rounded-2xl transition-all shadow-xl ${activeTab === 'admin' ? 'bg-yellow-500 text-black' : 'glass'}`}>
               <LayoutDashboard size={22}/>
             </button>
           </div>
         )}

         <main className={`max-w-7xl mx-auto px-6 md:px-10 ${isMobile ? 'pt-8 pb-32' : 'py-16'}`}>
            {selectedProfile ? (
              <ProfileView 
                player={selectedProfile} loggedPlayer={loggedPlayer} communityPosts={communityPosts}
                siteSettings={siteSettings} setSelectedProfile={setSelectedProfile} setActiveTab={setActiveTab}
                isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile}
                editBio={editBio} setEditBio={setEditBio} handleGenerateBio={handleGenerateBio}
                aiLoading={aiLoading} updateBio={updateBio} handleUpload={handleUpload}
                profilePicInputRef={profilePicInputRef}
              />
            ) : (
              <>
                {/* ABA HOME */}
                {activeTab === 'home' && (
                  <div className="space-y-16 md:space-y-20">
                    <div className={`relative rounded-[2.5rem] md:rounded-[4rem] overflow-hidden aspect-video md:aspect-[21/7] flex items-center justify-center border border-white/5 shadow-2xl group`}>
                      <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2] transition-transform duration-[3s] group-hover:scale-110" alt="Banner" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
                      <div className="relative text-center space-y-4 px-6">
                        <h2 className="text-yellow-500 font-black text-5xl md:text-9xl uppercase italic tracking-tighter drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]">As Nações</h2>
                        <p className="text-white/40 tracking-[1em] md:tracking-[1.8em] uppercase text-[10px] md:text-xs font-black animate-pulse">Status: Protocolo Eternus Ativo</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
                      <div className="md:col-span-8 space-y-12 md:space-y-16">
                        <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                           <MessageSquare size={32} className="text-yellow-500" />
                           <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">Transmissões de Comando</h3>
                        </div>
                        {posts.map(p => (
                          <article key={p.id} className="glass border border-white/5 rounded-[3rem] md:rounded-[4rem] overflow-hidden shadow-2xl hover:border-white/20 transition-all duration-700 group">
                             <div className="p-6 md:p-8 border-b border-white/5 flex items-center gap-5 bg-white/[0.01]">
                                <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-xl border border-yellow-500/20 shadow-lg" alt="Icon" />
                                <div>
                                  <h4 className="font-black text-[9px] uppercase text-white/50 tracking-widest mb-1">Criptografia Nível 5</h4>
                                  <h4 className="font-black text-xs uppercase text-white tracking-widest">{String(p.title)}</h4>
                                </div>
                             </div>
                             {p.mediaUrl && <div className="overflow-hidden"><img src={p.mediaUrl} className="w-full object-cover max-h-[700px] group-hover:scale-105 transition-transform duration-[2s]" alt="Content" /></div>}
                             <div className="p-8 md:p-16 text-gray-300 text-lg md:text-2xl leading-relaxed whitespace-pre-wrap font-medium italic">"{String(p.content)}"</div>
                          </article>
                        ))}
                      </div>
                      <aside className="md:col-span-4 space-y-10">
                         <div className="sticky top-36 space-y-10">
                            <SideCard color="#bc13fe" name="Andromeda" desc="Supremacia tecnológica via Arcas Eternas." Icon={Zap} />
                            <SideCard color="#22c55e" name="Helix" desc="Evolução orgânica fundida com o núcleo Arkanis." Icon={Shield} />
                            {loggedPlayer && (
                              <div className="glass p-10 rounded-[3.5rem] shadow-2xl text-center space-y-6 border-t-4 border-blue-500">
                                 <div className="relative inline-block">
                                   <img src={loggedPlayer.photoUrl || siteSettings.logoUrl} className="w-24 h-24 rounded-[2rem] mx-auto object-cover border-4 border-blue-500 shadow-2xl" alt="Self" />
                                   <div className="absolute -bottom-2 -right-2 bg-blue-500 p-2 rounded-lg shadow-xl"><User size={14}/></div>
                                 </div>
                                 <div>
                                   <h4 className="font-black uppercase text-sm tracking-widest">{String(loggedPlayer.name)}</h4>
                                   <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mt-1">Conectado</p>
                                 </div>
                                 <button onClick={() => setSelectedProfile(loggedPlayer)} className="bg-blue-600 w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-xl active:scale-95">Acessar Terminal</button>
                              </div>
                            )}
                         </div>
                      </aside>
                    </div>
                  </div>
                )}

                {/* ABA COMMUNITY */}
                {activeTab === 'community' && (
                  <div className="space-y-16 animate-in slide-in-from-bottom-8 duration-1000">
                    <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/5 pb-12 gap-6">
                       <div className={isMobile ? 'w-full text-center' : ''}>
                         <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter">Galeria</h2>
                         <p className="text-gray-500 uppercase font-black tracking-[1em] text-[10px] mt-4 flex items-center gap-3 justify-center md:justify-start"><Zap size={14} className="text-blue-500"/> Registos de Arkanis</p>
                       </div>
                       {(isAdmin || isRealUser) && <button onClick={() => signOut(auth)} className="px-10 py-5 bg-red-500/10 text-red-500 rounded-[2rem] font-black uppercase text-[10px] tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Encerrar Sessão</button>}
                    </div>

                    {!isRealUser && !isAdmin && (
                      <div className="max-w-xl mx-auto glass p-10 md:p-16 rounded-[4rem] shadow-2xl text-center space-y-10 border-t-8 border-blue-600">
                         <div className="w-24 h-24 bg-blue-600/10 rounded-[2rem] flex items-center justify-center mx-auto text-blue-500 border border-blue-600/20"><Lock size={48} /></div>
                         <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">Acesso Restrito</h3>
                         <form onSubmit={handlePlayerAuth} className="space-y-5">
                            <input type="email" placeholder="IDENTIFICAÇÃO (EMAIL)" className="w-full bg-black/50 border border-white/10 p-6 rounded-[2rem] text-sm outline-none focus:border-blue-500 transition-all shadow-inner" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                            <input type="password" placeholder="CÓDIGO DE ACESSO" className="w-full bg-black/50 border border-white/10 p-6 rounded-[2rem] text-sm outline-none focus:border-blue-500 transition-all shadow-inner" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                            <button className="w-full bg-blue-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-blue-500 active:scale-95">Sincronizar</button>
                         </form>
                         <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[10px] text-gray-500 uppercase font-black tracking-widest hover:text-white transition-colors">Solicitar Registro na Arca</button>
                      </div>
                    )}

                    {(isAdmin || isRealUser) && (
                       <div className="glass p-8 md:p-16 rounded-[3.5rem] md:rounded-[4.5rem] shadow-2xl space-y-10 relative overflow-hidden border-t-8 border-blue-500">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                             <div className="space-y-8">
                                {isAdmin ? (
                                  <select className="w-full bg-black/50 border border-white/10 p-7 rounded-[2.5rem] font-black uppercase text-xs focus:border-blue-500 outline-none cursor-pointer" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                                     <option value="">SELECIONE O LORDE</option>
                                     {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                  </select>
                                ) : <div className="bg-blue-600/10 p-7 rounded-[2.5rem] border border-blue-600/30 font-black uppercase text-xs text-blue-400 tracking-widest flex items-center gap-3"><User size={16}/> Comandante: {String(loggedPlayer?.name)}</div>}
                                <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-10 border-4 border-dashed border-white/5 rounded-[3rem] text-center bg-black/40 cursor-pointer hover:bg-white/[0.02] hover:border-blue-500/20 transition-all group">
                                   <div className="flex flex-col items-center gap-4">
                                     <Camera size={40} className="text-gray-800 group-hover:text-blue-500 transition-colors" />
                                     <span className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">{isUploading ? uploadProgress : 'Carregar Imagem da Aventura'}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="space-y-5">
                                <textarea placeholder="Relate as coordenadas e sucessos da missão..." className="w-full bg-black/40 border border-white/10 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] h-48 text-lg md:text-xl outline-none focus:border-blue-500 font-medium italic custom-scrollbar shadow-inner" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                                <button onClick={handleCinematize} disabled={aiLoading || !newCommPost.content} className="w-full bg-purple-600/10 text-purple-400 p-5 rounded-3xl text-[10px] font-black uppercase flex items-center justify-center gap-3 border border-purple-600/20 hover:bg-purple-600 hover:text-white transition-all active:scale-95">
                                   <Sparkles size={18}/> Cronizar Relato (AI) ✨
                                </button>
                             </div>
                          </div>
                          <button onClick={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="w-full bg-blue-600 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] font-black uppercase tracking-[0.5em] shadow-2xl hover:bg-blue-500 text-lg md:text-xl active:scale-95">Publicar nas Crônicas</button>
                          <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'community')} />
                       </div>
                    )}

                    <div className="columns-1 md:columns-3 gap-10 space-y-10 pb-20">
                       {communityPosts.map(p => {
                          const authorPlayer = players.find(pl => pl.name === p.author);
                          return (
                            <div key={p.id} className="break-inside-avoid glass rounded-[3rem] md:rounded-[3.5rem] overflow-hidden group hover:border-blue-500/50 transition-all duration-700 shadow-2xl hover:-translate-y-2">
                               {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover cursor-pointer transition-transform duration-1000 group-hover:scale-105" onClick={() => { if (authorPlayer) setSelectedProfile(authorPlayer); }} alt="Post" />}
                               <div className="p-8 md:p-10 flex items-center justify-between">
                                  <div className="flex items-center gap-5 cursor-pointer" onClick={() => { if (authorPlayer) setSelectedProfile(authorPlayer); }}>
                                     <img src={authorPlayer?.photoUrl || siteSettings.logoUrl} className="w-12 md:w-14 h-12 md:h-14 rounded-[1.2rem] md:rounded-[1.5rem] object-cover border-2 border-white/10 shadow-xl" alt="Profile" />
                                     <div>
                                       <h4 className="font-black text-xs uppercase group-hover:text-blue-400 transition-colors tracking-widest">{String(p.author)}</h4>
                                       <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-1">{new Date(p.timestamp).toLocaleDateString()}</p>
                                     </div>
                                  </div>
                                  {isAdmin && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', p.id))} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 active:scale-90 transition-all"><Trash2 size={18}/></button>}
                               </div>
                            </div>
                          );
                       })}
                    </div>
                  </div>
                )}

                {/* ABA LORE */}
                {activeTab === 'lore' && (
                  <div className="max-w-5xl mx-auto space-y-16 md:space-y-20 py-6 md:py-10 animate-in slide-in-from-bottom-12 duration-1000">
                    <header className="text-center space-y-4">
                      <h2 className="text-6xl md:text-9xl font-black italic uppercase tracking-tighter text-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]">Lore</h2>
                      <p className="text-white/20 uppercase font-black tracking-[1.5em] text-[8px] md:text-[10px]">Arquivos da Civilização Arkanis</p>
                    </header>
                    <div className="space-y-16">
                       <LoreChapter num="I" title="A Era do Arkanis">
                         Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente. Arkanis, uma energia outrora mística, tornou-se o combustível da nova era, mas a ambição humana a transformou em uma arma de fragmentação dimensional...
                       </LoreChapter>
                       <LoreChapter num="II" title="O Olho de Hórus">
                         Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder. Eles buscavam a convergência absoluta, mas o que encontraram foi a fenda. Através dela, o Oráculo sussurrou as primeiras profecias, dividindo a humanidade entre os tecnocratas de Andrômeda e os evolucionistas de Hélix...
                       </LoreChapter>
                    </div>
                  </div>
                )}

                {/* ABA TEAMS */}
                {activeTab === 'teams' && (
                  <div className="space-y-32 md:space-y-48 pb-32">
                     <TeamSection color="#bc13fe" name="Andromeda" players={displayAndromeda} onPlayerClick={setSelectedProfile} isMobile={isMobile} />
                     <TeamSection color="#22c55e" name="Helix" players={displayHelix} reverse onPlayerClick={setSelectedProfile} isMobile={isMobile} />
                  </div>
                )}

                {/* ABA ADMIN */}
                {activeTab === 'admin' && (
                  <div className="max-w-4xl mx-auto py-10 space-y-16">
                     {!isAdmin ? (
                       <div className="glass p-16 md:p-24 rounded-[4rem] md:rounded-[5rem] text-center shadow-2xl relative overflow-hidden border-t-8 border-yellow-500">
                          <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl"></div>
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-yellow-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-yellow-500 mb-10 border border-yellow-500/20"><Lock size={48} /></div>
                          <h2 className="text-4xl md:text-6xl font-black italic uppercase mb-16 tracking-tighter">Terminal Master</h2>
                          <form onSubmit={handleAdminLogin} className="max-w-md mx-auto space-y-6">
                             {!isRealUser && (
                               <div className="grid grid-cols-2 gap-5">
                                  <input type="email" placeholder="LOGIN" className="bg-black/40 border border-white/5 p-6 rounded-3xl font-black text-xs outline-none focus:border-yellow-500 shadow-inner" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                                  <input type="password" placeholder="SENHA" className="bg-black/40 border border-white/5 p-6 rounded-3xl font-black text-xs outline-none focus:border-yellow-500 shadow-inner" value={adminAuthPass} onChange={e => setAdminAuthPass(e.target.value)} />
                               </div>
                             )}
                             <input type="password" placeholder="CHAVE MESTRA" className="w-full bg-black/60 border border-white/10 p-8 rounded-[2.5rem] text-center font-black focus:border-yellow-500 outline-none text-2xl md:text-3xl shadow-inner tracking-[0.4em]" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
                             <button className="w-full bg-yellow-500 text-black font-black p-8 rounded-[3rem] uppercase tracking-[0.5em] shadow-2xl active:scale-95 text-sm">Iniciar Sistema</button>
                          </form>
                       </div>
                     ) : (
                        <div className="space-y-16">
                           <header className="glass p-8 md:p-12 rounded-[3.5rem] md:rounded-[4rem] flex flex-col md:row justify-between items-center shadow-2xl border-l-8 border-yellow-500 gap-6">
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-yellow-500 rounded-[1.5rem] flex items-center justify-center text-black font-black text-xl italic shadow-lg">M</div>
                                <div>
                                  <h3 className="font-black text-2xl md:text-3xl uppercase italic tracking-tighter leading-none">Comandante {adminRole}</h3>
                                  <p className="text-[10px] text-yellow-500 uppercase font-black tracking-widest mt-2 animate-pulse">Sistemas Online</p>
                                </div>
                              </div>
                              <div className="flex gap-4">
                                 {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-6 rounded-[2rem] shadow-xl transition-all ${showSettings ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}><Settings size={28}/></button>}
                                 <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-6 bg-red-500/10 text-red-500 rounded-[2rem] hover:bg-red-500 hover:text-white transition-all shadow-xl"><LogOut size={28}/></button>
                              </div>
                           </header>
                           {showSettings && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in zoom-in-95 duration-500">
                                <div className="glass p-10 md:p-12 rounded-[3.5rem] md:rounded-[4.5rem] border border-yellow-500/10 space-y-10">
                                   <h4 className="font-black uppercase italic text-yellow-500 flex items-center gap-3"><Palette size={20}/> Identidade do Portal</h4>
                                   <div className="flex items-center gap-8">
                                      <img src={siteSettings.logoUrl} className="w-24 md:w-28 h-24 md:h-28 rounded-[2.5rem] object-cover border-4 border-yellow-500/20 shadow-2xl" alt="Logo" />
                                      <button onClick={() => logoInputRef.current?.click()} className="flex-1 bg-yellow-500 text-black font-black p-5 rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">Mudar Identidade</button>
                                      <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoUpdate} />
                                   </div>
                                   <input type="text" placeholder="NOME DO SISTEMA" className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl font-black uppercase text-xs outline-none focus:border-yellow-500" value={siteSettings.siteName} onChange={e => setSiteSettings({...siteSettings, siteName: e.target.value.toUpperCase()})} />
                                </div>
                                <div className="glass p-10 md:p-12 rounded-[3.5rem] md:rounded-[4.5rem] border border-blue-500/10 space-y-6">
                                   <h4 className="font-black uppercase italic text-blue-400 flex items-center gap-3"><Settings size={20}/> API Master Hub</h4>
                                   <input type="password" placeholder="GEMINI API KEY" className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl font-black text-[10px] outline-none focus:border-blue-500 shadow-inner" value={ghConfig.geminiKey || ''} onChange={e => setGhConfig({...ghConfig, geminiKey: e.target.value})} />
                                   <input type="password" placeholder="GITHUB TOKEN" className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl font-black text-[10px] outline-none focus:border-blue-500 shadow-inner" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} />
                                   <div className="grid grid-cols-2 gap-4">
                                      <input type="text" placeholder="OWNER" className="bg-black/40 border border-white/5 p-5 rounded-2xl font-black text-[10px] shadow-inner" value={ghConfig.owner} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} />
                                      <input type="text" placeholder="REPO" className="bg-black/40 border border-white/5 p-5 rounded-2xl font-black text-[10px] shadow-inner" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} />
                                   </div>
                                   <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), ghConfig); await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site'), siteSettings); setShowSettings(false); setGlobalError('Matriz Sincronizada!'); }} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase text-[10px] tracking-[0.3em] active:scale-95 transition-all">Sincronizar Matriz</button>
                                </div>
                             </div>
                           )}
                           <div className="glass p-8 md:p-16 rounded-[4rem] md:rounded-[5rem] space-y-12 shadow-2xl relative overflow-hidden border-t-8 border-yellow-500">
                              <h3 className="text-3xl md:text-4xl font-black italic uppercase text-yellow-500 tracking-tighter flex items-center gap-5"><Plus size={40} className="opacity-30"/> Transmissão de Comando</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
                                 <div className="space-y-8 text-center">
                                    <div onClick={() => !isUploading && fileInputRef.current?.click()} className="aspect-video bg-black/60 border-4 border-dashed border-white/5 rounded-[3rem] md:rounded-[4rem] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] hover:border-yellow-500/30 transition-all group overflow-hidden shadow-inner relative">
                                       {newPost.mediaUrl ? <img src={newPost.mediaUrl} className="w-full h-full object-cover" alt="Post" /> : <Camera size={80} className="text-gray-900 group-hover:text-yellow-500 transition-all" />}
                                       <div className="absolute bottom-6 font-black uppercase text-[10px] text-gray-700 tracking-[0.4em]">{isUploading ? uploadProgress : 'Anexar Mídia'}</div>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'official')} />
                                 </div>
                                 <form onSubmit={createPost} className="space-y-6">
                                    <input type="text" placeholder="TÍTULO DA OPERAÇÃO" className="w-full bg-black/40 border border-white/5 p-6 rounded-[2rem] md:rounded-[2.5rem] font-black uppercase text-sm focus:border-yellow-500 outline-none shadow-inner" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                                    <textarea placeholder="Relatório de campo detalhado..." className="w-full bg-black/40 border border-white/5 p-8 rounded-[2.5rem] md:rounded-[3.5rem] h-48 md:h-60 font-medium text-lg md:text-xl focus:border-yellow-500 outline-none shadow-inner resize-none transition-all italic custom-scrollbar" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}></textarea>
                                    <button className="w-full bg-yellow-500 text-black font-black p-8 rounded-[3rem] uppercase tracking-[0.6em] shadow-2xl hover:bg-yellow-400 active:scale-95 transition-all text-sm">Executar Transmissão</button>
                                 </form>
                              </div>
                           </div>
                           <div className="glass p-8 md:p-16 rounded-[4rem] md:rounded-[5rem] space-y-12 shadow-2xl border-t-8 border-green-500">
                              <h3 className="text-3xl md:text-4xl font-black italic uppercase text-green-500 tracking-tighter flex items-center gap-5"><Users size={40} className="opacity-30"/> Alistamento de Lordes</h3>
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
                                 <form onSubmit={addPlayer} className="md:col-span-5 space-y-6">
                                    <input type="text" placeholder="NOME DO LORDE" className="w-full bg-black/40 border border-white/5 p-6 rounded-[2.5rem] font-black uppercase text-sm outline-none focus:border-green-500 shadow-inner" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
                                    <input type="email" placeholder="EMAIL DE COMUNICAÇÃO" className="w-full bg-black/40 border border-white/5 p-6 rounded-[2.5rem] font-black text-xs outline-none focus:border-green-500 shadow-inner" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
                                    <select className="w-full bg-black/40 border border-white/5 p-6 rounded-[2.5rem] font-black uppercase text-xs outline-none focus:border-green-500 cursor-pointer shadow-inner" value={newPlayer.team} onChange={e => setNewPlayer({...newPlayer, team: e.target.value})}>
                                       <option value="andromeda">Nação Andrômeda</option>
                                       <option value="helix">Nação Hélix</option>
                                    </select>
                                    <button className="w-full bg-green-600 text-white font-black p-8 rounded-[3rem] uppercase tracking-[0.4em] active:scale-95 transition-all shadow-2xl">Consolidar Registro</button>
                                 </form>
                                 <div className="md:col-span-7 space-y-5 max-h-[600px] overflow-y-auto pr-6 custom-scrollbar">
                                    {players.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).map(p => (
                                      <div key={p.id} className="flex items-center justify-between glass p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-white/5 group hover:border-white/20 transition-all shadow-xl">
                                        <div className="flex items-center gap-6 cursor-pointer" onClick={() => setSelectedProfile(p)}>
                                           <div className={`w-4 h-4 rounded-full ${p.team === 'andromeda' ? 'bg-[#bc13fe] shadow-[0_0_15px_#bc13fe]' : 'bg-[#22c55e] shadow-[0_0_15px_#22c55e]'}`}></div>
                                           <div>
                                             <h4 className="font-black text-white uppercase text-lg group-hover:text-blue-400 leading-none transition-colors">{String(p.name)}</h4>
                                             <p className="text-[9px] text-gray-700 font-black tracking-widest mt-2 uppercase opacity-60 italic">{String(p.email)}</p>
                                           </div>
                                        </div>
                                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id))} className="p-5 bg-red-500/10 text-red-500 rounded-[1.5rem] hover:bg-red-500 hover:text-white transition-all active:scale-90"><Trash2 size={20}/></button>
                                      </div>
                                    ))}
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

         {/* FOOTER NAV MOBILE */}
         {isMobile && (
           <nav className="fixed bottom-0 left-0 w-full glass h-20 flex items-center justify-around px-6 z-[100] border-t border-white/5 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
             <MobileNavBtn active={activeTab === 'home' && !selectedProfile} onClick={() => { setSelectedProfile(null); setActiveTab('home'); }} Icon={Home} label="Início" />
             <MobileNavBtn active={activeTab === 'community' && !selectedProfile} onClick={() => { setSelectedProfile(null); setActiveTab('community'); }} Icon={ImageIcon} label="Galeria" />
             <MobileNavBtn active={activeTab === 'lore' && !selectedProfile} onClick={() => { setSelectedProfile(null); setActiveTab('lore'); }} Icon={Book} label="Lore" />
             <MobileNavBtn active={activeTab === 'teams' && !selectedProfile} onClick={() => { setSelectedProfile(null); setActiveTab('teams'); }} Icon={Users} label="Times" />
           </nav>
         )}

         {/* BOTÃO ORÁCULO MOBILE */}
         {isMobile && (
           <button onClick={() => setShowOracle(true)} className="fixed bottom-24 right-6 w-16 h-16 bg-purple-600 text-white rounded-[1.8rem] flex items-center justify-center shadow-[0_15px_35px_rgba(147,51,234,0.4)] z-[200] active:scale-90 transition-all border-4 border-black">
              <BrainCircuit size={30}/>
           </button>
         )}

         {/* MODAIS E NOTIFICAÇÕES */}
         {showOracle && <OracleModal setShowOracle={setShowOracle} oracleResponse={oracleResponse} oracleQuery={oracleQuery} setOracleQuery={setOracleQuery} handleAskOracle={handleAskOracle} aiLoading={aiLoading} />}
         {globalError && (
            <div className={`fixed top-12 left-1/2 -translate-x-1/2 p-8 rounded-[2.5rem] text-[10px] font-black uppercase text-center z-[600] shadow-[0_30px_60px_rgba(0,0,0,0.5)] border backdrop-blur-2xl transition-all animate-in slide-in-from-top-12 duration-500 ${globalError.includes('Sucesso') || globalError.includes('Matriz') ? 'bg-green-600/90 border-green-400/30' : 'bg-red-600/90 border-red-400/30'} flex items-center gap-8 text-white`}>
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><AlertTriangle size={16}/></div>
                 <span className="tracking-[0.4em]">{String(globalError)}</span>
              </div>
              <button onClick={() => setGlobalError('')} className="bg-black/30 px-6 py-2 rounded-xl hover:bg-black/50 transition-colors">OK</button>
            </div>
         )}
       </div>
    </div>
  );
}

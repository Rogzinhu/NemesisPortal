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
  Camera, Settings, Loader2, Palette, Lock, Link as LinkIcon, ImageIcon, User, Globe, ChevronRight, ArrowLeft, Edit3, Sparkles, Send, BrainCircuit
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
const GEMINI_API_KEY = ""; 
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

// --- SUB-COMPONENTES AUXILIARES (DEFINIDOS NO TOPO PARA EVITAR ERROS DE REFERÊNCIA) ---

const DesktopNavBtn = ({ active, onClick, Icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all duration-300 ${active ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
     <Icon size={16} className={active ? 'text-black' : 'text-gray-600'} /> 
     <span>{label}</span>
  </button>
);

const MobileNavBtn = ({ active, onClick, Icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-yellow-500 scale-110 drop-shadow-[0_0_10px_#eab308]' : 'text-gray-600'}`}>
    <Icon size={24} />
    <span className="text-[7px] font-black uppercase tracking-[0.2em]">{label}</span>
  </button>
);

const LoreChapter = ({ num, title, children }) => (
  <section className="bg-[#050505] p-10 rounded-[3rem] border border-white/5 shadow-2xl hover:border-yellow-500/20 transition-all relative overflow-hidden group">
    <div className="absolute -top-10 -left-10 text-[180px] font-black text-white/[0.01] italic select-none group-hover:text-yellow-500/5 transition-all">{num}</div>
    <div className="relative z-10 flex items-center gap-8 mb-8">
      <span className="text-7xl font-black text-white/[0.05] italic leading-none">{num}</span>
      <h3 className="text-3xl font-black text-yellow-500 uppercase italic tracking-tighter group-hover:translate-x-3 transition-transform">{title}</h3>
    </div>
    <p className="relative z-10 text-gray-400 leading-[2.2] font-medium text-justify border-l-4 border-white/10 pl-10 text-xl group-hover:text-gray-300 transition-colors">{children}</p>
  </section>
);

const TeamSection = ({ color, name, players, reverse, isMobile, onPlayerClick }) => (
  <div className={`flex flex-col ${reverse ? 'lg:items-end lg:text-right' : 'lg:items-start'} space-y-12`}>
    <div className={reverse ? 'text-right' : 'text-left'}>
       <div className={`h-1.5 w-24 rounded-full mb-5 shadow-lg ${reverse ? 'ml-auto' : ''}`} style={{ backgroundColor: color, boxShadow: `0 0 25px ${color}` }}></div>
       <h2 className={`font-black italic uppercase tracking-tighter leading-none ${isMobile ? 'text-5xl' : 'text-8xl'}`} style={{color}}>{name}</h2>
       <p className="text-gray-700 uppercase font-black tracking-[0.8em] text-[10px] mt-4 italic opacity-50">Lords Registados</p>
    </div>
    <div className={`grid w-full gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
      {players.length === 0 ? <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-3xl font-black uppercase text-[10px] text-gray-800 tracking-widest">Nação a aguardar Lordes ativos</div> : 
        players.map(p => (
        <div key={p.id} onClick={() => onPlayerClick(p)} className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border-b-8 font-black italic text-2xl shadow-2xl flex items-center justify-between group overflow-hidden relative transition-all hover:-translate-y-2 hover:bg-white/[0.02] cursor-pointer" style={{ borderBottomColor: color }}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-all"></div>
          <div className="relative z-10 flex items-center gap-4">
             <img src={p.photoUrl || 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop'} className="w-10 h-10 rounded-full object-cover border border-white/10" alt={p.name} />
             <span className="relative z-10 truncate text-white/90 group-hover:text-white transition-colors">{p.name}</span>
          </div>
          {p.link && <LinkIcon size={20} className="relative z-10 text-gray-700 group-hover:text-white transition-colors" />}
        </div>
      ))}
    </div>
  </div>
);

const SideCard = ({ color, name, desc }) => (
  <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-4 group hover:border-white/10 transition-all overflow-hidden relative">
     <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.02] rounded-full group-hover:scale-125 transition-all"></div>
     <h4 className="font-black text-3xl italic uppercase leading-none tracking-tighter" style={{color}}>{name}</h4>
     <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed opacity-80">{desc}</p>
     <div className="mt-8 h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
        <div className="h-full w-[40%] group-hover:w-full transition-all duration-[2500ms] ease-out shadow-[0_0_15px_inset]" style={{backgroundColor: color, boxShadow: `0 0 15px ${color}`}}></div>
     </div>
  </div>
);

const StatusLine = ({ label, value, color }) => (
  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-4">
     <span className="text-gray-600">{label}</span>
     <span className={`${color} italic drop-shadow-[0_0_5px_currentColor]`}>{value}</span>
  </div>
);

const OracleModal = ({ setShowOracle, oracleResponse, oracleQuery, setOracleQuery, handleAskOracle, aiLoading }) => (
  <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 sm:p-10">
     <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowOracle(false)}></div>
     <div className="bg-[#0a0a0a] w-full max-w-2xl rounded-[3rem] border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden relative animate-in zoom-in-95 duration-300">
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 animate-gradient"></div>
        <div className="p-8 space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <BrainCircuit className="text-purple-500" size={28}/>
                 <h2 className="text-2xl font-black italic uppercase tracking-tighter">Oráculo de Arkanis</h2>
              </div>
              <button onClick={() => setShowOracle(false)} className="text-gray-500 hover:text-white uppercase font-black text-[10px]">Fechar</button>
           </div>
           <div className="bg-black/50 border border-white/5 p-6 rounded-2xl min-h-[150px] flex flex-col justify-center">
              {aiLoading ? (
                <div className="flex flex-col items-center gap-3 text-purple-500">
                  <Loader2 className="animate-spin" size={32}/>
                  <p className="text-[10px] font-black uppercase tracking-widest">Processando Fluxo Dimensional...</p>
                </div>
              ) : (
                <p className="text-gray-300 text-sm leading-relaxed font-medium italic whitespace-pre-wrap">
                  {oracleResponse || "Lorde, que conhecimento do passado ou do futuro buscas nas fissuras do tempo?"}
                </p>
              )}
           </div>
           <div className="relative">
              <input 
                type="text" 
                placeholder="PERGUNTA AO ORÁCULO..." 
                className="w-full bg-black border border-white/10 p-6 rounded-2xl font-black text-sm focus:border-purple-500 outline-none pr-16"
                value={oracleQuery}
                onChange={e => setOracleQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskOracle()}
              />
              <button onClick={handleAskOracle} className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600 p-3 rounded-xl text-white hover:bg-purple-500 transition-all active:scale-90">
                <Send size={20}/>
              </button>
           </div>
        </div>
     </div>
  </div>
);

const ProfileView = ({ player, loggedPlayer, communityPosts, siteSettings, setSelectedProfile, setActiveTab, isEditingProfile, setIsEditingProfile, editBio, setEditBio, handleGenerateBio, aiLoading, updateBio, handleUpload, profilePicInputRef }) => {
  const playerPosts = communityPosts.filter(p => p.author === player.name);
  const isMyProfile = loggedPlayer?.id === player.id;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <button onClick={() => { setSelectedProfile(null); setActiveTab('community'); }} className="flex items-center gap-2 text-gray-500 hover:text-white uppercase font-black text-[10px] tracking-widest">
         <ArrowLeft size={16}/> Voltar para Galeria
      </button>

      <div className="bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 p-8 md:p-12 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: player.team === 'andromeda' ? '#bc13fe' : '#22c55e' }}></div>
         <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
            <div className="relative group">
              <img src={player.photoUrl || siteSettings.logoUrl} className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover border-4 border-white/5 shadow-2xl" />
              {isMyProfile && (
                <button onClick={() => profilePicInputRef.current?.click()} className="absolute bottom-2 right-2 bg-yellow-500 text-black p-2 rounded-full shadow-xl hover:scale-110 transition-all">
                  <Camera size={18}/>
                </button>
              )}
              <input type="file" ref={profilePicInputRef} className="hidden" onChange={e => handleUpload(e, 'profile')} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
               <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">{player.name}</h2>
                  <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10" style={{ color: player.team === 'andromeda' ? '#bc13fe' : '#22c55e' }}>
                    Nação {player.team.toUpperCase()}
                  </span>
               </div>
               {isEditingProfile ? (
                  <div className="space-y-3">
                     <button onClick={handleGenerateBio} disabled={aiLoading} className="flex items-center gap-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-purple-600/40 transition-all">
                        {aiLoading ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Gerar Manifesto ✨
                     </button>
                     <textarea className="w-full bg-black border border-white/10 p-4 rounded-xl text-sm h-24 focus:border-yellow-500 outline-none transition-all" value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Escreve algo sobre ti..."></textarea>
                     <div className="flex gap-2 justify-center md:justify-start">
                        <button onClick={updateBio} className="bg-green-600 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase">Salvar</button>
                        <button onClick={() => setIsEditingProfile(false)} className="bg-white/5 px-6 py-2 rounded-lg font-black text-[10px] uppercase">Cancelar</button>
                     </div>
                  </div>
               ) : (
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl font-medium">
                     {player.bio || "Este Lorde ainda não registou o seu manifesto nas Crónicas."}
                  </p>
               )}
               {isMyProfile && !isEditingProfile && (
                 <button onClick={() => { setEditBio(player.bio || ''); setIsEditingProfile(true); }} className="flex items-center gap-2 text-yellow-500 font-black text-[10px] uppercase tracking-widest hover:underline">
                    <Edit3 size={14}/> Editar Manifesto
                 </button>
               )}
            </div>
         </div>
      </div>

      <div className="space-y-8">
         <h3 className="text-xl font-black uppercase italic tracking-widest flex items-center gap-3"><ImageIcon size={20}/> Registros de {player.name}</h3>
         {playerPosts.length === 0 ? (
           <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-3xl text-gray-700 font-black uppercase text-xs italic">O arquivo deste lorde está vazio.</div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {playerPosts.map(p => (
                 <article key={p.id} className="bg-[#0a0a0a] rounded-[2rem] border border-white/5 overflow-hidden group hover:border-white/20 transition-all shadow-xl">
                    {p.mediaUrl && <img src={p.mediaUrl} className="w-full aspect-square object-cover" alt="Post" />}
                    <div className="p-6">
                       <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{p.content}</p>
                       <p className="text-[8px] text-gray-600 mt-4 uppercase font-black">{new Date(p.timestamp).toLocaleDateString()}</p>
                    </div>
                 </article>
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
  const [ghConfig, setGhConfig] = useState({ token: '', owner: '', repo: '', path: 'media' });
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
    if (res) setEditBio(res.trim());
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

  // --- ACTIONS ---
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

  const handleUpload = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress('Sincronizando...');
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
    setGlobalError("Manifesto Sincronizado!");
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
    setNewPlayer({ name: '', team: 'andromeda', link: '', email: '' });
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-yellow-500/30">
       {/* LUZES AMBIENTES */}
       <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[100%] md:w-[60%] h-[60%] bg-purple-900/10 blur-[150px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[100%] md:w-[60%] h-[60%] bg-green-900/10 blur-[150px] rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
       </div>

       {/* NAV DESKTOP */}
       {!isMobile && (
         <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 h-16 shadow-2xl">
           <div className="max-w-7xl mx-auto px-10 h-full flex items-center justify-between">
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => { setActiveTab('home'); setSelectedProfile(null); }}>
                <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-lg object-cover border border-white/10 group-hover:border-yellow-500/30 transition-all" alt="Logo" />
                <span className="font-black text-xl italic uppercase tracking-tighter text-white group-hover:text-yellow-500 transition-colors">{siteSettings.siteName}</span>
              </div>
              <div className="flex items-center gap-3">
                 <DesktopNavBtn active={activeTab === 'home' && !selectedProfile} onClick={() => { setActiveTab('home'); setSelectedProfile(null); }} Icon={Home} label="Mural" />
                 <DesktopNavBtn active={activeTab === 'community' && !selectedProfile} onClick={() => { setActiveTab('community'); setSelectedProfile(null); }} Icon={ImageIcon} label="Galeria" />
                 <DesktopNavBtn active={activeTab === 'lore' && !selectedProfile} onClick={() => { setActiveTab('lore'); setSelectedProfile(null); }} Icon={Book} label="Lore" />
                 <DesktopNavBtn active={activeTab === 'teams' && !selectedProfile} onClick={() => { setActiveTab('teams'); setSelectedProfile(null); }} Icon={Users} label="Nações" />
                 <button onClick={() => setShowOracle(true)} className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-all shadow-lg active:scale-90"><BrainCircuit size={20}/></button>
                 <button onClick={() => { setActiveTab('admin'); setSelectedProfile(null); setAuthError(''); }} className={`p-2 rounded-lg transition ${activeTab === 'admin' ? 'bg-yellow-500 text-black shadow-[0_0_15px_#eab308]' : 'text-gray-500 hover:bg-white/10'}`}><LayoutDashboard size={20}/></button>
              </div>
           </div>
         </nav>
       )}

       <main className={`relative z-10 max-w-7xl mx-auto ${isMobile ? 'px-4 pb-24 pt-6' : 'px-10 py-12'}`}>
          {selectedProfile ? (
            <ProfileView 
              player={selectedProfile}
              loggedPlayer={loggedPlayer}
              communityPosts={communityPosts}
              siteSettings={siteSettings}
              setSelectedProfile={setSelectedProfile}
              setActiveTab={setActiveTab}
              isEditingProfile={isEditingProfile}
              setIsEditingProfile={setIsEditingProfile}
              editBio={editBio}
              setEditBio={setEditBio}
              handleGenerateBio={handleGenerateBio}
              aiLoading={aiLoading}
              updateBio={updateBio}
              handleUpload={handleUpload}
              profilePicInputRef={profilePicInputRef}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <div className="space-y-12 animate-in fade-in duration-700">
                  <div className="relative rounded-[2.5rem] overflow-hidden aspect-video md:aspect-[21/9] flex items-center justify-center border border-white/5 shadow-2xl">
                    <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" />
                    <div className="relative text-center">
                      <h2 className="text-yellow-500 font-black text-4xl md:text-8xl uppercase italic tracking-tighter drop-shadow-2xl leading-none">As Nações</h2>
                      <p className="text-gray-400 tracking-[0.5em] uppercase text-[8px] md:text-xs font-bold mt-2">Protocolo Eternus Sincronizado</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                     <div className="lg:col-span-8 space-y-10">
                       <h3 className="text-2xl font-black flex items-center gap-3 text-yellow-500 uppercase italic"><MessageSquare size={24}/> Transmissões de Comando</h3>
                       {posts.map(p => (
                         <article key={p.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-xl hover:border-white/10 transition-all duration-500">
                            <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/[0.01]">
                               <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-full border border-yellow-500/20" />
                               <h4 className="font-black text-xs uppercase text-white tracking-widest">{p.title}</h4>
                            </div>
                            {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover max-h-[500px]" alt="Post" />}
                            <div className="p-8 text-gray-300 leading-relaxed text-sm md:text-lg font-medium whitespace-pre-wrap">{p.content}</div>
                         </article>
                       ))}
                     </div>
                     {!isMobile && (
                       <aside className="lg:col-span-4 space-y-8 sticky top-28 h-fit">
                          <SideCard color="#bc13fe" name="Andromeda" desc="Reconstruir a glória humana através da tecnologia das Arcas." />
                          <SideCard color="#22c55e" name="Helix" desc="Simbiose orgânica com as novas correntes de Arkanis." />
                          {loggedPlayer && (
                            <div className="bg-blue-600/5 border border-blue-500/20 p-8 rounded-[2.5rem] shadow-xl text-center space-y-4">
                               <img src={loggedPlayer.photoUrl || siteSettings.logoUrl} className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-blue-500 shadow-2xl" />
                               <h4 className="font-black uppercase text-sm tracking-widest">{loggedPlayer.name}</h4>
                               <button onClick={() => setSelectedProfile(loggedPlayer)} className="bg-blue-600 w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all">Ver Perfil</button>
                            </div>
                          )}
                       </aside>
                     )}
                  </div>
                </div>
              )}

              {activeTab === 'community' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                   <div className="text-center space-y-2">
                     <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">Galeria</h2>
                     <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full shadow-lg shadow-blue-500/50"></div>
                   </div>

                   {!isRealUser && !isAdmin && (
                     <div className="max-w-md mx-auto bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 shadow-2xl text-center space-y-6">
                        <Lock size={32} className="mx-auto text-blue-500" />
                        <h3 className="font-black uppercase italic tracking-widest">Acesso à Arca</h3>
                        {authError && <p className="text-[10px] text-red-500 uppercase font-black bg-red-500/5 p-2 rounded">{authError}</p>}
                        <form onSubmit={handlePlayerAuth} className="space-y-4">
                           <input type="email" placeholder="EMAIL" className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs outline-none focus:border-blue-500" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                           <input type="password" placeholder="SENHA" className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs outline-none focus:border-blue-500" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                           <button className="w-full bg-blue-600 p-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">{authMode === 'login' ? 'Conectar' : 'Registrar'}</button>
                        </form>
                        <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[9px] text-gray-500 uppercase hover:text-white underline decoration-dotted">{authMode === 'login' ? 'Não tens registro?' : 'Já possuo registro'}</button>
                     </div>
                   )}

                   {(isAdmin || isRealUser) && (
                      <div className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 shadow-2xl space-y-6 relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                         <div className="flex justify-between items-center">
                            <span className="font-black uppercase text-[10px] text-blue-500 italic tracking-widest">Novo Registro de Memória</span>
                            {isRealUser && <button onClick={() => signOut(auth)} className="text-[8px] text-red-500 uppercase font-black hover:underline">Sair</button>}
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                               {isAdmin ? (
                                 <select className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs uppercase font-black cursor-pointer focus:border-blue-500" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                                    <option value="">AUTOR DO POST</option>
                                    {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                 </select>
                               ) : <div className="bg-black/50 p-4 rounded-xl border border-blue-600/20 text-blue-400 text-xs font-black uppercase flex items-center gap-3 shadow-inner"><User size={16}/> Lorde: {loggedPlayer?.name}</div>}
                               <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-5 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:bg-white/5 transition-all bg-black group">
                                  <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-white">{isUploading ? uploadProgress : 'Anexar Mídia'}</span>
                               </div>
                               <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'community')} />
                            </div>
                            <div className="space-y-3">
                               <textarea placeholder="Relato da missão..." className="w-full bg-black border border-white/10 p-4 rounded-xl text-sm h-32 outline-none focus:border-blue-500 font-medium" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                               <button onClick={handleCinematize} disabled={aiLoading || !newCommPost.content} className="w-full bg-purple-600/10 text-purple-400 p-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-purple-600/20 hover:bg-purple-600 hover:text-white transition-all shadow-xl">
                                  {aiLoading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} Cronizar Relato ✨
                               </button>
                            </div>
                         </div>
                         <button onClick={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="w-full bg-blue-600 p-4 rounded-xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl active:scale-95 transition-all">Publicar Galeria</button>
                      </div>
                   )}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
                      {communityPosts.map(p => {
                         const authorPlayer = players.find(pl => pl.name === p.author);
                         return (
                           <div key={p.id} className="bg-[#0a0a0a] rounded-[1.5rem] overflow-hidden border border-white/5 shadow-xl group hover:border-blue-500/30 transition-all duration-500">
                              {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover aspect-square cursor-pointer transition-transform duration-700 group-hover:scale-105" onClick={() => { if (authorPlayer) setSelectedProfile(authorPlayer); }} alt="Capture" />}
                              <div className="p-5 flex items-center justify-between bg-white/[0.01]">
                                 <div className="flex items-center gap-3 cursor-pointer" onClick={() => { if (authorPlayer) setSelectedProfile(authorPlayer); }}>
                                    <img src={authorPlayer?.photoUrl || siteSettings.logoUrl} className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-lg" />
                                    <h4 className="font-black text-[10px] uppercase text-white truncate max-w-[100px] group-hover:text-blue-400 transition-colors">{p.author}</h4>
                                 </div>
                                 {isAdmin && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', p.id))} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"><Trash2 size={14}/></button>}
                              </div>
                           </div>
                         );
                      })}
                   </div>
                </div>
              )}

              {activeTab === 'lore' && (
                <div className="max-w-4xl mx-auto space-y-16 py-6 animate-in slide-in-from-bottom duration-500">
                  <header className="text-center"><h2 className="text-6xl font-black italic uppercase tracking-tighter text-yellow-500 drop-shadow-2xl">Lore</h2></header>
                  <div className="space-y-12">
                     <LoreChapter num="I" title="A Era do Arkanis">Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente. Naquele tempo, as nações exploravam e experimentavam com magia e novas tecnologias, todas com potencial enorme. Porém, a ganância dessas nações era tremenda, e elas competiam entre si por poderio econômico. O recurso mais cobiçado por todas as nações era o Arkanis, um recurso lendário que podia ser usado tanto para avanços tecnológicos quanto para avanços na magia.</LoreChapter>
                     <LoreChapter num="II" title="O Olho de Hórus">Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder: uma máquina mágica que usava tecnologia dimensional, magia pura e Arkanis com o intuito de gerar energia e magia infinitas. O nome dessa máquina era "O Olho de Hórus". Mas algo aconteceu. A máquina não funcionou do jeito que previram. Na verdade, ela tornou o tecido da realidade extremamente fino, fazendo com que portais e fissuras na terra se abrissem por todo o globo.</LoreChapter>
                     <LoreChapter num="III" title="A Guerra dos Nêmesis">As nações mais poderosas se fecharam e culpavam umas às outras pelo ocorrido. Em meio à briga e ao desespero, dois grupos se formaram: os Ferronatos e os Etéreos. Os Ferronatos culpavam a magia, acreditando que ela era volátil, incontrolável e selvagem. Em contrapartida, os Etéreos culpavam a tecnologia, alegando que ela corrompia as mentes, destruía o ecossistema e deturpava o equilíbrio da vida.</LoreChapter>
                  </div>
                </div>
              )}

              {activeTab === 'teams' && (
                <div className="space-y-24 pb-24">
                   <TeamSection color="#bc13fe" name="Andromeda" players={displayAndromeda} onPlayerClick={setSelectedProfile} isMobile={isMobile} />
                   <TeamSection color="#22c55e" name="Helix" players={displayHelix} reverse onPlayerClick={setSelectedProfile} isMobile={isMobile} />
                </div>
              )}

              {activeTab === 'admin' && (
                <div className="max-w-4xl mx-auto py-10 space-y-12">
                   {!isAdmin ? (
                     <div className="bg-[#0a0a0a] p-12 md:p-20 rounded-[3rem] border border-white/5 text-center shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 shadow-[0_0_20px_#eab308]"></div>
                        <Lock size={64} className="mx-auto mb-10 text-yellow-500 shadow-xl" />
                        <h2 className="text-5xl font-black italic uppercase mb-12 tracking-tighter">Terminal Master</h2>
                        {authError && <p className="mb-6 text-red-500 font-black uppercase text-xs animate-shake">{authError}</p>}
                        <form onSubmit={handleAdminLogin} className="max-w-md mx-auto space-y-6">
                           {!isRealUser && (
                             <div className="grid grid-cols-2 gap-4">
                                <input type="email" placeholder="EMAIL" className="bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none focus:border-yellow-500 shadow-inner" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                                <input type="password" placeholder="SENHA" className="bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none focus:border-yellow-500 shadow-inner" value={adminAuthPass} onChange={e => setAdminAuthPass(e.target.value)} />
                             </div>
                           )}
                           <input type="password" placeholder="CHAVE MESTRA ARKANIS" className="w-full bg-black border border-white/5 p-5 rounded-[1.5rem] text-center font-black focus:border-yellow-500 outline-none text-xl shadow-inner transition-all tracking-widest" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
                           <button className="w-full bg-yellow-500 text-black font-black p-6 rounded-[1.5rem] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Abrir Núcleo</button>
                        </form>
                     </div>
                   ) : (
                      <div className="space-y-12 animate-in fade-in duration-500">
                         <header className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 flex justify-between items-center shadow-xl relative overflow-hidden">
                            <div><h3 className="font-black text-2xl uppercase italic tracking-tighter text-white leading-none">Mestre {adminRole}</h3><p className="text-[10px] text-yellow-500 uppercase font-black tracking-[0.5em] mt-3">Link Sincronizado</p></div>
                            <div className="flex gap-4">
                               {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-5 rounded-2xl shadow-xl transition-all ${showSettings ? 'bg-yellow-500 text-black shadow-yellow-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}><Settings size={24}/></button>}
                               <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 active:scale-90 transition-all shadow-xl"><LogOut size={24}/></button>
                            </div>
                         </header>
                         
                         {showSettings && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in zoom-in-95 duration-300">
                              <div className="bg-yellow-500/5 p-10 rounded-[3.5rem] border border-yellow-500/20 space-y-8 shadow-2xl">
                                 <h4 className="font-black uppercase italic text-yellow-500 text-lg flex items-center gap-3"><Palette size={20}/> Identidade Site</h4>
                                 <div className="flex items-center gap-8">
                                    <img src={siteSettings.logoUrl} className="w-24 h-24 rounded-3xl object-cover border-4 border-yellow-500/20 shadow-2xl" />
                                    <button onClick={() => logoInputRef.current?.click()} className="flex-1 bg-yellow-500 text-black font-black p-4 rounded-xl uppercase text-xs tracking-widest hover:bg-yellow-400 transition-all shadow-xl">Trocar Logo</button>
                                    <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoUpdate} />
                                 </div>
                              </div>
                              <div className="bg-blue-500/5 p-10 rounded-[3.5rem] border border-blue-500/20 space-y-6 shadow-2xl">
                                 <h4 className="font-black uppercase italic text-blue-400 text-lg flex items-center gap-3"><Settings size={20}/> GitHub API Nucleus</h4>
                                 <input type="password" placeholder="TOKEN" className="w-full bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none focus:border-blue-500 shadow-inner transition-all" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} />
                                 <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="DONO" className="bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none shadow-inner" value={ghConfig.owner} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} />
                                    <input type="text" placeholder="REPO" className="bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none shadow-inner" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} />
                                 </div>
                                 <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), ghConfig); setShowSettings(false); setGlobalError('Sincronizadas com Sucesso!'); }} className="w-full bg-blue-600 text-white font-black p-4 rounded-xl uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-blue-500">Guardar Chaves</button>
                              </div>
                           </div>
                         )}

                         <div className="bg-[#0a0a0a] p-12 rounded-[4rem] border border-white/5 space-y-12 shadow-2xl relative overflow-hidden">
                            <h3 className="text-3xl font-black italic uppercase text-yellow-500 tracking-tighter flex items-center gap-4 leading-none"><Plus size={32} className="opacity-50"/> Disparar Mural Oficial</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                               <div className="space-y-6 text-center">
                                  <div onClick={() => !isUploading && fileInputRef.current?.click()} className="aspect-video bg-black border-4 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] hover:border-yellow-500/20 transition-all group overflow-hidden shadow-inner">
                                     {newPost.mediaUrl ? <img src={newPost.mediaUrl} className="w-full h-full object-cover" alt="Official Post" /> : <Camera size={64} className="text-gray-800 group-hover:text-yellow-500 transition-colors" />}
                                     {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-pulse"><Loader2 className="animate-spin text-yellow-500" size={48}/></div>}
                                  </div>
                                  <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest">{isUploading ? uploadProgress : 'Anexar Mídia de Comando'}</p>
                                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'official')} />
                               </div>
                               <form onSubmit={createPost} className="space-y-6">
                                  <input type="text" placeholder="TÍTULO DA TRANSMISSÃO" className="w-full bg-black border border-white/5 p-6 rounded-2xl font-black uppercase text-sm focus:border-yellow-500 outline-none shadow-inner transition-all" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                                  <textarea placeholder="Relatório operacional do comando..." className="w-full bg-black border border-white/5 p-8 rounded-[2.5rem] h-48 font-medium text-lg focus:border-yellow-500 outline-none shadow-inner resize-none transition-all" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}></textarea>
                                  <button className="w-full bg-yellow-500 text-black font-black p-8 rounded-[2rem] uppercase tracking-[0.4em] shadow-2xl hover:bg-yellow-400 active:scale-95 transition-all text-sm">Publicar Relatório</button>
                               </form>
                            </div>
                         </div>

                         <div className="bg-[#0a0a0a] p-12 rounded-[4rem] border border-white/5 space-y-12 shadow-2xl">
                           <h3 className="text-3xl font-black italic uppercase text-green-500 tracking-tighter flex items-center gap-4 leading-none"><Users size={32} className="opacity-50"/> Recrutamento das Nações</h3>
                           <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                              <form onSubmit={addPlayer} className="md:col-span-5 space-y-6">
                                 <input type="text" placeholder="NOME DO LORDE" className="w-full bg-black border border-white/5 p-6 rounded-2xl font-black uppercase text-sm outline-none focus:border-green-500 shadow-inner" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
                                 <input type="email" placeholder="E-MAIL DE REGISTO" className="w-full bg-black border border-white/5 p-6 rounded-2xl font-black text-xs outline-none focus:border-green-500 shadow-inner" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
                                 <select className="w-full bg-black border border-white/5 p-6 rounded-2xl font-black uppercase text-xs outline-none focus:border-green-500 shadow-inner cursor-pointer" value={newPlayer.team} onChange={e => setNewPlayer({...newPlayer, team: e.target.value})}>
                                    <option value="andromeda">Nação Andrômeda</option>
                                    <option value="helix">Nação Hélix</option>
                                 </select>
                                 <button className="w-full bg-green-600 text-white font-black p-6 rounded-[2rem] uppercase tracking-[0.3em] shadow-2xl hover:bg-green-500 shadow-green-500/10 active:scale-95 transition-all">Alistar na Arca</button>
                              </form>
                              <div className="md:col-span-7 space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                 {players.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).map(p => (
                                   <div key={p.id} className="flex items-center justify-between bg-black p-6 rounded-[2rem] border border-white/5 group hover:border-white/10 transition-all shadow-inner">
                                     <div className="flex items-center gap-5 cursor-pointer" onClick={() => setSelectedProfile(p)}>
                                        <span className={`w-3 h-3 rounded-full ${p.team === 'andromeda' ? 'bg-[#bc13fe] shadow-[0_0_10px_#bc13fe]' : 'bg-[#22c55e] shadow-[0_0_10px_#22c55e]'}`}></span>
                                        <div>
                                           <h4 className="font-black text-white uppercase text-sm tracking-tight group-hover:text-blue-400 transition-colors">{p.name}</h4>
                                           <p className="text-[10px] text-gray-600 font-black tracking-widest mt-1 opacity-60 uppercase">{p.email}</p>
                                        </div>
                                     </div>
                                     <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id))} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 active:scale-90 transition-all shadow-lg"><Trash2 size={18}/></button>
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

       {isMobile && (
         <nav className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-2xl border-t border-white/5 h-16 flex items-center justify-around px-4 z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
           <MobileNavBtn active={activeTab === 'home'} onClick={() => { setSelectedProfile(null); setActiveTab('home'); }} Icon={Home} label="Mural" />
           <MobileNavBtn active={activeTab === 'community'} onClick={() => { setSelectedProfile(null); setActiveTab('community'); }} Icon={ImageIcon} label="Galeria" />
           <MobileNavBtn active={activeTab === 'lore'} onClick={() => { setSelectedProfile(null); setActiveTab('lore'); }} Icon={Book} label="Lore" />
           <MobileNavBtn active={activeTab === 'teams'} onClick={() => { setSelectedProfile(null); setActiveTab('teams'); }} Icon={Users} label="Nações" />
         </nav>
       )}

       {showOracle && (
         <OracleModal 
           setShowOracle={setShowOracle}
           oracleResponse={oracleResponse}
           oracleQuery={oracleQuery}
           setOracleQuery={setOracleQuery}
           handleAskOracle={handleAskOracle}
           aiLoading={aiLoading}
         />
       )}

       {globalError && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 p-6 rounded-[2rem] text-[10px] font-black uppercase text-center z-[500] shadow-2xl border backdrop-blur-xl transition-all ${globalError.includes('Sucesso') ? 'bg-green-600/90 border-green-400' : 'bg-red-600/90 border-red-400'} flex items-center gap-6 text-white`}>
          <span className="tracking-widest">⚠️ {globalError}</span>
          <button onClick={() => setGlobalError('')} className="bg-black/20 px-4 py-2 rounded-xl">Fechar</button>
        </div>
      )}
    </div>
  );
}

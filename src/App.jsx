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
    onAuthStateChanged(auth, async (u) => {
      if (!u) { try { await signInAnonymously(auth); } catch (e) {} }
      setUser(u);
    });

    if (user) {
      onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), (snap) => {
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
        setLoading(false);
      });
      onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'community'), (snap) => {
        setCommunityPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
      });
      onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'players'), (snap) => {
        setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site'), (snap) => {
        if (snap.exists()) setSiteSettings(snap.data());
      });
      onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), (snap) => {
        if (snap.exists()) setGhConfig(snap.data());
      });
    }
  }, [user]);

  const displayAndromeda = players.filter(p => p.team === 'andromeda');
  const displayHelix = players.filter(p => p.team === 'helix');
  const isRealUser = user && !user.isAnonymous;
  const loggedPlayer = isRealUser ? players.find(p => p.email?.toLowerCase() === user.email?.toLowerCase()) : null;

  // --- GEMINI API ---
  const callGemini = async (prompt, systemInstruction = "") => {
    setAiLoading(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });
      const result = await response.json();
      setAiLoading(false);
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) { setAiLoading(false); return null; }
  };

  const handleGenerateBio = async () => {
    if (!loggedPlayer) return;
    const system = `És o Oráculo. Escreve uma bio curta (150 char) para um Lorde da nação ${loggedPlayer.team}.`;
    const res = await callGemini(`Cria manifesto para ${loggedPlayer.name}`, system);
    if (res) setEditBio(res.trim());
  };

  const handleCinematize = async () => {
    if (!newCommPost.content) return;
    const system = `Transforma o texto num relato épico de guerra curto (200 char).`;
    const res = await callGemini(newCommPost.content, system);
    if (res) setNewCommPost({ ...newCommPost, content: res.trim() });
  };

  const handleAskOracle = async () => {
    if (!oracleQuery) return;
    const system = `És o Oráculo de Arkanis. Responde sobre o mundo de Nêmesis 2 (Andrómeda vs Hélix, Arkanis, Protocolo Eternus).`;
    const res = await callGemini(oracleQuery, system);
    if (res) setOracleResponse(res);
  };

  // --- UPLOAD & ACTIONS ---
  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token) throw new Error("GitHub não configurado!");
    const path = subPath || 'media';
    const fileName = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const content = reader.result.split(',')[1];
        const resp = await fetch(`https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${path}/${fileName}`, {
          method: 'PUT',
          headers: { 'Authorization': `token ${ghConfig.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `Upload: ${fileName}`, content })
        });
        const data = await resp.json();
        resolve(data.content.download_url);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToGitHub(file, target === 'official' ? 'official' : target === 'profile' ? 'profiles' : 'community');
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      if (target === 'official') setNewPost(p => ({ ...p, mediaUrl: url, mediaType: type }));
      else if (target === 'community') setNewCommPost(p => ({ ...p, mediaUrl: url, mediaType: type }));
      else if (target === 'profile' && loggedPlayer) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', loggedPlayer.id), { photoUrl: url });
      setUploadProgress('Pronto!');
    } catch (err) { setGlobalError("Erro no Upload."); }
    finally { setIsUploading(false); setTimeout(() => setUploadProgress(''), 3000); }
  };

  const handlePlayerAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        if (!players.some(p => p.email?.toLowerCase() === authEmail.toLowerCase())) { setAuthError('E-mail não autorizado!'); return; }
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (err) { setAuthError('Erro de acesso.'); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      if (!isRealUser) await signInWithEmailAndPassword(auth, adminEmail, adminAuthPass);
      if (adminPass === 'ROGZINHU-T10b20cd00n804') { setIsAdmin(true); setAdminRole('master'); }
      else if (adminPass === 'ADMNEMESIS15') { setIsAdmin(true); setAdminRole('admin'); }
      else setAuthError('Chave incorreta.');
    } catch (err) { setAuthError('Falha no terminal.'); }
  };

  const createPost = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), { ...newPost, author: adminRole === 'master' ? 'Master' : 'ADM', timestamp: Date.now() });
    setNewPost({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const createCommPost = async (e, force) => {
    e.preventDefault();
    const name = force || newCommPost.author;
    if (!name || (!newCommPost.content && !newCommPost.mediaUrl)) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community'), { ...newCommPost, author: name, timestamp: Date.now() });
    setNewCommPost({ author: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  // --- INTERFACES ---

  const ProfileView = ({ player }) => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <button onClick={() => { setSelectedProfile(null); setActiveTab('community'); }} className="flex items-center gap-2 text-gray-500 hover:text-white uppercase font-black text-[10px] tracking-widest">
         <ArrowLeft size={16}/> Voltar
      </button>
      <div className="bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 p-8 md:p-12 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: player.team === 'andromeda' ? '#bc13fe' : '#22c55e' }}></div>
         <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
            <div className="relative group">
              <img src={player.photoUrl || siteSettings.logoUrl} className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover border-4 border-white/5 shadow-2xl" />
              {loggedPlayer?.id === player.id && (
                <button onClick={() => profilePicInputRef.current?.click()} className="absolute bottom-2 right-2 bg-yellow-500 text-black p-2 rounded-full shadow-xl"><Camera size={18}/></button>
              )}
              <input type="file" ref={profilePicInputRef} className="hidden" onChange={e => handleUpload(e, 'profile')} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
               <h2 className="text-4xl font-black italic uppercase tracking-tighter">{player.name}</h2>
               <p className="text-gray-400 text-sm md:text-base max-w-2xl">{player.bio || "Sem manifesto."}</p>
               {loggedPlayer?.id === player.id && (
                 <button onClick={() => { setEditBio(player.bio || ''); setIsEditingProfile(!isEditingProfile); }} className="text-yellow-500 text-[10px] font-black uppercase tracking-widest hover:underline">Editar Manifesto</button>
               )}
               {isEditingProfile && (
                 <div className="mt-4 space-y-3">
                    <button onClick={handleGenerateBio} className="bg-purple-600/20 text-purple-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-2"><Sparkles size={12}/> Gerar via IA</button>
                    <textarea className="w-full bg-black border border-white/10 p-3 rounded-lg text-sm h-20 outline-none" value={editBio} onChange={e => setEditBio(e.target.value)} />
                    <button onClick={async () => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', player.id), { bio: editBio }); setIsEditingProfile(false); }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase">Salvar</button>
                 </div>
               )}
            </div>
         </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {communityPosts.filter(p => p.author === player.name).map(p => (
           <article key={p.id} className="bg-[#0a0a0a] rounded-[2rem] border border-white/5 overflow-hidden shadow-xl">
             {p.mediaUrl && <img src={p.mediaUrl} className="w-full aspect-square object-cover" />}
             <div className="p-6 text-gray-400 text-xs">{p.content}</div>
           </article>
         ))}
      </div>
    </div>
  );

  const OracleModal = () => (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
       <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowOracle(false)}></div>
       <div className="bg-[#0a0a0a] w-full max-w-xl rounded-[2.5rem] border border-purple-500/20 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 space-y-6">
             <div className="flex items-center gap-3"><BrainCircuit className="text-purple-500" size={24}/><h2 className="text-xl font-black uppercase italic">Oráculo de Arkanis</h2></div>
             <div className="bg-black/50 p-5 rounded-xl min-h-[100px] text-gray-300 text-sm italic">{oracleResponse || "Lorde, o que desejas saber?"}</div>
             <div className="flex gap-2">
                <input type="text" placeholder="Pergunta..." className="flex-1 bg-black border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-purple-500" value={oracleQuery} onChange={e => setOracleQuery(e.target.value)} />
                <button onClick={handleAskOracle} className="bg-purple-600 p-4 rounded-xl text-white"><Send size={20}/></button>
             </div>
          </div>
       </div>
    </div>
  );

  const MainLayout = ({ children }) => (
    <div className="min-h-screen relative overflow-x-hidden">
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[100%] md:w-[60%] h-[60%] bg-purple-900/10 blur-[150px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[100%] md:w-[60%] h-[60%] bg-green-900/10 blur-[150px] rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
       </div>
       {!isMobile && (
         <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 h-16">
           <div className="max-w-7xl mx-auto px-10 h-full flex items-center justify-between">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setActiveTab('home'); setSelectedProfile(null); }}>
                <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-lg object-cover" />
                <span className="font-black text-xl italic uppercase">{siteSettings.siteName}</span>
              </div>
              <div className="flex items-center gap-4">
                 <DesktopNavBtn active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setSelectedProfile(null); }} Icon={Home} label="Mural" />
                 <DesktopNavBtn active={activeTab === 'community'} onClick={() => { setActiveTab('community'); setSelectedProfile(null); }} Icon={ImageIcon} label="Galeria" />
                 <DesktopNavBtn active={activeTab === 'lore'} onClick={() => { setActiveTab('lore'); setSelectedProfile(null); }} Icon={Book} label="Lore" />
                 <DesktopNavBtn active={activeTab === 'teams'} onClick={() => { setActiveTab('teams'); setSelectedProfile(null); }} Icon={Users} label="Nações" />
                 <button onClick={() => setShowOracle(true)} className="p-2 bg-purple-600/20 text-purple-400 rounded-lg"><BrainCircuit size={20}/></button>
                 <button onClick={() => { setActiveTab('admin'); setSelectedProfile(null); }} className={`p-2 rounded-lg transition ${activeTab === 'admin' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:bg-white/10'}`}><LayoutDashboard size={20}/></button>
              </div>
           </div>
         </nav>
       )}
       <main className={`relative z-10 max-w-7xl mx-auto ${isMobile ? 'px-4 pb-24 pt-6' : 'px-10 py-12'}`}>{children}</main>
       {isMobile && (
         <nav className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/5 h-16 flex items-center justify-around px-4 z-[100]">
           <MobileNavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural" />
           <MobileNavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
           <MobileNavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Lore" />
           <MobileNavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Nações" />
         </nav>
       )}
       {showOracle && <OracleModal />}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <MainLayout>
        {selectedProfile ? <ProfileView player={selectedProfile} /> : (
          <>
            {activeTab === 'home' && (
              <div className="space-y-12 animate-in fade-in duration-700">
                <div className="relative rounded-[2.5rem] overflow-hidden aspect-video md:aspect-[21/9] flex items-center justify-center border border-white/5 shadow-2xl">
                  <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" />
                  <div className="relative text-center">
                    <h2 className="text-yellow-500 font-black text-4xl md:text-7xl uppercase italic tracking-tighter">As Nações</h2>
                    <p className="text-gray-400 tracking-[0.5em] uppercase text-[8px] md:text-xs font-bold mt-2">Protocolo Eternus Ativado</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                   <div className="lg:col-span-8 space-y-10">
                     {posts.map(p => (
                       <article key={p.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-xl">
                          <div className="p-6 border-b border-white/5 flex items-center gap-4">
                             <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-full" />
                             <h4 className="font-black text-xs uppercase text-white tracking-widest">{p.title}</h4>
                          </div>
                          {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover max-h-[500px]" />}
                          <div className="p-8 text-gray-300 leading-relaxed text-sm md:text-lg">{p.content}</div>
                       </article>
                     ))}
                   </div>
                   {!isMobile && (
                     <aside className="lg:col-span-4 space-y-6">
                        <SideCard color="#bc13fe" name="Andromeda" desc="Reconstruir a glória humana." />
                        <SideCard color="#22c55e" name="Helix" desc="Simbiose com a radiação Arkanis." />
                     </aside>
                   )}
                </div>
              </div>
            )}

            {activeTab === 'community' && (
              <div className="space-y-10">
                 <div className="text-center space-y-2">
                   <h2 className="text-5xl font-black italic uppercase tracking-tighter">Galeria</h2>
                   <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full"></div>
                 </div>

                 {/* LOGIN INLINE NA GALERIA */}
                 {!isRealUser && !isAdmin && (
                   <div className="max-w-md mx-auto bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 shadow-2xl text-center space-y-6">
                      <Lock size={32} className="mx-auto text-blue-500" />
                      <h3 className="font-black uppercase italic">Acesso à Galeria</h3>
                      {authError && <p className="text-[10px] text-red-500 uppercase font-black">{authError}</p>}
                      <form onSubmit={handlePlayerAuth} className="space-y-3">
                         <input type="email" placeholder="EMAIL" className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs outline-none" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                         <input type="password" placeholder="SENHA" className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs outline-none" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                         <button className="w-full bg-blue-600 p-4 rounded-xl font-black uppercase text-[10px]">{authMode === 'login' ? 'Entrar' : 'Registrar'}</button>
                      </form>
                      <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[9px] text-gray-500 uppercase hover:text-white underline">{authMode === 'login' ? 'Criar nova conta' : 'Já tenho conta'}</button>
                   </div>
                 )}

                 {(isAdmin || isRealUser) && (
                    <div className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 shadow-2xl space-y-6">
                       <div className="flex justify-between items-center">
                          <span className="font-black uppercase text-[10px] text-blue-500 italic">Novo Registro</span>
                          {isRealUser && <button onClick={() => signOut(auth)} className="text-[8px] text-red-500 uppercase font-black">Sair</button>}
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                             {isAdmin ? (
                               <select className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs uppercase" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                                  <option value="">QUEM POSTA?</option>
                                  {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                               </select>
                             ) : <div className="bg-black p-4 rounded-xl border border-blue-600/20 text-blue-400 text-xs font-black uppercase">Lorde: {loggedPlayer?.name}</div>}
                             <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-4 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:bg-white/5 transition-all">
                                <span className="text-[10px] font-black uppercase text-gray-500">{isUploading ? uploadProgress : 'Anexar Mídia'}</span>
                             </div>
                             <input type="file" ref={commFileInputRef} className="hidden" onChange={e => handleUpload(e, 'community')} />
                          </div>
                          <div className="space-y-2">
                             <textarea placeholder="Relato..." className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs h-24 outline-none focus:border-blue-500" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                             <button onClick={handleCinematize} className="w-full bg-purple-600/10 text-purple-400 p-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 border border-purple-600/20"><Sparkles size={12}/> Cronizar via IA</button>
                          </div>
                       </div>
                       <button onClick={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="w-full bg-blue-600 p-4 rounded-xl font-black uppercase text-xs">Publicar na Galeria</button>
                    </div>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {communityPosts.map(p => (
                       <div key={p.id} className="bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/5 shadow-lg">
                          {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover aspect-square cursor-pointer" onClick={() => { const authorPlayer = players.find(pl => pl.name === p.author); if (authorPlayer) setSelectedProfile(authorPlayer); }} />}
                          <div className="p-4 flex items-center gap-3">
                             <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-black text-xs text-white">{String(p.author).charAt(0)}</div>
                             <h4 className="font-black text-[10px] uppercase text-white truncate cursor-pointer hover:text-blue-400" onClick={() => { const authorPlayer = players.find(pl => pl.name === p.author); if (authorPlayer) setSelectedProfile(authorPlayer); }}>{p.author}</h4>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'lore' && (
              <div className="max-w-4xl mx-auto space-y-16 py-6 animate-in slide-in-from-bottom duration-500">
                <header className="text-center"><h2 className="text-6xl font-black italic uppercase tracking-tighter text-yellow-500 drop-shadow-2xl">Lore</h2></header>
                <div className="space-y-12">
                   <LoreChapter num="I" title="A Era do Arkanis">Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente. Naquele tempo, as nações exploravam e experimentavam com magia e novas tecnologias, todas com potencial enorme. Porém, a ganância dessas nações era tremenda, e elas competiam entre si por poderio econômico. O recurso mais cobiçado por todas as nações era o Arkanis, um recurso lendário que podia ser usado tanto para avanços tecnológicos quanto para avanços na magia.</LoreChapter>
                   <LoreChapter num="II" title="O Olho de Hórus">Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder: uma máquina mágica que usava tecnologia dimensional, magia pura e Arkanis com o intuito de gerar energia e magia infinitas. O nome dessa máquina era "O Olho de Hórus". Mas algo aconteceu. A máquina não funcionou do jeito que previram. Na verdade, ela tornou o tecido da realidade extremamente fino, fazendo com que portais e fissuras na terra se abrissem por todo o globo.</LoreChapter>
                </div>
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="space-y-20 pb-20">
                 <TeamSection color="#bc13fe" name="Andromeda" players={displayAndromeda} onPlayerClick={setSelectedProfile} isMobile={isMobile} />
                 <TeamSection color="#22c55e" name="Helix" players={displayHelix} reverse onPlayerClick={setSelectedProfile} isMobile={isMobile} />
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="max-w-4xl mx-auto py-10 space-y-12">
                 {!isAdmin ? (
                   <div className="bg-[#0a0a0a] p-12 md:p-20 rounded-[3rem] border border-white/5 text-center shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                      <Lock size={48} className="mx-auto mb-6 text-yellow-500" />
                      <h2 className="text-4xl font-black italic uppercase mb-10 tracking-tighter">Terminal Master</h2>
                      {authError && <p className="mb-6 text-red-500 font-black uppercase text-xs animate-pulse">{authError}</p>}
                      <form onSubmit={handleAdminLogin} className="max-w-xs mx-auto space-y-4">
                         {!isRealUser && (
                           <>
                              <input type="email" placeholder="EMAIL" className="w-full bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                              <input type="password" placeholder="SENHA" className="w-full bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none" value={adminAuthPass} onChange={e => setAdminAuthPass(e.target.value)} />
                           </>
                         )}
                         <input type="password" placeholder="CHAVE MESTRA" className="w-full bg-black border border-white/5 p-4 rounded-xl text-center font-black outline-none focus:border-yellow-500" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                         <button className="w-full bg-yellow-500 text-black font-black p-4 rounded-xl uppercase text-xs shadow-xl active:scale-95 transition-all">Aceder Portal</button>
                      </form>
                   </div>
                 ) : (
                    <div className="space-y-12">
                       <header className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 flex justify-between items-center shadow-xl">
                          <div><h3 className="font-black text-2xl uppercase italic">Comandante {adminRole}</h3><p className="text-[10px] text-yellow-500 uppercase font-black">Sessão Segura</p></div>
                          <div className="flex gap-3">
                             {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-xl transition-all ${showSettings ? 'bg-yellow-500 text-black shadow-lg' : 'bg-white/5'}`}><Settings size={22}/></button>}
                             <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20"><LogOut size={22}/></button>
                          </div>
                       </header>
                       {showSettings && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95">
                            <div className="bg-yellow-500/5 p-10 rounded-[2.5rem] border border-yellow-500/20 space-y-6">
                               <h4 className="font-black uppercase italic text-yellow-500">Identidade Site</h4>
                               <div className="flex items-center gap-6">
                                  <img src={siteSettings.logoUrl} className="w-20 h-20 rounded-2xl object-cover border-2 border-yellow-500/30" />
                                  <button onClick={() => logoInputRef.current?.click()} className="flex-1 bg-yellow-500 text-black font-black p-4 rounded-xl uppercase text-xs">Mudar Logo</button>
                                  <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoUpdate} />
                               </div>
                            </div>
                            <div className="bg-blue-500/5 p-10 rounded-[2.5rem] border border-blue-500/20 space-y-4">
                               <h4 className="font-black uppercase italic text-blue-400">GitHub API</h4>
                               <input type="password" placeholder="TOKEN" className="w-full bg-black border border-white/5 p-3 rounded-xl font-black text-xs" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} />
                               <div className="grid grid-cols-2 gap-4">
                                  <input type="text" placeholder="DONO" className="bg-black border border-white/5 p-3 rounded-xl font-black text-xs" value={ghConfig.owner} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} />
                                  <input type="text" placeholder="REPO" className="bg-black border border-white/5 p-3 rounded-xl font-black text-xs" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} />
                               </div>
                               <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), ghConfig); setShowSettings(false); }} className="w-full bg-blue-600 p-3 rounded-xl font-black uppercase text-xs shadow-lg">Guardar Chaves</button>
                            </div>
                         </div>
                       )}
                       <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 space-y-10 shadow-2xl relative overflow-hidden">
                          <h3 className="text-3xl font-black italic uppercase text-yellow-500 tracking-tighter"><Plus size={32} className="inline mr-4"/> Disparar Mural</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                             <div className="space-y-4">
                                <div onClick={() => !isUploading && fileInputRef.current?.click()} className="aspect-video bg-black border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all">
                                   {newPost.mediaUrl ? <img src={newPost.mediaUrl} className="w-full h-full object-cover rounded-3xl" /> : <Camera size={48} className="text-gray-800" />}
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'official')} />
                             </div>
                             <form onSubmit={createPost} className="space-y-5">
                                <input type="text" placeholder="TÍTULO" className="w-full bg-black border border-white/5 p-5 rounded-2xl font-black uppercase text-sm focus:border-yellow-500 outline-none" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                                <textarea placeholder="Relatório operacional..." className="w-full bg-black border border-white/5 p-6 rounded-2xl h-40 font-medium text-lg focus:border-yellow-500 outline-none" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}></textarea>
                                <button className="w-full bg-yellow-500 text-black font-black p-5 rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-all">Publicar Agora</button>
                             </form>
                          </div>
                       </div>
                       <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 space-y-10 shadow-2xl">
                         <h3 className="text-3xl font-black italic uppercase text-green-500 tracking-tighter"><Users size={32} className="inline mr-4"/> Alistar Membros</h3>
                         <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                            <form onSubmit={addPlayer} className="md:col-span-5 space-y-5">
                               <input type="text" placeholder="NOME" className="w-full bg-black border border-white/5 p-5 rounded-2xl font-black uppercase text-sm focus:border-green-500 outline-none shadow-inner" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
                               <input type="email" placeholder="E-MAIL" className="w-full bg-black border border-white/5 p-5 rounded-2xl font-black text-xs focus:border-green-500 outline-none shadow-inner" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
                               <select className="w-full bg-black border border-white/5 p-5 rounded-2xl font-black uppercase text-xs focus:border-green-500 outline-none shadow-inner" value={newPlayer.team} onChange={e => setNewPlayer({...newPlayer, team: e.target.value})}>
                                  <option value="andromeda">Nação Andrômeda</option>
                                  <option value="helix">Nação Hélix</option>
                               </select>
                               <button className="w-full bg-green-600 text-white font-black p-6 rounded-[2rem] uppercase tracking-widest hover:bg-green-500 shadow-2xl active:scale-95 transition-all">Alistar Lorde</button>
                            </form>
                            <div className="md:col-span-7 space-y-3 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                               {players.map(p => (
                                 <div key={p.id} className="flex items-center justify-between bg-black p-4 rounded-2xl border border-white/5">
                                   <div className="flex items-center gap-4">
                                      <span className={`w-3 h-3 rounded-full ${p.team === 'andromeda' ? 'bg-[#bc13fe] shadow-[0_0_10px_#bc13fe]' : 'bg-[#22c55e] shadow-[0_0_10px_#22c55e]'}`}></span>
                                      <h4 className="font-black text-white uppercase text-xs truncate max-w-[120px]">{p.name}</h4>
                                   </div>
                                   <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id))} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-90"><Trash2 size={16}/></button>
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
      </MainLayout>
    </div>
  );
}

// --- SUBCOMPONENTES ---

function DesktopNavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all duration-300 ${active ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
       <Icon size={16} /> <span>{label}</span>
    </button>
  );
}

function MobileNavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-yellow-500 scale-110' : 'text-gray-600'}`}>
      <Icon size={22} /><span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function TeamSection({ color, name, players, reverse, isMobile, onPlayerClick }) {
  return (
    <div className={`flex flex-col ${reverse ? 'lg:items-end lg:text-right' : 'lg:items-start'} space-y-12`}>
      <div className={reverse ? 'text-right' : 'text-left'}>
         <div className={`h-1.5 w-24 rounded-full mb-4 shadow-lg ${reverse ? 'ml-auto' : ''}`} style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}></div>
         <h2 className={`font-black italic uppercase tracking-tighter leading-none ${isMobile ? 'text-5xl' : 'text-8xl'}`} style={{color}}>{name}</h2>
      </div>
      <div className={`grid w-full gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {players.map(p => (
          <div key={p.id} onClick={() => onPlayerClick(p)} className="bg-[#0a0a0a] p-6 rounded-[1.5rem] border-b-8 font-black italic text-2xl shadow-xl flex items-center justify-between group overflow-hidden relative transition-all hover:-translate-y-2" style={{ borderBottomColor: color }}>
            <img src={p.photoUrl || 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop'} className="w-10 h-10 rounded-full object-cover border border-white/10" />
            <span className="relative z-10 truncate text-white group-hover:text-white transition-colors">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SideCard({ color, name, desc }) {
  return (
    <div className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-3">
       <h4 className="font-black text-2xl italic uppercase leading-none tracking-tighter" style={{color}}>{name}</h4>
       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">{desc}</p>
       <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
          <div className="h-full w-[40%] group-hover:w-full transition-all duration-[2000ms] ease-out" style={{backgroundColor: color, boxShadow: `0 0 15px ${color}`}}></div>
       </div>
    </div>
  );
}

function StatusLine({ label, value, color }) {
  return (
    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-4">
       <span className="text-gray-600">{label}</span>
       <span className={`${color} italic drop-shadow-[0_0_5px_currentColor]`}>{value}</span>
    </div>
  );
}

function LoreChapter({ num, title, children }) {
  return (
    <section className="bg-[#050505] p-10 rounded-[3rem] border border-white/5 shadow-2xl hover:border-yellow-500/20 transition-all relative overflow-hidden group">
      <div className="absolute -top-10 -left-10 text-[180px] font-black text-white/[0.01] italic select-none group-hover:text-yellow-500/5 transition-all">{num}</div>
      <div className="relative z-10 flex items-center gap-8 mb-8">
        <span className="text-7xl font-black text-white/[0.05] italic leading-none">{num}</span>
        <h3 className="text-3xl font-black text-yellow-500 uppercase italic tracking-tighter group-hover:translate-x-3 transition-transform">{title}</h3>
      </div>
      <p className="relative z-10 text-gray-400 leading-[2.2] font-medium text-justify border-l-4 border-white/10 pl-10 text-xl group-hover:text-gray-300 transition-colors">{children}</p>
    </section>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, setDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from 'firebase/auth';
import { 
  Book, LayoutDashboard, LogOut, Plus, Trash2, 
  Users, Home, MessageSquare, AlertTriangle,
  Camera, Settings, Loader2, Palette, Lock, Link as LinkIcon, ImageIcon, User, Globe, ChevronRight
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

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null); 
  const [isMobile, setIsMobile] = useState(false);
  
  // Estados de Dados
  const [posts, setPosts] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]); 
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');

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

  // Configurações do Site
  const [siteSettings, setSiteSettings] = useState({
    logoUrl: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop',
    siteName: 'NÊMESIS 2'
  });
  const [ghConfig, setGhConfig] = useState({ token: '', owner: '', repo: '', path: 'media' });
  const [showSettings, setShowSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Refs
  const fileInputRef = useRef(null);
  const commFileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // Detetar Dispositivo
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch (e) { console.error(e); }
      }
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
    return () => unsubAuth();
  }, [user]);

  // Variaveis de exibição
  const displayAndromeda = players.filter(p => p.team === 'andromeda');
  const displayHelix = players.filter(p => p.team === 'helix');
  const isRealUser = user && !user.isAnonymous;
  const loggedPlayer = isRealUser ? players.find(p => p.email?.toLowerCase() === user.email?.toLowerCase()) : null;

  // --- LÓGICA GITHUB ---
  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token || !ghConfig.owner || !ghConfig.repo) throw new Error("Chaves do GitHub ausentes no Painel!");
    const path = subPath || 'media';
    const fileName = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const content = reader.result.split(',')[1];
          const resp = await fetch(`https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${path}/${fileName}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${ghConfig.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Upload: ${fileName}`, content })
          });
          if (!resp.ok) throw new Error("GitHub rejeitou o upload.");
          const data = await resp.json();
          resolve(data.content.download_url);
        } catch (e) { reject(e); }
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
      const url = await uploadToGitHub(file, target === 'official' ? 'official' : 'community');
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      if (target === 'official') setNewPost(p => ({ ...p, mediaUrl: url, mediaType: type }));
      else setNewCommPost(p => ({ ...p, mediaUrl: url, mediaType: type }));
      setUploadProgress('Concluído!');
    } catch (err) { setGlobalError(err.message); }
    finally { setIsUploading(false); setTimeout(() => setUploadProgress(''), 3000); }
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

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (!isRealUser) await signInWithEmailAndPassword(auth, adminEmail, adminAuthPass);
      if (adminPass === 'ROGZINHU-T10b20cd00n804') { setIsAdmin(true); setAdminRole('master'); }
      else if (adminPass === 'ADMNEMESIS15') { setIsAdmin(true); setAdminRole('admin'); }
      else { setAuthError('Chave master incorreta.'); }
    } catch (err) { setAuthError('Terminal recusou acesso.'); }
  };

  const createPost = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), { 
      ...newPost, author: adminRole === 'master' ? 'Master' : 'ADM', timestamp: Date.now() 
    });
    setNewPost({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const createCommPost = async (e, forceName) => {
    e.preventDefault();
    const name = forceName || newCommPost.author;
    if (!name || (!newCommPost.content && !newCommPost.mediaUrl)) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community'), { 
      ...newCommPost, author: name, timestamp: Date.now() 
    });
    setNewCommPost({ author: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name || !newPlayer.email) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'players'), { ...newPlayer, timestamp: Date.now() });
    setNewPlayer({ name: '', team: 'andromeda', link: '', email: '' });
  };

  // --- INTERFACE MOBILE ---
  const MobileUI = () => (
    <div className="pb-24 px-4 pt-6 space-y-8 animate-in fade-in duration-500 relative z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-lg object-cover" alt="Logo" />
          <h1 className="font-black text-xl italic uppercase tracking-tighter">{siteSettings.siteName}</h1>
        </div>
        <button onClick={() => setActiveTab('admin')} className={`p-2 rounded-xl transition ${activeTab === 'admin' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-white/5'}`}><LayoutDashboard size={20}/></button>
      </div>

      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-white/5 shadow-2xl">
            <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" />
            <div className="relative text-center">
              <h2 className="text-yellow-500 font-black text-4xl uppercase italic">As Nações</h2>
              <p className="text-gray-400 text-[8px] font-bold tracking-[0.4em] uppercase">Protocolo Eternus</p>
            </div>
          </div>
          <div className="space-y-4">
            {posts.map(p => (
              <article key={p.id} className="bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden shadow-xl">
                {p.mediaUrl && <img src={p.mediaUrl} className="w-full aspect-video object-cover" />}
                <div className="p-4 space-y-2">
                  <h4 className="font-black uppercase text-[11px] text-white leading-tight">{p.title}</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed">{p.content}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="space-y-6">
          <div className="text-center"><h2 className="text-3xl font-black italic uppercase">Galeria</h2><div className="w-12 h-1 bg-blue-600 mx-auto rounded-full mt-2 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div></div>
          {(isAdmin || isRealUser) && (
            <div className="bg-[#0a0a0a] p-5 rounded-xl border border-white/5 space-y-4 shadow-2xl">
              <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-4 border-2 border-dashed border-white/20 rounded-lg text-center text-[10px] uppercase font-black text-gray-500 bg-black">
                {isUploading ? uploadProgress : 'Anexar Print'}
              </div>
              <textarea placeholder="Mensagem..." className="w-full bg-black border border-white/5 p-3 rounded-lg text-xs h-20 outline-none focus:border-blue-500" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
              <button disabled={isUploading} onClick={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="w-full bg-blue-600 p-3 rounded-lg font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Publicar na Galeria</button>
              <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'community')} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            {communityPosts.map(p => (
              <div key={p.id} className="bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/5">
                {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover" alt="Community" />}
                <div className="p-3 flex items-center gap-3 bg-white/[0.01]">
                   <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-lg">{String(p.author).charAt(0)}</div>
                   <h4 className="font-black text-[10px] uppercase text-white truncate tracking-tight">{p.author}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-12 pb-10">
          <TeamSection color="#bc13fe" name="Andromeda" players={displayAndromeda} isMobile />
          <TeamSection color="#22c55e" name="Helix" players={displayHelix} isMobile />
        </div>
      )}

      {activeTab === 'lore' && (
        <div className="space-y-8 pb-10">
           <header className="text-center"><h2 className="text-4xl font-black italic uppercase text-yellow-500">Crônicas</h2></header>
           <LoreChapter num="I" title="A Era do Arkanis">Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente...</LoreChapter>
           <LoreChapter num="II" title="O Olho de Hórus">Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder: uma máquina mágica...</LoreChapter>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-2xl border-t border-white/5 h-16 flex items-center justify-around px-4 z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <MobileNavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Início" />
        <MobileNavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
        <MobileNavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Lore" />
        <MobileNavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Times" />
      </nav>
    </div>
  );

  // --- INTERFACE DESKTOP ---
  const DesktopUI = () => (
    <div className="relative z-10 animate-in fade-in duration-700">
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 h-16 shadow-2xl">
        <div className="max-w-7xl mx-auto px-10 h-full flex items-center justify-between">
           <div className="flex items-center gap-5 cursor-pointer group" onClick={() => setActiveTab('home')}>
             <img src={siteSettings.logoUrl} className="w-12 h-12 rounded-lg object-cover border border-white/10 group-hover:border-yellow-500/50 transition-all shadow-xl" alt="Logo" />
             <span className="font-black text-2xl tracking-tighter uppercase italic text-white group-hover:text-yellow-500 transition-colors">{siteSettings.siteName}</span>
           </div>
           <div className="flex items-center gap-3">
             <DesktopNavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural" />
             <DesktopNavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
             <DesktopNavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Crónicas" />
             <DesktopNavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Conselho" />
             <button onClick={() => { setActiveTab('admin'); setAuthError(''); }} className={`ml-4 p-3 rounded-xl transition-all duration-300 ${activeTab === 'admin' ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)] scale-110' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}>
                <LayoutDashboard size={20} />
             </button>
           </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-10 py-12 space-y-20">
        {activeTab === 'home' && (
          <div className="space-y-20 animate-in zoom-in-95 duration-700">
            <div className="relative rounded-[3.5rem] overflow-hidden aspect-[21/9] flex items-center justify-center border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)] group">
              <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.15] transition-transform duration-1000 group-hover:scale-105" alt="Hero" />
              <div className="relative text-center space-y-4">
                <h2 className="text-yellow-500 font-black text-8xl uppercase italic tracking-tighter drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]">As Nações</h2>
                <p className="text-gray-400 tracking-[1.2em] uppercase text-sm font-bold opacity-70 animate-pulse">Sincronização Eternus Ativa</p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-12">
               <div className="col-span-8 space-y-12">
                 <h3 className="text-2xl font-black flex items-center gap-4 text-yellow-500 uppercase italic tracking-tighter"><MessageSquare size={32} className="opacity-50"/> Transmissões de Comando</h3>
                 {posts.map(p => (
                   <article key={p.id} className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] overflow-hidden hover:border-white/10 transition-all duration-500 shadow-2xl">
                      <div className="p-8 bg-white/[0.01] border-b border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-5">
                            <img src={siteSettings.logoUrl} className="w-12 h-12 rounded-full border-2 border-yellow-500/20 object-cover" />
                            <div>
                               <h4 className="font-black text-sm uppercase text-white tracking-widest">{p.title}</h4>
                               <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">Autorizado por {p.author}</p>
                            </div>
                         </div>
                         <div className="text-[9px] font-black uppercase text-gray-700 tracking-widest italic">{new Date(p.timestamp).toLocaleString()}</div>
                      </div>
                      {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover max-h-[600px]" />}
                      <div className="p-12"><p className="text-gray-300 text-xl leading-relaxed font-medium whitespace-pre-wrap">{p.content}</p></div>
                   </article>
                 ))}
               </div>
               <aside className="col-span-4 space-y-8 sticky top-32 h-fit">
                  <SideCard color="#bc13fe" name="Andromeda" desc="Reconstituir a glória humana através da tecnologia das Arcas ancestrais." />
                  <SideCard color="#22c55e" name="Helix" desc="Aperfeiçoar a biologia para coexistir com a nova radiação Arkanis." />
                  <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3rem] space-y-6 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 opacity-20"></div>
                      <h4 className="font-black uppercase text-yellow-500 flex items-center gap-3 italic tracking-tighter text-xl"><AlertTriangle size={24}/> Status Global</h4>
                      <StatusLine label="Lords Registados" value={players.length} color="text-blue-500" />
                      <StatusLine label="Terminal" value={isAdmin ? "MESTRE" : "ATIVO"} color="text-yellow-500" />
                  </div>
               </aside>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-16 animate-in slide-in-from-bottom-4 duration-700">
             <div className="flex justify-between items-end border-b border-white/5 pb-10">
                <div>
                  <h2 className="text-7xl font-black italic uppercase tracking-tighter">Galeria</h2>
                  <p className="text-gray-500 uppercase font-black tracking-[0.8em] text-xs mt-4">Registos Visuais da População</p>
                </div>
                {(isAdmin || isRealUser) && (
                  <button onClick={() => signOut(auth)} className="px-10 py-5 bg-red-500/5 text-red-500 rounded-2xl font-black uppercase text-xs hover:bg-red-500/10 border border-red-500/20 transition-all shadow-xl active:scale-95">Encerrar Sessão</button>
                )}
             </div>
             {(isAdmin || isRealUser) && (
                <div className="bg-[#0a0a0a] p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse"></div>
                   <form onSubmit={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="space-y-10">
                      <div className="grid grid-cols-2 gap-10">
                         <div className="space-y-6">
                            {isAdmin ? (
                              <select className="bg-black border border-white/5 p-6 rounded-2xl font-black uppercase text-sm focus:border-blue-500 outline-none shadow-inner w-full cursor-pointer" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                                <option value="">IDENTIFICAR AUTOR</option>
                                {players.sort((a,b) => a.name.localeCompare(b.name)).map(pl => <option key={pl.id} value={pl.name}>{pl.name}</option>)}
                              </select>
                            ) : <div className="bg-black p-6 rounded-2xl border border-blue-600/30 font-black uppercase text-sm text-blue-400 flex items-center gap-4 shadow-inner"><User size={22} className="opacity-50"/> Lorde: {loggedPlayer?.name || user.email}</div>}
                            <div className="relative group">
                               <Globe size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-blue-500 transition-colors" />
                               <input type="text" placeholder="COLE O LINK DE MÍDIA EXTERNA (YouTube, Imgur, Discord...)" className="w-full bg-black border border-white/5 p-6 pl-16 rounded-2xl font-black text-xs focus:border-blue-500 outline-none transition-all uppercase shadow-inner" value={newCommPost.mediaUrl.startsWith('http') ? newCommPost.mediaUrl : ''} onChange={e => setNewCommPost({...newCommPost, mediaUrl: e.target.value, mediaType: (e.target.value.includes('youtu') ? 'video' : 'image')})} />
                            </div>
                         </div>
                         <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-6 border-4 border-dashed border-white/5 rounded-3xl text-center bg-black cursor-pointer hover:bg-white/[0.03] transition-all flex flex-col items-center justify-center gap-4">
                            {newCommPost.mediaUrl && !newCommPost.mediaUrl.startsWith('http') ? <span className="text-green-500 font-black text-xs">ARQUIVO PRONTO ✓</span> : <><ImageIcon size={32} className="text-gray-700"/><span className="font-black uppercase text-[10px] text-gray-600 tracking-widest">{isUploading ? uploadProgress : 'Carregar do PC (Max 25MB)'}</span></>}
                         </div>
                      </div>
                      <textarea placeholder="Partilhe o seu progresso ou momento..." className="w-full bg-black border border-white/5 p-8 rounded-[2.5rem] h-48 font-medium text-xl focus:border-blue-500 outline-none shadow-inner resize-none transition-all" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                      <button disabled={isUploading} className="w-full bg-blue-600 p-8 rounded-[2.5rem] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-blue-500 active:scale-95 transition-all text-lg">Publicar Registro na Galeria</button>
                      <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'community')} />
                   </form>
                </div>
             )}

             <div className="columns-3 gap-10 space-y-10 pb-20">
                {communityPosts.map(p => (
                  <div key={p.id} className="break-inside-avoid bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-blue-500/30 transition-all duration-700 shadow-2xl hover:-translate-y-3">
                     {p.mediaUrl && (
                       <div className="relative overflow-hidden">
                          {p.mediaType === 'video' ? <video src={p.mediaUrl} controls className="w-full" /> : <img src={p.mediaUrl} className="w-full transition-transform duration-1000 group-hover:scale-110" alt="Capture" />}
                       </div>
                     )}
                     <div className="p-8">
                       <div className="flex items-center gap-4 mb-6">
                         <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center font-black text-xl text-white shadow-xl group-hover:rotate-12 transition-transform">{String(p.author).charAt(0)}</div>
                         <div>
                           <h4 className="font-black text-xs uppercase text-white group-hover:text-blue-400 transition-colors tracking-widest">{p.author}</h4>
                           <p className="text-[9px] text-gray-700 uppercase font-black mt-1">{new Date(p.timestamp).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <p className="text-gray-400 text-base leading-[1.8] font-medium">{p.content}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-40 pb-40">
             <TeamSection color="#bc13fe" name="Andromeda" players={displayAndromeda} />
             <TeamSection color="#22c55e" name="Helix" players={displayHelix} reverse />
          </div>
        )}

        {activeTab === 'lore' && (
          <div className="max-w-4xl mx-auto space-y-24 pb-32">
             <div className="text-center">
               <h2 className="text-8xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl">As Crónicas</h2>
               <p className="text-gray-700 uppercase font-black tracking-[1.5em] text-xs mt-6 opacity-40">Arquivo da Humanidade</p>
             </div>
             <LoreChapter num="I" title="A Era do Arkanis">Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente. Naquele tempo, as nações exploravam e experimentavam com magia e novas tecnologias, todas com potencial enorme. Porém, a ganância dessas nações era tremenda, e elas competiam entre si por poderio econômico. O recurso mais cobiçado por todas as nações era o Arkanis, um recurso lendário que podia ser usado tanto para avanços tecnológicos quanto para avanços na magia.</LoreChapter>
             <LoreChapter num="II" title="O Olho de Hórus">Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder: uma máquina mágica que usava tecnologia dimensional, magia pura e Arkanis com o intuito de gerar energia e magia infinitas. O nome dessa máquina era "O Olho de Hórus". Mas algo aconteceu. A máquina não funcionou do jeito que previram. Na verdade, ela tornou o tecido da realidade extremamente fino, fazendo com que portais e fissuras na terra se abrissem por todo o globo.</LoreChapter>
             <LoreChapter num="III" title="A Guerra dos Nêmesis">As nações mais poderosas se fecharam e culpavam umas às outras pelo ocorrido. Em meio à briga e ao desespero, dois grupos se formaram: os Ferronatos e os Etéreos. Os Ferronatos culpavam a magia, acreditando que ela era volátil, incontrolável e selvagem. Em contrapartida, os Etéreos culpavam a tecnologia, alegando que ela corrompia as mentes, destruía o ecossistema e deturpava o equilíbrio da vida. No fim, por causa da escassez de recursos básicos, Ferronatos e Etéreos entraram em conflito, ambos os lados usando suas armas mais poderosas na tentativa de aniquilar o outro. Este conflito ficou marcado na história como a Guerra dos Nêmesis.</LoreChapter>
             <LoreChapter num="IV" title="Protocolo Eternus">Em meio ao conflito, um grupo de pessoas composto por cientistas, engenheiros, magos e feiticeiros se uniu, pois possuíam pensamentos convergentes e notoriamente menos extremos. Juntos, eles utilizaram o que sobrou do Olho de Hórus e criaram o "Protocolo Eternus". O intuito deste protocolo era preservar a raça humana da inevitável destruição causada pela Guerra dos Nêmesis. Com isso, diversas arcas foram construídas junto de um grande satélite e lançadas ao espaço em segredo. Entretanto, o projeto acabou sendo vazado em seu momento mais crítico, fazendo com que os radicais Ferronatos e Etéreos atacassem as instalações do Protocolo Eternus, obrigando-o a ser lançado mais cedo que o esperado. Enquanto isso, Ferronatos e Etéreos se afundaram cada vez mais nos conflitos, até que, por fim, todo o mundo foi destruído.</LoreChapter>
             <LoreChapter num="V" title="O Despertar Prematuro">Durante o lançamento do Projeto Eternus, várias arcas foram perdidas e o satélite sofreu graves danos, mas, mesmo assim, a missão foi um sucesso. Contudo, uma grande quantidade de recursos foi perdida, fazendo com que os sistemas de hibernação das arcas, que mantinham os sobreviventes em estase por anos, falhassem e despertassem os passageiros mais cedo do que o esperado. Ao analisarem o planeta com os sistemas do satélite, os sobreviventes perceberam que o mundo havia mudado e anos haviam se passado, mas não o suficiente para que o planeta se purificasse por completo. Monstros muito mais perigosos rondavam a superfície, e o véu entre as dimensões ainda era muito fino. Ainda assim, havia esperança: a humanidade retornaria de suas cinzas e exploraria este novo mundo.</LoreChapter>
             <LoreChapter num="VI" title="O Nascimento das Nações">Durante a análise do planeta, o satélite mostrou que novos recursos foram formados e novas fontes de magia também foram encontradas, originadas da mistura de magia e radiação das guerras. Isso gerou uma divisão entre os sobreviventes: parte deles queria explorar esses novos recursos e reconstruir o império humano, evitando os erros do passado; já o outro grupo queria abandonar por completo o passado corrupto da humanidade e conviver no novo mundo em harmonia com sua nova forma. Dessa divisão de pensamentos, os grupos Andrômeda e Hélix nasceram, e agora eles disputam o futuro da raça humana.</LoreChapter>
          </div>
        )}

        {activeTab === 'admin' && (
           <div className="max-w-4xl mx-auto py-10">
              {!isAdmin ? (
                <div className="bg-[#0a0a0a] p-24 rounded-[4rem] border border-white/5 text-center shadow-[0_50px_150px_rgba(0,0,0,0.8)] relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)]"></div>
                   <Lock size={64} className="mx-auto mb-10 text-yellow-500 shadow-xl" />
                   <h2 className="text-5xl font-black italic uppercase mb-12 tracking-tighter">Terminal Master</h2>
                   <form onSubmit={handleAdminLogin} className="max-w-md mx-auto space-y-8">
                      {!isRealUser && (
                        <div className="grid grid-cols-2 gap-4">
                           <input type="email" placeholder="EMAIL" className="bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none focus:border-yellow-500 shadow-inner transition-all" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                           <input type="password" placeholder="SENHA" className="bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none focus:border-yellow-500 shadow-inner transition-all" value={adminAuthPass} onChange={e => setAdminAuthPass(e.target.value)} />
                        </div>
                      )}
                      <input type="password" placeholder="CHAVE MASTER" className="w-full bg-black border border-white/5 p-6 rounded-[2rem] text-center font-black focus:border-yellow-500 outline-none text-xl shadow-inner transition-all" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
                      <button className="w-full bg-yellow-500 text-black font-black p-6 rounded-[2rem] uppercase tracking-widest shadow-2xl hover:bg-yellow-400 active:scale-95 transition-all">Aceder ao Núcleo</button>
                   </form>
                </div>
              ) : (
                 <div className="space-y-12">
                    <header className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 flex justify-between items-center shadow-2xl">
                       <div><h3 className="font-black text-2xl uppercase italic leading-none">Comandante {adminRole}</h3><p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mt-2">Conexão Estabilizada</p></div>
                       <div className="flex gap-4">
                         {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-5 rounded-2xl transition-all shadow-xl ${showSettings ? 'bg-yellow-500 text-black shadow-yellow-500/20' : 'bg-white/5'}`}><Settings size={22}/></button>}
                         <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 active:scale-90 transition-all shadow-xl"><LogOut size={22}/></button>
                       </div>
                    </header>

                    {showSettings && (
                      <div className="grid grid-cols-2 gap-10 animate-in zoom-in-95 duration-500">
                        <div className="bg-yellow-500/5 p-12 rounded-[3.5rem] border border-yellow-500/20 space-y-8 shadow-2xl">
                           <h4 className="font-black uppercase text-yellow-500 italic text-xl tracking-tighter"><Palette size={24} className="inline mr-3 mb-1"/> Visual</h4>
                           <div className="flex items-center gap-8">
                              <img src={siteSettings.logoUrl} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-yellow-500/20" />
                              <button onClick={() => logoInputRef.current?.click()} className="flex-1 bg-yellow-500 text-black font-black p-5 rounded-2xl uppercase text-xs hover:bg-yellow-400 shadow-xl transition-all">Mudar Logo</button>
                              <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoUpdate} />
                           </div>
                        </div>
                        <div className="bg-blue-500/5 p-12 rounded-[4rem] border border-blue-500/20 space-y-6 shadow-2xl">
                           <h4 className="font-black uppercase text-blue-400 italic text-xl tracking-tighter"><Settings size={24} className="inline mr-3 mb-1"/> GitHub Master</h4>
                           <input type="password" placeholder="TOKEN" className="w-full bg-black border border-white/5 p-4 rounded-2xl font-black text-xs outline-none focus:border-blue-500 shadow-inner" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} />
                           <div className="grid grid-cols-2 gap-4">
                              <input type="text" placeholder="DONO" className="bg-black border border-white/5 p-4 rounded-2xl font-black text-xs outline-none shadow-inner" value={ghConfig.owner} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} />
                              <input type="text" placeholder="REPO" className="bg-black border border-white/5 p-4 rounded-2xl font-black text-xs outline-none shadow-inner" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} />
                           </div>
                           <button onClick={() => { setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), ghConfig); setShowSettings(false); setGlobalError('Sincronizadas com Sucesso!'); }} className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl uppercase text-[11px] hover:bg-blue-500 transition-all shadow-xl">Sincronizar Chaves</button>
                        </div>
                      </div>
                    )}

                    <div className="bg-[#0a0a0a] p-12 rounded-[4rem] border border-white/5 space-y-12 shadow-2xl relative overflow-hidden">
                       <h3 className="text-3xl font-black italic uppercase text-yellow-500"><Plus size={32} className="inline mr-4 mb-1"/> Disparar Mural</h3>
                       <div className="grid grid-cols-2 gap-12">
                          <div className="space-y-4">
                             <div onClick={() => !isUploading && fileInputRef.current?.click()} className="aspect-video bg-black border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-all group overflow-hidden relative shadow-inner">
                                {newPost.mediaUrl ? <img src={newPost.mediaUrl} className="w-full h-full object-cover" /> : <Camera size={64} className="text-gray-800 group-hover:text-yellow-500 transition-colors" />}
                                {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-pulse"><Loader2 className="animate-spin text-yellow-500" size={48}/></div>}
                             </div>
                             <p className="text-center text-[10px] font-black uppercase text-gray-700 tracking-widest italic">{isUploading ? uploadProgress : 'Anexar Mídia Oficial'}</p>
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'official')} />
                          </div>
                          <form onSubmit={createPost} className="space-y-5">
                             <input type="text" placeholder="TÍTULO" className="w-full bg-black border border-white/5 p-6 rounded-2xl font-black uppercase text-sm focus:border-yellow-500 outline-none shadow-inner transition-all" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                             <textarea placeholder="Relatório operacional..." className="w-full bg-black border border-white/5 p-8 rounded-[2.5rem] h-48 font-medium text-lg focus:border-yellow-500 outline-none shadow-inner resize-none transition-all" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}></textarea>
                             <button className="w-full bg-yellow-500 text-black font-black p-6 rounded-[2rem] uppercase tracking-[0.4em] shadow-2xl hover:bg-yellow-400 active:scale-95 transition-all text-sm">Publicar Agora</button>
                          </form>
                       </div>
                    </div>

                    <div className="bg-[#0a0a0a] p-12 rounded-[4rem] border border-white/5 space-y-10 shadow-2xl">
                      <h3 className="text-3xl font-black italic uppercase text-green-500 tracking-tighter"><Users size={32} className="inline mr-4 mb-1"/> Gerenciar Nações</h3>
                      <div className="grid grid-cols-12 gap-12">
                        <form onSubmit={addPlayer} className="col-span-5 space-y-5">
                           <input type="text" placeholder="NOME DO JOGADOR" className="w-full bg-black border border-white/5 p-5 rounded-2xl font-black uppercase text-sm outline-none focus:border-green-500 shadow-inner" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
                           <input type="email" placeholder="E-MAIL DE REGISTO" className="w-full bg-black border border-white/5 p-5 rounded-2xl font-black text-xs outline-none focus:border-green-500 shadow-inner" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
                           <select className="w-full bg-black border border-white/5 p-5 rounded-2xl font-black uppercase text-xs outline-none focus:border-green-500 shadow-inner" value={newPlayer.team} onChange={e => setNewPlayer({...newPlayer, team: e.target.value})}>
                              <option value="andromeda">Nação Andrômeda</option>
                              <option value="helix">Nação Hélix</option>
                           </select>
                           <button className="w-full bg-green-600 text-white font-black p-6 rounded-[2rem] uppercase tracking-widest hover:bg-green-500 shadow-2xl transition-all active:scale-95">Alistar na Arca</button>
                        </form>
                        <div className="col-span-7 space-y-3 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                           {players.map(p => (
                             <div key={p.id} className="flex items-center justify-between bg-black p-5 rounded-3xl border border-white/5 group hover:border-white/10 transition-all shadow-inner">
                               <div className="flex items-center gap-5">
                                  <span className={`w-3 h-3 rounded-full ${p.team === 'andromeda' ? 'bg-[#bc13fe] shadow-[0_0_10px_#bc13fe]' : 'bg-[#22c55e] shadow-[0_0_10px_#22c55e]'}`}></span>
                                  <div>
                                     <h4 className="font-black text-white uppercase text-sm tracking-tight">{p.name}</h4>
                                     <p className="text-[10px] text-blue-400 font-black tracking-widest mt-1 opacity-60">{p.email}</p>
                                  </div>
                               </div>
                               <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id))} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all shadow-lg active:scale-90"><Trash2 size={20}/></button>
                             </div>
                           ))}
                        </div>
                      </div>
                    </div>
                 </div>
              )}
           </div>
        )}
      </main>

      <footer className="mt-40 border-t border-white/5 py-32 text-center opacity-10 italic font-black uppercase tracking-[1em] text-[10px]">
        MMXXVI • PROTOCOLO ETERNUS
      </footer>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white overflow-x-hidden selection:bg-yellow-500/30">
       {/* LUZES AMBIENTES DINÂMICAS */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[80%] lg:w-[60%] h-[60%] bg-purple-900/20 blur-[150px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[80%] lg:w-[60%] h-[60%] bg-green-900/20 blur-[150px] rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
       </div>

       {isMobile ? <MobileUI /> : <DesktopUI />}

       {/* ALERTA FLUTUANTE PREMIUM */}
       {globalError && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 p-6 rounded-[2rem] text-[10px] font-black uppercase text-center z-[200] shadow-2xl border backdrop-blur-xl transition-all flex items-center gap-6 ${globalError.includes('Sucesso') || globalError.includes('Salvas') ? 'bg-green-600/90 border-green-400 text-white' : 'bg-red-600/90 border-red-400 text-white animate-shake'}`}>
          <span className="tracking-widest">⚠️ {globalError}</span>
          <button onClick={() => setGlobalError('')} className="bg-black/20 px-4 py-2 rounded-xl hover:bg-black/40 transition-colors uppercase">Fechar</button>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES ---

function DesktopNavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all duration-300 ${active ? 'bg-yellow-500 text-black shadow-[0_5px_15px_rgba(234,179,8,0.3)] scale-105' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
       <Icon size={16} className={active ? 'text-black' : 'text-gray-600'} /> 
       <span>{label}</span>
    </button>
  );
}

function MobileNavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-yellow-500 scale-110 drop-shadow-[0_0_10px_#eab308]' : 'text-gray-600'}`}>
      <Icon size={24} />
      <span className="text-[7px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function TeamSection({ color, name, players, reverse, isMobile }) {
  return (
    <div className={`flex flex-col ${reverse ? 'lg:items-end lg:text-right' : 'lg:items-start'} space-y-12`}>
      <div className={reverse ? 'text-right' : 'text-left'}>
         <div className={`h-1.5 w-24 rounded-full mb-4 shadow-lg ${reverse ? 'ml-auto' : ''}`} style={{ backgroundColor: color, boxShadow: `0 0 25px ${color}` }}></div>
         <h2 className={`font-black italic uppercase tracking-tighter leading-none ${isMobile ? 'text-5xl' : 'text-8xl'}`} style={{color}}>{name}</h2>
         <p className="text-gray-700 uppercase font-black tracking-[0.8em] text-[10px] mt-4 italic opacity-50">Membros Registados</p>
      </div>
      <div className={`grid w-full gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {players.length === 0 ? <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-3xl font-black uppercase text-[10px] text-gray-800 tracking-widest">Nação a aguardar recrutas</div> : 
          players.map(p => (
          <div key={p.id} className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border-b-8 font-black italic text-2xl shadow-2xl flex items-center justify-between group overflow-hidden relative transition-all hover:-translate-y-2 hover:bg-white/[0.02]" style={{ borderBottomColor: color }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-all"></div>
            <span className="relative z-10 truncate text-white/90 group-hover:text-white transition-colors">{p.name}</span>
            {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="relative z-10 p-3 bg-white/5 rounded-xl text-gray-600 hover:text-white hover:bg-white/10 transition-all"><LinkIcon size={20}/></a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SideCard({ color, name, desc }) {
  return (
    <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-4 group hover:border-white/10 transition-all overflow-hidden relative">
       <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.02] rounded-full group-hover:scale-125 transition-all"></div>
       <h4 className="font-black text-3xl italic uppercase leading-none tracking-tighter" style={{color}}>{name}</h4>
       <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed opacity-80">{desc}</p>
       <div className="mt-10 h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
          <div className="h-full w-[40%] group-hover:w-full transition-all duration-[2500ms] ease-out shadow-[0_0_15px_inset]" style={{backgroundColor: color, boxShadow: `0 0 15px ${color}`}}></div>
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
    <section className="bg-[#050505] p-12 rounded-[3.5rem] border border-white/5 shadow-2xl hover:border-yellow-500/20 transition-all relative overflow-hidden group">
      <div className="absolute -top-10 -left-10 text-[200px] font-black text-white/[0.01] italic select-none group-hover:text-yellow-500/5 transition-all">{num}</div>
      <div className="relative z-10 flex items-center gap-10 mb-10">
        <span className="text-7xl font-black text-white/[0.05] italic group-hover:text-yellow-500/10 transition-all leading-none">{num}</span>
        <h3 className="text-4xl font-black text-yellow-500 uppercase italic tracking-tighter group-hover:translate-x-3 transition-transform">{title}</h3>
      </div>
      <p className="relative z-10 text-gray-400 leading-[2.2] font-medium text-justify border-l-4 border-white/10 pl-12 text-xl group-hover:text-gray-300 transition-colors">{children}</p>
    </section>
  );
}

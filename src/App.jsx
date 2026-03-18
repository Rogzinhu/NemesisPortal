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

  // Configurações
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

  // Detetar Dispositivo (Híbrido)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listeners de Dados
  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
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
  }, [user]);

  const isRealUser = user && !user.isAnonymous;
  const loggedPlayer = isRealUser ? players.find(p => p.email?.toLowerCase() === user.email?.toLowerCase()) : null;

  // --- LÓGICA GITHUB ---
  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token || !ghConfig.owner || !ghConfig.repo) throw new Error("Chaves Master ausentes!");
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
          if (!resp.ok) throw new Error("GitHub rejeitou upload.");
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
      else { setAuthError('Chave incorreta.'); }
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

  // --- INTERFACES ---

  const MobileUI = () => (
    <div className="pb-24 px-4 pt-6 space-y-8 animate-in fade-in duration-500 relative z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-lg object-cover" />
          <h1 className="font-black text-xl italic uppercase">{siteSettings.siteName}</h1>
        </div>
        <button onClick={() => setActiveTab('admin')} className={`p-2 rounded-xl ${activeTab === 'admin' ? 'bg-yellow-500 text-black' : 'bg-white/5'}`}><LayoutDashboard size={20}/></button>
      </div>

      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-white/5 shadow-2xl">
            <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" />
            <div className="relative text-center">
              <h2 className="text-yellow-500 font-black text-4xl uppercase italic">As Nações</h2>
              <p className="text-gray-400 text-[8px] font-bold tracking-[0.4em]">PROTOCOLO ETERNUS</p>
            </div>
          </div>
          <div className="space-y-4">
            {posts.map(p => (
              <article key={p.id} className="bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden">
                {p.mediaUrl && <img src={p.mediaUrl} className="w-full aspect-video object-cover" />}
                <div className="p-4">
                  <h4 className="font-black uppercase text-[11px] text-white mb-2">{p.title}</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-3">{p.content}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="space-y-6">
          <div className="text-center"><h2 className="text-3xl font-black italic uppercase">Galeria</h2><div className="w-12 h-1 bg-blue-600 mx-auto rounded-full mt-2"></div></div>
          {(isAdmin || isRealUser) && (
            <div className="bg-[#0a0a0a] p-5 rounded-xl border border-white/5 space-y-4">
              <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-4 border-2 border-dashed border-white/20 rounded-lg text-center text-[10px] uppercase font-black text-gray-500 bg-black">
                {isUploading ? uploadProgress : 'Anexar Print'}
              </div>
              <textarea placeholder="Relato..." className="w-full bg-black border border-white/5 p-3 rounded-lg text-xs" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
              <button onClick={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="w-full bg-blue-600 p-3 rounded-lg font-black text-[10px] uppercase">Postar</button>
              <input type="file" ref={commFileInputRef} className="hidden" onChange={e => handleUpload(e, 'community')} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            {communityPosts.map(p => (
              <div key={p.id} className="bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/5">
                {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover" />}
                <div className="p-3 flex items-center gap-3">
                   <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-black text-[10px]">{String(p.author).charAt(0)}</div>
                   <h4 className="font-black text-[10px] uppercase text-white truncate">{p.author}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-12">
          <TeamSection color="#bc13fe" name="Andromeda" players={players.filter(p => p.team === 'andromeda')} isMobile />
          <TeamSection color="#22c55e" name="Helix" players={players.filter(p => p.team === 'helix')} isMobile />
        </div>
      )}

      {/* Navegação Inferior (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/5 h-16 flex items-center justify-around px-4 z-[100]">
        <MobileNavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural" />
        <MobileNavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
        <MobileNavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Lore" />
        <MobileNavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Times" />
      </nav>
    </div>
  );

  const DesktopUI = () => (
    <div className="relative z-10 animate-in fade-in duration-700">
      {/* Barra Superior Clássica */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 h-20">
        <div className="max-w-7xl mx-auto px-10 h-full flex items-center justify-between">
           <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setActiveTab('home')}>
             <img src={siteSettings.logoUrl} className="w-12 h-12 rounded-lg object-cover border border-white/10 group-hover:border-yellow-500/50 transition-all shadow-xl" />
             <span className="font-black text-2xl tracking-tighter uppercase italic">{siteSettings.siteName}</span>
           </div>
           <div className="flex items-center gap-2">
             <DesktopNavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural" />
             <DesktopNavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
             <DesktopNavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Lore" />
             <DesktopNavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Nações" />
             <button onClick={() => { setActiveTab('admin'); setAuthError(''); }} className={`ml-4 p-3 rounded-xl transition ${activeTab === 'admin' ? 'bg-yellow-500 text-black shadow-[0_0_15px_#eab308]' : 'text-gray-400 hover:bg-white/10'}`}>
                <LayoutDashboard size={20} />
             </button>
           </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-10 py-12 space-y-16">
        {activeTab === 'home' && (
          <div className="space-y-16">
            <div className="relative rounded-[3rem] overflow-hidden aspect-[21/9] flex items-center justify-center border border-white/5 shadow-2xl">
              <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" />
              <div className="relative text-center">
                <h2 className="text-yellow-500 font-black text-7xl uppercase italic tracking-tighter drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]">As Nações</h2>
                <p className="text-gray-400 tracking-[1em] uppercase text-sm font-bold mt-2">Protocolo Eternus Sincronizado</p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-12">
               <div className="col-span-8 space-y-10">
                 <h3 className="text-2xl font-black flex items-center gap-3 text-yellow-500 uppercase italic"><MessageSquare size={24}/> Transmissões Oficiais</h3>
                 {posts.map(p => (
                   <article key={p.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-white/10 transition-all shadow-xl">
                      <div className="p-6 bg-white/[0.01] border-b border-white/5 flex items-center gap-4">
                         <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-full border border-yellow-500/20 object-cover" />
                         <h4 className="font-black text-xs uppercase text-white tracking-widest">{p.title}</h4>
                      </div>
                      {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover max-h-[500px]" />}
                      <div className="p-10"><p className="text-gray-300 text-lg leading-relaxed font-medium">{p.content}</p></div>
                   </article>
                 ))}
               </div>
               <div className="col-span-4 space-y-8">
                  <SideCard color="#bc13fe" name="Andromeda" desc="Ciência ancestral para reconstruir o amanhã." />
                  <SideCard color="#22c55e" name="Helix" desc="Simbiose orgânica com as novas correntes mágicas." />
                  <div className="bg-yellow-500/5 border border-yellow-500/20 p-8 rounded-[2.5rem] space-y-6">
                      <h4 className="font-black uppercase text-yellow-500 flex items-center gap-3 italic"><AlertTriangle size={20}/> Status Global</h4>
                      <StatusLine label="Lords Online" value={players.length} color="text-blue-500" />
                      <StatusLine label="Sincronização" value="100%" color="text-green-500" />
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-12">
             <div className="flex justify-between items-end border-b border-white/10 pb-8">
                <div><h2 className="text-6xl font-black italic uppercase tracking-tighter">Galeria</h2><p className="text-gray-500 uppercase font-black tracking-[0.5em] text-xs mt-2">Registos da Arca</p></div>
                {(isAdmin || isRealUser) && <button onClick={() => signOut(auth)} className="px-6 py-3 bg-red-500/10 text-red-500 rounded-xl font-black uppercase text-[10px] hover:bg-red-500/20">Desconectar</button>}
             </div>
             {(isAdmin || isRealUser) && (
                <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                   <form onSubmit={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="space-y-6">
                      <div className="grid grid-cols-2 gap-8">
                         {isAdmin ? (
                           <select className="bg-black border border-white/5 p-5 rounded-xl font-black uppercase text-xs outline-none focus:border-blue-500 shadow-inner" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                             <option value="">AUTOR</option>
                             {players.map(pl => <option key={pl.id} value={pl.name}>{pl.name}</option>)}
                           </select>
                         ) : <div className="bg-black p-5 rounded-xl border border-blue-500/20 font-black uppercase text-xs text-blue-400 flex items-center gap-3 shadow-inner"><User size={16}/> Autenticado: {loggedPlayer?.name || user.email}</div>}
                         <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-5 border-2 border-dashed border-white/10 rounded-xl text-center bg-black cursor-pointer hover:bg-white/[0.02] flex items-center justify-center gap-3 transition-all">
                            <ImageIcon size={18} className="text-gray-600"/><span className="font-black uppercase text-[10px] text-gray-500">{isUploading ? uploadProgress : 'Anexar Mídia'}</span>
                         </div>
                      </div>
                      <textarea placeholder="Descrição..." className="w-full bg-black border border-white/5 p-6 rounded-2xl h-32 font-medium focus:border-blue-500 outline-none" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                      <button disabled={isUploading} className="w-full bg-blue-600 p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-500 active:scale-95 transition-all">Publicar na Galeria</button>
                      <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'community')} />
                   </form>
                </div>
             )}
             <div className="columns-3 gap-8 space-y-8">
                {communityPosts.map(p => (
                  <div key={p.id} className="break-inside-avoid bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-blue-500/20 transition-all shadow-2xl hover:-translate-y-1">
                     {p.mediaUrl && <img src={p.mediaUrl} className="w-full" />}
                     <div className="p-8">
                       <h4 className="font-black text-[10px] uppercase text-blue-400 mb-3 flex items-center gap-2">{p.author}</h4>
                       <p className="text-gray-400 text-sm leading-relaxed font-medium">{p.content}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-32 pb-20">
             <TeamSection color="#bc13fe" name="Andromeda" players={displayAndromeda} />
             <TeamSection color="#22c55e" name="Helix" players={displayHelix} reverse />
          </div>
        )}

        {activeTab === 'admin' && (
           <div className="max-w-4xl mx-auto py-10">
              {!isAdmin ? (
                <div className="bg-[#0a0a0a] p-24 rounded-[4rem] border border-white/5 text-center shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                   <Lock size={64} className="mx-auto mb-8 text-yellow-500 shadow-xl" />
                   <h2 className="text-5xl font-black italic uppercase mb-12 tracking-tighter">Terminal Master</h2>
                   <form onSubmit={handleAdminLogin} className="max-w-md mx-auto space-y-6">
                      {!isRealUser && (
                        <div className="grid grid-cols-2 gap-4">
                           <input type="email" placeholder="EMAIL" className="bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none focus:border-yellow-500" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                           <input type="password" placeholder="SENHA" className="bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none focus:border-yellow-500" value={adminAuthPass} onChange={e => setAdminAuthPass(e.target.value)} />
                        </div>
                      )}
                      <input type="password" placeholder="CHAVE MASTER" className="w-full bg-black border border-white/5 p-6 rounded-3xl text-center font-black focus:border-yellow-500 outline-none text-xl shadow-inner" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
                      <button className="w-full bg-yellow-500 text-black font-black p-6 rounded-[2rem] uppercase tracking-widest shadow-xl hover:bg-yellow-400">Entrar no Terminal</button>
                   </form>
                </div>
              ) : (
                 <div className="space-y-12">
                    <header className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 flex justify-between items-center shadow-2xl">
                       <div><h3 className="font-black text-2xl uppercase italic">Comandante {adminRole}</h3><p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mt-1">Conexão Estável</p></div>
                       <div className="flex gap-4">
                         {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-5 rounded-2xl ${showSettings ? 'bg-yellow-500 text-black' : 'bg-white/5'}`}><Settings size={24}/></button>}
                         <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 active:scale-90 transition-all"><LogOut size={24}/></button>
                       </div>
                    </header>
                    {/* Painel Postagem */}
                    <div className="bg-[#0a0a0a] p-12 rounded-[4rem] border border-white/5 space-y-10 shadow-2xl relative overflow-hidden">
                       <h3 className="text-3xl font-black italic uppercase text-yellow-500"><Plus size={32} className="inline mr-4 mb-1"/> Disparar Mural</h3>
                       <div className="grid grid-cols-2 gap-12">
                          <div className="space-y-4">
                             <div onClick={() => !isUploading && fileInputRef.current?.click()} className="aspect-video bg-black border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] group transition-all">
                                {newPost.mediaUrl ? <img src={newPost.mediaUrl} className="w-full h-full object-cover rounded-[2.4rem]" /> : <Camera size={48} className="text-gray-800 group-hover:text-yellow-500 transition-colors" />}
                             </div>
                             <p className="text-center text-[10px] font-black uppercase text-gray-700 tracking-widest">{isUploading ? uploadProgress : 'Anexar Mídia Oficial'}</p>
                             <input type="file" ref={fileInputRef} className="hidden" onChange={e => handleUpload(e, 'official')} />
                          </div>
                          <form onSubmit={createPost} className="space-y-5">
                             <input type="text" placeholder="TÍTULO" className="w-full bg-black border border-white/5 p-6 rounded-2xl font-black uppercase text-sm focus:border-yellow-500 outline-none shadow-inner" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                             <textarea placeholder="Relato de comando..." className="w-full bg-black border border-white/5 p-6 rounded-2xl h-40 font-medium text-lg focus:border-yellow-500 outline-none resize-none" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}></textarea>
                             <button className="w-full bg-yellow-500 text-black font-black p-5 rounded-2xl uppercase tracking-widest shadow-xl">Publicar Agora</button>
                          </form>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        )}
      </main>

      <footer className="mt-40 border-t border-white/5 py-32 text-center opacity-10 italic font-black uppercase tracking-[1em] text-[9px]">Sincronizado via Protocolo Eternus</footer>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white overflow-x-hidden">
       {/* LUZES AMBIENTES - CLÁSSICO */}
       <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[100%] lg:w-[60%] h-[60%] bg-purple-900 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[100%] lg:w-[60%] h-[60%] bg-green-900 blur-[120px] rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
       </div>

       {isMobile ? <MobileUI /> : <DesktopUI />}

       {/* Alertas Flutuantes */}
       {globalError && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 p-4 rounded-xl text-[10px] font-black uppercase text-center z-[200] shadow-2xl border transition-all bg-red-600 border-red-400 flex items-center gap-4">
          <span>⚠️ {globalError}</span>
          <button onClick={() => setGlobalError('')} className="bg-black/20 px-3 py-1 rounded-lg hover:bg-black/40">Ok</button>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES ---

function DesktopNavBtn({ active, onClick, Icon, label, highlight }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${highlight ? 'bg-yellow-500 text-black shadow-[0_0_15px_#eab308] hover:scale-105' : active ? 'bg-yellow-500/10 text-yellow-500 shadow-inner' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
       <Icon size={16} /> <span>{label}</span>
    </button>
  );
}

function MobileNavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-yellow-500 scale-110' : 'text-gray-600'}`}>
      <Icon size={22} /><span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function TeamSection({ color, name, players, reverse, isMobile }) {
  return (
    <div className={`flex flex-col ${reverse ? 'lg:items-end lg:text-right' : 'lg:items-start'} space-y-10`}>
      <div className={reverse ? 'text-right' : 'text-left'}>
         <div className={`h-1.5 w-24 rounded-full mb-4 ${reverse ? 'ml-auto' : ''}`} style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}></div>
         <h2 className={`font-black italic uppercase tracking-tighter leading-none ${isMobile ? 'text-5xl' : 'text-7xl'}`} style={{color}}>{name}</h2>
         <p className="text-gray-600 uppercase font-black tracking-widest text-[9px] mt-2 italic">Lords Registados</p>
      </div>
      <div className={`grid w-full gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {players.map(p => (
          <div key={p.id} className="bg-[#0a0a0a] p-6 md:p-8 rounded-[2rem] border-b-4 md:border-b-8 font-black italic text-xl md:text-2xl shadow-2xl flex items-center justify-between group overflow-hidden relative" style={{ borderBottomColor: color }}>
            <span className="relative z-10 truncate group-hover:text-white transition-colors">{p.name}</span>
            {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="relative z-10 p-2 text-gray-700 hover:text-white"><LinkIcon size={18}/></a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SideCard({ color, name, desc }) {
  return (
    <div className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-3">
       <h4 className="font-black text-2xl italic uppercase leading-none" style={{color}}>{name}</h4>
       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">{desc}</p>
       <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full w-[45%] group-hover:w-full transition-all duration-[2000ms]" style={{backgroundColor: color, boxShadow: `0 0 10px ${color}`}}></div>
       </div>
    </div>
  );
}

function StatusLine({ label, value, color }) {
  return (
    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-3">
       <span className="text-gray-600">{label}</span>
       <span className={`${color} italic`}>{value}</span>
    </div>
  );
}

function LoreChapter({ num, title, children, isMobile }) {
  return (
    <section className="bg-[#050505] p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-2xl hover:border-yellow-500/20 transition-all relative overflow-hidden group">
      <div className="absolute -top-10 -left-10 text-[180px] font-black text-white/[0.01] italic select-none">{num}</div>
      <div className="relative z-10 flex items-center gap-6 mb-8">
        <span className="text-5xl md:text-7xl font-black text-white/[0.05] italic group-hover:text-yellow-500/10 transition-colors">{num}</span>
        <h3 className="text-xl md:text-3xl font-black text-yellow-500 uppercase italic tracking-tighter">{title}</h3>
      </div>
      <p className="relative z-10 text-gray-400 leading-relaxed md:leading-[2.2] font-medium text-justify border-l-2 md:border-l-4 border-white/10 pl-6 md:pl-10 text-xs md:text-lg">{children}</p>
    </section>
  );
}

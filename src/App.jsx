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

  // Detetar Dispositivo
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Firebase Listeners
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

  const isRealUser = user && !user.isAnonymous;
  const loggedPlayer = isRealUser ? players.find(p => p.email?.toLowerCase() === user.email?.toLowerCase()) : null;

  // --- LÓGICA GITHUB ---
  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token || !ghConfig.owner || !ghConfig.repo) throw new Error("GitHub Master não configurado!");
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
          if (!resp.ok) throw new Error("Erro GitHub.");
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
      setUploadProgress('Sucesso!');
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

  // --- ACTIONS ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (!isRealUser) await signInWithEmailAndPassword(auth, adminEmail, adminAuthPass);
      if (adminPass === 'ROGZINHU-T10b20cd00n804') { setIsAdmin(true); setAdminRole('master'); }
      else if (adminPass === 'ADMNEMESIS15') { setIsAdmin(true); setAdminRole('admin'); }
      else { setAuthError('Chave incorreta.'); }
    } catch (err) { setAuthError('Falha no terminal.'); }
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

  // --- UI MOBILE ---
  const MobileUI = () => (
    <div className="pb-24 px-4 pt-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-lg object-cover" alt="Logo" />
          <h1 className="font-black text-xl tracking-tighter uppercase italic">{siteSettings.siteName}</h1>
        </div>
        <button onClick={() => setActiveTab('admin')} className={`p-2 rounded-xl ${activeTab === 'admin' ? 'bg-yellow-500 text-black' : 'bg-white/5'}`}><LayoutDashboard size={20}/></button>
      </div>

      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-white/5">
            <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" />
            <div className="relative text-center">
              <h2 className="text-yellow-500 font-black text-4xl uppercase italic">Nações</h2>
              <p className="text-gray-400 text-[8px] font-bold tracking-[0.4em]">PROTOCOLO ETERNUS</p>
            </div>
          </div>
          <div className="space-y-4">
            {posts.map(p => (
              <article key={p.id} className="bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden">
                {p.mediaUrl && <img src={p.mediaUrl} className="w-full aspect-video object-cover" />}
                <div className="p-4 space-y-2">
                  <h4 className="font-black uppercase text-[11px] text-white">{p.title}</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed">{p.content}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="space-y-6">
          <div className="text-center"><h2 className="text-3xl font-black italic uppercase">Galeria</h2></div>
          {(isAdmin || isRealUser) && (
            <div className="bg-[#0a0a0a] p-5 rounded-xl border border-white/5 space-y-4">
              <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-4 border border-dashed border-white/20 rounded-lg text-center text-[10px] uppercase font-black text-gray-500">
                {isUploading ? uploadProgress : 'Anexar Print'}
              </div>
              <textarea placeholder="Mensagem..." className="w-full bg-black border border-white/5 p-3 rounded-lg text-xs" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
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

      {activeTab === 'lore' && (
        <div className="space-y-6">
           <LoreChapter num="I" title="A Era do Arkanis" isMobile>Houve uma época em que nosso mundo foi completamente diferente do que é hoje...</LoreChapter>
           <LoreChapter num="II" title="O Olho de Hórus" isMobile>Num fatídico dia, em um laboratório de uma dessas nações...</LoreChapter>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-10">
          <TeamSection color="#bc13fe" name="Andromeda" players={players.filter(p => p.team === 'andromeda')} isMobile />
          <TeamSection color="#22c55e" name="Helix" players={players.filter(p => p.team === 'helix')} isMobile />
        </div>
      )}

      <nav className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/5 h-16 flex items-center justify-around px-4 z-[100]">
        <MobileNavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural" />
        <MobileNavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
        <MobileNavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Lore" />
        <MobileNavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Times" />
      </nav>
    </div>
  );

  // --- UI DESKTOP ---
  const DesktopUI = () => (
    <div className="max-w-7xl mx-auto px-10 py-10 animate-in zoom-in-95 duration-700">
      <div className="grid grid-cols-12 gap-10">
        <aside className="col-span-3 space-y-8 sticky top-10 h-fit">
          <div className="flex items-center gap-4 mb-10 group cursor-pointer" onClick={() => setActiveTab('home')}>
            <img src={siteSettings.logoUrl} className="w-14 h-14 rounded-xl object-cover border border-white/10 group-hover:border-yellow-500/30 transition-all" alt="Logo" />
            <div>
              <h1 className="font-black text-2xl tracking-tighter uppercase italic leading-none">{siteSettings.siteName}</h1>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">PORTAL DE COMANDO</p>
            </div>
          </div>
          <nav className="space-y-1">
            <DesktopNavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural Oficial" />
            <DesktopNavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
            <DesktopNavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Crónicas" />
            <DesktopNavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Nações" />
            <div className="pt-6">
              <DesktopNavBtn active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} Icon={LayoutDashboard} label="Admin" highlight />
            </div>
          </nav>
        </aside>

        <div className="col-span-9 space-y-12">
          {activeTab === 'home' && (
            <div className="space-y-12">
              <div className="relative rounded-[2.5rem] overflow-hidden aspect-[21/9] flex items-center justify-center border border-white/5 shadow-2xl">
                <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" />
                <div className="relative text-center">
                  <h2 className="text-yellow-500 font-black text-6xl tracking-tighter uppercase italic">As Nações</h2>
                  <p className="text-gray-400 tracking-[0.8em] uppercase text-xs font-bold mt-2">Protocolo Eternus Ativado</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-10">
                <div className="col-span-2 space-y-8">
                  <h3 className="text-2xl font-black flex items-center gap-3 text-yellow-500 uppercase italic tracking-tighter">
                    <MessageSquare size={24} /> Transmissões Oficiais
                  </h3>
                  {posts.map(p => (
                    <article key={p.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden hover:border-white/10 transition-all">
                      <div className="p-6 bg-white/[0.01] flex items-center gap-4 border-b border-white/5">
                         <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-full border border-yellow-500/20 object-cover" />
                         <div>
                           <h4 className="font-black text-xs uppercase text-white tracking-wide">{p.title}</h4>
                           <p className="text-[9px] text-gray-500 font-black uppercase">{p.author}</p>
                         </div>
                      </div>
                      {p.mediaUrl && <img src={p.mediaUrl} className="w-full object-cover max-h-[500px]" />}
                      <div className="p-10"><p className="text-gray-400 text-lg leading-relaxed font-medium">{p.content}</p></div>
                    </article>
                  ))}
                </div>
                <div className="space-y-6">
                   <SideCard color="#bc13fe" name="Andromeda" desc="Reconstrução através da tecnologia." />
                   <SideCard color="#22c55e" name="Helix" desc="Simbiose com a nova magia." />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'community' && (
            <div className="space-y-12">
               <h2 className="text-5xl font-black italic uppercase tracking-tighter">Galeria</h2>
               {(isAdmin || isRealUser) && (
                 <div className="bg-[#0a0a0a] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                   <form onSubmit={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        {isAdmin ? (
                          <select className="bg-black border border-white/5 p-5 rounded-xl font-black uppercase text-xs" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                            <option value="">AUTOR</option>
                            {players.map(pl => <option key={pl.id} value={pl.name}>{pl.name}</option>)}
                          </select>
                        ) : <div className="bg-black p-5 rounded-xl border border-blue-500/20 font-black uppercase text-xs text-blue-400">Logado: {loggedPlayer?.name || user.email}</div>}
                        <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-5 border-2 border-dashed border-white/10 rounded-xl text-center bg-black cursor-pointer hover:bg-white/[0.02]">
                           <span className="font-black uppercase text-[10px] text-gray-500">{isUploading ? uploadProgress : 'Anexar Mídia'}</span>
                        </div>
                      </div>
                      <textarea placeholder="Descrição..." className="w-full bg-black border border-white/5 p-6 rounded-xl h-32 font-medium" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                      <button disabled={isUploading} className="w-full bg-blue-600 p-4 rounded-xl font-black uppercase tracking-widest text-xs">Publicar</button>
                      <input type="file" ref={commFileInputRef} className="hidden" onChange={e => handleUpload(e, 'community')} />
                   </form>
                 </div>
               )}
               <div className="columns-3 gap-6 space-y-6">
                  {communityPosts.map(p => (
                    <div key={p.id} className="break-inside-avoid bg-[#0a0a0a] rounded-[1.5rem] border border-white/5 overflow-hidden group hover:border-blue-500/20 transition-all shadow-xl">
                       {p.mediaUrl && <img src={p.mediaUrl} className="w-full" alt="Comm" />}
                       <div className="p-6">
                         <h4 className="font-black text-[10px] uppercase text-blue-400 mb-2">{p.author}</h4>
                         <p className="text-gray-400 text-xs leading-relaxed">{p.content}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'lore' && (
            <div className="max-w-4xl space-y-16 pb-20">
               <h2 className="text-6xl font-black italic uppercase tracking-tighter">As Crónicas</h2>
               <LoreChapter num="I" title="A Era do Arkanis">Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente...</LoreChapter>
               <LoreChapter num="II" title="O Olho de Hórus">Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder...</LoreChapter>
               <LoreChapter num="III" title="A Guerra dos Nêmesis">As nações mais poderosas se fecharam e culpavam umas às outras pelo ocorrido. Em meio à briga e ao desespero...</LoreChapter>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-24 pb-20">
               <TeamSection color="#bc13fe" name="Andromeda" players={players.filter(p => p.team === 'andromeda')} />
               <TeamSection color="#22c55e" name="Helix" players={players.filter(p => p.team === 'helix')} reverse />
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="max-w-3xl mx-auto py-10">
               {!isAdmin ? (
                 <div className="bg-[#0a0a0a] p-20 rounded-[3rem] border border-white/5 text-center shadow-2xl relative overflow-hidden">
                    <Lock size={48} className="mx-auto mb-6 text-yellow-500" />
                    <h2 className="text-4xl font-black italic uppercase mb-10">Terminal Master</h2>
                    <form onSubmit={handleAdminLogin} className="max-w-xs mx-auto space-y-4">
                       {!isRealUser && <input type="email" placeholder="EMAIL" className="w-full bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />}
                       {!isRealUser && <input type="password" placeholder="SENHA" className="w-full bg-black border border-white/5 p-4 rounded-xl font-black text-xs outline-none" value={adminAuthPass} onChange={e => setAdminAuthPass(e.target.value)} />}
                       <input type="password" placeholder="CHAVE MASTER" className="w-full bg-black border border-white/5 p-4 rounded-xl text-center font-black outline-none" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                       <button className="w-full bg-yellow-500 text-black font-black p-4 rounded-xl uppercase text-xs">Entrar</button>
                    </form>
                 </div>
               ) : (
                 <div className="space-y-10">
                    <header className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/5 flex justify-between items-center">
                       <h3 className="font-black text-lg uppercase italic">Comandante {adminRole}</h3>
                       <div className="flex gap-3">
                         {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-xl ${showSettings ? 'bg-yellow-500 text-black' : 'bg-white/5'}`}><Settings/></button>}
                         <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-4 bg-red-500/10 text-red-500 rounded-xl"><LogOut/></button>
                       </div>
                    </header>
                    <div className="bg-[#0a0a0a] p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                       <h3 className="text-xl font-black uppercase text-yellow-500"><Plus className="inline mr-2"/> Transmissão Mural</h3>
                       <div className="grid grid-cols-2 gap-8">
                          <div onClick={() => !isUploading && fileInputRef.current?.click()} className="aspect-video bg-black border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02]">
                             {newPost.mediaUrl ? <img src={newPost.mediaUrl} className="w-full h-full object-cover rounded-2xl" /> : <Camera size={32} className="text-gray-800" />}
                          </div>
                          <form onSubmit={createPost} className="space-y-4">
                             <input type="text" placeholder="TÍTULO" className="w-full bg-black border border-white/5 p-4 rounded-xl font-black uppercase text-xs" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                             <textarea placeholder="Relato..." className="w-full bg-black border border-white/5 p-4 rounded-xl h-32 font-medium text-sm" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}></textarea>
                             <button className="w-full bg-yellow-500 text-black font-black p-4 rounded-xl uppercase text-xs">Publicar</button>
                             <input type="file" ref={fileInputRef} className="hidden" onChange={e => handleUpload(e, 'official')} />
                          </form>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202]">
       {isMobile ? <MobileUI /> : <DesktopUI />}
    </div>
  );
}

// --- AUXILIARES ---
function MobileNavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-yellow-500 scale-110' : 'text-gray-600'}`}>
      <Icon size={20} /><span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function DesktopNavBtn({ active, onClick, Icon, label, highlight }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${highlight ? 'bg-yellow-500 text-black shadow-lg hover:bg-yellow-400' : active ? 'bg-white/10 text-white translate-x-2' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
      <div className="flex items-center gap-4"><Icon size={18} /><span>{label}</span></div>
      <ChevronRight size={14} className={active ? 'opacity-100' : 'opacity-0'} />
    </button>
  );
}

function LoreChapter({ num, title, children, isMobile }) {
  return (
    <section className="bg-white/[0.01] p-8 rounded-3xl border border-white/5 shadow-xl group">
      <div className="flex items-center gap-6 mb-4">
        <span className="text-4xl font-black text-white/[0.05] italic">{num}</span>
        <h3 className="text-2xl font-black text-yellow-500 uppercase italic">{title}</h3>
      </div>
      <p className="text-gray-400 leading-relaxed font-medium text-justify border-l border-white/5 pl-6 text-sm">{children}</p>
    </section>
  );
}

function TeamSection({ color, name, players, reverse, isMobile }) {
  return (
    <div className={`flex flex-col ${reverse ? 'items-end text-right' : 'items-start'} space-y-8`}>
      <div className={reverse ? 'text-right' : 'text-left'}>
         <div className={`h-1 w-20 rounded-full mb-3 ${reverse ? 'ml-auto' : ''}`} style={{ backgroundColor: color }}></div>
         <h2 className={`font-black italic uppercase tracking-tighter ${isMobile ? 'text-5xl' : 'text-7xl'}`} style={{color}}>{name}</h2>
      </div>
      <div className={`grid w-full gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {players.map(p => (
          <div key={p.id} className="bg-[#0a0a0a] p-6 rounded-2xl border-b-4 font-black italic text-xl shadow-lg flex items-center justify-between group" style={{ borderBottomColor: color }}>
            <span className="truncate">{p.name}</span>
            {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="p-2 text-gray-700 hover:text-white"><LinkIcon size={16}/></a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SideCard({ color, name, desc }) {
  return (
    <div className="bg-[#0a0a0a] p-6 rounded-[2rem] border border-white/5 shadow-xl space-y-2">
       <h4 className="font-black text-xl italic uppercase" style={{color}}>{name}</h4>
       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{desc}</p>
       <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full w-[40%] bg-white/20" style={{backgroundColor: color}}></div>
       </div>
    </div>
  );
}

function StatusLine({ label, value, color }) {
  return (
    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
       <span className="text-gray-600">{label}</span>
       <span className={color}>{value}</span>
    </div>
  );
}

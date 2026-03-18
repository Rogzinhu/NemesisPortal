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

  // Firebase Auth & Listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch (e) { console.error(e); }
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

  // Filtros de Jogadores (Declarados no topo do App para evitar ReferenceError)
  const displayAndromeda = players.filter(p => p.team === 'andromeda');
  const displayHelix = players.filter(p => p.team === 'helix');
  const isRealUser = user && !user.isAnonymous;
  const loggedPlayer = isRealUser ? players.find(p => p.email?.toLowerCase() === user.email?.toLowerCase()) : null;

  // --- LÓGICA GITHUB ---
  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token || !ghConfig.owner || !ghConfig.repo) throw new Error("Chaves Master do GitHub não configuradas!");
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
          if (!resp.ok) throw new Error("Erro na API do GitHub.");
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
    setUploadProgress('A enviar...');
    try {
      const url = await uploadToGitHub(file, target === 'official' ? 'official' : 'community');
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      if (target === 'official') setNewPost(p => ({ ...p, mediaUrl: url, mediaType: type }));
      else setNewCommPost(p => ({ ...p, mediaUrl: url, mediaType: type }));
      setUploadProgress('Pronto!');
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

  // --- LOGIN ---
  const handlePlayerAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        const whitelisted = players.some(p => p.email && p.email.toLowerCase() === authEmail.toLowerCase());
        if (!whitelisted) { setAuthError('E-mail não está na whitelist!'); return; }
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else { await signInWithEmailAndPassword(auth, authEmail, authPassword); }
    } catch (err) { setAuthError('Erro no acesso.'); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (!isRealUser) await signInWithEmailAndPassword(auth, adminEmail, adminAuthPass);
      if (adminPass === 'ROGZINHU-T10b20cd00n804') { setIsAdmin(true); setAdminRole('master'); }
      else if (adminPass === 'ADMNEMESIS15') { setIsAdmin(true); setAdminRole('admin'); }
      else { setAuthError('Chave Master inválida.'); }
    } catch (err) { setAuthError('E-mail ou Senha incorretos.'); }
  };

  const saveGhConfig = async () => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), ghConfig);
    setShowSettings(false);
    setGlobalError('Configurações Salvas!');
  };

  const createPost = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), { 
      ...newPost, 
      author: adminRole === 'master' ? 'Master Comandante' : 'Operador ADM', 
      timestamp: Date.now() 
    });
    setNewPost({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const createCommPost = async (e, forceName) => {
    e.preventDefault();
    const name = forceName || newCommPost.author;
    if (!name || (!newCommPost.content && !newCommPost.mediaUrl)) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community'), { 
      ...newCommPost, 
      author: name, 
      timestamp: Date.now() 
    });
    setNewCommPost({ author: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name || !newPlayer.email) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'players'), { ...newPlayer, timestamp: Date.now() });
    setNewPlayer({ name: '', team: 'andromeda', link: '', email: '' });
  };

  // --- SUB-COMPONENTES DE UI ---

  const MobileUI = () => (
    <div className="pb-24 px-4 pt-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={siteSettings.logoUrl} className="w-10 h-10 rounded-lg object-cover border border-white/10" alt="Logo" />
          <h1 className="font-black text-xl tracking-tighter uppercase italic">{siteSettings.siteName}</h1>
        </div>
        <button onClick={() => setActiveTab('admin')} className={`p-2 rounded-xl ${activeTab === 'admin' ? 'bg-yellow-500 text-black' : 'bg-white/5'}`}>
          <LayoutDashboard size={20} />
        </button>
      </div>

      {activeTab === 'home' && (
        <div className="space-y-8">
          <div className="relative rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-white/5 shadow-2xl">
            <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" alt="Hero" />
            <div className="relative text-center">
              <h2 className="text-yellow-500 font-black text-4xl uppercase italic">As Nações</h2>
              <p className="text-gray-400 text-[9px] font-bold tracking-widest mt-1 uppercase italic">Protocolo Eternus</p>
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="font-black flex items-center gap-2 text-yellow-500 uppercase italic text-sm tracking-widest">Mural de Comando</h3>
            {posts.map(p => (
              <article key={p.id} className="bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                {p.mediaUrl && <img src={p.mediaUrl} className="w-full aspect-video object-cover border-b border-white/5" alt="Post" />}
                <div className="p-5 space-y-3">
                  <h4 className="font-black uppercase text-xs text-white leading-tight">{p.title}</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{p.content}</p>
                  <p className="text-[7px] text-gray-600 font-black uppercase tracking-widest">Transmissão: {new Date(p.timestamp).toLocaleDateString()}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-black italic uppercase">Galeria</h2>
            <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full mt-2"></div>
          </div>
          {(isAdmin || isRealUser) ? (
            <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-white/10 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-blue-500">Anexar Memória</span>
                {isRealUser && <button onClick={() => signOut(auth)} className="text-[8px] text-red-500 uppercase font-black">Desconectar</button>}
              </div>
              <div className="grid grid-cols-1 gap-3">
                 <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-4 border-2 border-dashed border-white/10 rounded-xl text-center bg-black hover:bg-white/[0.02]">
                    <span className="text-[9px] font-black uppercase text-gray-500">{isUploading ? uploadProgress : 'Selecionar Imagem'}</span>
                 </div>
                 <input type="text" placeholder="OU COLE UM LINK DIRETO" className="w-full bg-black border border-white/5 p-3 rounded-xl text-[9px] font-black uppercase" value={newCommPost.mediaUrl.startsWith('http') ? newCommPost.mediaUrl : ''} onChange={e => setNewCommPost({...newCommPost, mediaUrl: e.target.value, mediaType: (e.target.value.includes('youtu') ? 'video' : 'image')})} />
              </div>
              <textarea placeholder="Legenda do momento..." className="w-full bg-black border border-white/5 p-4 rounded-xl text-xs h-20" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
              <button disabled={isUploading} onClick={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="w-full bg-blue-600 p-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/10">Publicar Agora</button>
              <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'community')} />
            </div>
          ) : (
             <div className="bg-[#0a0a0a] p-10 rounded-2xl border border-white/5 text-center shadow-2xl">
                <Lock size={32} className="mx-auto mb-4 text-blue-500" />
                <p className="text-[10px] font-black uppercase mb-6 text-gray-400">Terminal de Galeria Bloqueado</p>
                <button onClick={() => setActiveTab('admin')} className="text-[10px] bg-blue-600 px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-xl">Aceder Sistema</button>
             </div>
          )}
          <div className="space-y-6">
            {communityPosts.map(p => (
              <div key={p.id} className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/5 shadow-xl group">
                {p.mediaUrl && (
                   <div className="relative">
                      {p.mediaType === 'video' ? <video src={p.mediaUrl} controls className="w-full" /> : <img src={p.mediaUrl} className="w-full" alt="Gallery" />}
                   </div>
                )}
                <div className="p-4 flex items-center gap-4 bg-white/[0.01]">
                   <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs shadow-lg">{String(p.author).charAt(0)}</div>
                   <div>
                     <h4 className="font-black text-[10px] uppercase text-white">{p.author}</h4>
                     <p className="text-[8px] text-gray-500 uppercase font-black">{new Date(p.timestamp).toLocaleDateString()}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'lore' && (
        <div className="space-y-10">
          <header className="text-center"><h2 className="text-4xl font-black italic uppercase text-yellow-500">Crónicas</h2></header>
          <div className="space-y-8">
             <LoreChapter num="I" title="A Era do Arkanis">Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente. Naquele tempo, as nações exploravam e experimentavam com magia e novas tecnologias...</LoreChapter>
             <LoreChapter num="II" title="O Olho de Hórus">Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder: uma máquina mágica que usava tecnologia dimensional, magia pura e Arkanis com o intuito de gerar energia e magia infinitas...</LoreChapter>
             <LoreChapter num="III" title="A Guerra dos Nêmesis">As nações mais poderosas se fecharam e culpavam umas às outras pelo ocorrido. Em meio à briga e ao desespero, dois grupos se formaram: os Ferronatos e os Etéreos. Os Ferronatos culpavam a magia, acreditando que ela era volátil e selvagem...</LoreChapter>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-16">
          <TeamSection color="#bc13fe" name="Andromeda" players={displayAndromeda} isMobile />
          <TeamSection color="#22c55e" name="Helix" players={displayHelix} isMobile />
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full bg-black/95 backdrop-blur-2xl border-t border-white/5 h-20 flex items-center justify-around px-4 z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <MobileNavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural" />
        <MobileNavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
        <MobileNavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Lore" />
        <MobileNavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Nações" />
      </div>
    </div>
  );

  const DesktopUI = () => (
    <div className="max-w-7xl mx-auto px-10 py-10 animate-in zoom-in-95 duration-700">
      <div className="grid grid-cols-12 gap-10">
        <aside className="col-span-3 space-y-8 sticky top-32 h-fit">
          <div className="flex items-center gap-4 mb-10 group cursor-pointer" onClick={() => setActiveTab('home')}>
            <img src={siteSettings.logoUrl} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 group-hover:border-yellow-500/50 transition-all shadow-2xl" alt="Logo" />
            <div>
              <h1 className="font-black text-3xl tracking-tighter uppercase italic leading-none">{siteSettings.siteName}</h1>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-2">MMXXVI • PROTOCOLO</p>
            </div>
          </div>
          <nav className="space-y-2">
            <DesktopNavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural de Comando" />
            <DesktopNavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria Coletiva" />
            <DesktopNavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Crónicas do Portal" />
            <DesktopNavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Conselho das Nações" />
            <div className="pt-10">
              <DesktopNavBtn active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); setAuthError(''); }} Icon={LayoutDashboard} label="Terminal Master" highlight />
            </div>
          </nav>
        </aside>

        <div className="col-span-9 space-y-12">
          {activeTab === 'home' && (
            <div className="space-y-16">
              <div className="relative rounded-[3.5rem] overflow-hidden aspect-[21/9] flex items-center justify-center border border-white/5 shadow-2xl group">
                <img src={siteSettings.logoUrl} className="absolute inset-0 w-full h-full object-cover brightness-[0.2] transition-transform duration-1000 group-hover:scale-105" alt="Banner" />
                <div className="relative text-center">
                  <h2 className="text-yellow-500 font-black text-8xl tracking-tighter uppercase italic drop-shadow-2xl">As Nações</h2>
                  <p className="text-gray-400 tracking-[1em] uppercase text-sm font-bold mt-4 animate-pulse">Sincronização Eternus Ativa</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-10">
                <div className="col-span-2 space-y-10">
                  <h3 className="text-3xl font-black flex items-center gap-4 text-yellow-500 uppercase italic tracking-tighter">
                    <MessageSquare size={32} /> Relatórios Oficiais
                  </h3>
                  {posts.length === 0 ? <p className="p-20 text-center border border-dashed border-white/5 rounded-3xl text-gray-600 font-black uppercase tracking-widest text-xs">Vácuo de comunicações.</p> : 
                    posts.map(p => (
                      <article key={p.id} className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl hover:border-white/10 transition-all">
                        <div className="p-8 bg-white/[0.02] flex items-center gap-5 border-b border-white/5">
                           <img src={siteSettings.logoUrl} className="w-12 h-12 rounded-full border border-yellow-500/30 object-cover" alt="Avatar" />
                           <div>
                             <h4 className="font-black text-sm uppercase text-white tracking-wide">{p.title}</h4>
                             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{p.author}</p>
                           </div>
                        </div>
                        {p.mediaUrl && (
                          <div className="w-full bg-black flex items-center justify-center max-h-[600px] border-b border-white/5 overflow-hidden">
                             {p.mediaType === 'video' ? <video src={p.mediaUrl} controls className="w-full" /> : <img src={p.mediaUrl} className="w-full h-full object-contain" alt="Media" />}
                          </div>
                        )}
                        <div className="p-12">
                          <p className="text-gray-300 text-xl leading-relaxed whitespace-pre-wrap font-medium">{p.content}</p>
                          <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase text-gray-600 tracking-[0.2em] italic">
                             <span>ID: {p.id.substring(0,8)}</span>
                             <span>Data: {new Date(p.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </article>
                    ))
                  }
                </div>
                <aside className="space-y-8 h-fit sticky top-32">
                   <SideCard color="#bc13fe" name="Andromeda" desc="A reconquista do território humano através da ciência ancestral." />
                   <SideCard color="#22c55e" name="Helix" desc="A fusão biológica com a nova atmosfera carregada de magia." />
                   <div className="bg-yellow-500/5 border border-yellow-500/20 p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
                      <h4 className="font-black uppercase text-yellow-500 flex items-center gap-3 italic tracking-tighter text-lg"><AlertTriangle size={22}/> Status Global</h4>
                      <StatusLine label="Lords Registados" value={players.length} color="text-blue-500" />
                      <StatusLine label="Sessões Ativas" value={isAdmin ? "ADMIN" : "VISITANTE"} color="text-yellow-500" />
                   </div>
                </aside>
              </div>
            </div>
          )}

          {activeTab === 'community' && (
            <div className="space-y-16">
               <div className="flex justify-between items-end border-b border-white/5 pb-10">
                  <div>
                    <h2 className="text-7xl font-black italic uppercase tracking-tighter">Galeria</h2>
                    <p className="text-gray-500 font-black uppercase tracking-[0.8em] text-xs mt-3">Registos Visuais da População</p>
                  </div>
                  {(isAdmin || isRealUser) && <button onClick={() => signOut(auth)} className="px-8 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase text-xs hover:bg-red-500/20 transition-all shadow-xl">Encerrar Sessão</button>}
               </div>

               {(isAdmin || isRealUser) && (
                 <div className="bg-[#0a0a0a] p-12 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse"></div>
                   <form onSubmit={e => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        {isAdmin ? (
                          <select className="bg-black border border-white/5 p-6 rounded-2xl font-black uppercase text-sm focus:border-blue-500 outline-none shadow-inner" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                            <option value="">IDENTIFICAR AUTOR</option>
                            {players.sort((a,b) => a.name.localeCompare(b.name)).map(pl => <option key={pl.id} value={pl.name}>{pl.name}</option>)}
                          </select>
                        ) : <div className="bg-black p-6 rounded-2xl border border-blue-500/30 font-black uppercase text-sm text-blue-400 flex items-center gap-4 shadow-inner"><User size={20}/> Lorde: {loggedPlayer?.name || user.email}</div>}
                        <div onClick={() => !isUploading && commFileInputRef.current?.click()} className="p-6 border-2 border-dashed border-white/10 rounded-2xl text-center bg-black cursor-pointer hover:bg-white/[0.03] hover:border-blue-500/40 transition-all flex items-center justify-center gap-4">
                           <ImageIcon size={20} className="text-gray-600"/>
                           <span className="font-black uppercase text-xs text-gray-500">{isUploading ? uploadProgress : 'Anexar Mídia (GitHub Cloud)'}</span>
                        </div>
                      </div>
                      <div className="relative group">
                         <Globe size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                         <input type="text" placeholder="COLE O LINK DE UMA MÍDIA EXTERNA (YouTube, Discord, etc.)" className="w-full bg-black border border-white/5 p-6 pl-16 rounded-2xl font-black text-xs focus:border-blue-500 outline-none transition-all uppercase shadow-inner" value={newCommPost.mediaUrl.startsWith('http') ? newCommPost.mediaUrl : ''} onChange={e => setNewCommPost({...newCommPost, mediaUrl: e.target.value, mediaType: (e.target.value.includes('youtu') ? 'video' : 'image')})} />
                      </div>
                      <textarea placeholder="Partilhe o seu relato ou construção..." className="w-full bg-black border border-white/5 p-8 rounded-[2rem] h-40 font-medium text-lg focus:border-blue-500 outline-none shadow-inner resize-none leading-relaxed" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                      <button disabled={isUploading || (!isAdmin && !loggedPlayer)} className="w-full bg-blue-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-500 hover:-translate-y-1 transition-all active:scale-95">Publicar no Mural da Comunidade</button>
                      <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={e => handleUpload(e, 'community')} />
                   </form>
                 </div>
               )}

               <div className="columns-3 gap-8 space-y-8 pb-20">
                  {communityPosts.length === 0 ? <p className="col-span-full p-20 text-center text-gray-700 font-black uppercase text-xs tracking-widest">A galeria aguarda o primeiro registo.</p> : 
                    communityPosts.map(p => (
                    <div key={p.id} className="break-inside-avoid bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-blue-500/30 transition-all duration-500 shadow-2xl hover:-translate-y-2">
                       {p.mediaUrl && (
                         <div className="relative overflow-hidden">
                            {p.mediaType === 'video' ? <video src={p.mediaUrl} controls className="w-full" /> : <img src={p.mediaUrl} className="w-full transition-transform duration-700 group-hover:scale-105" alt="Gallery" />}
                            <div className="absolute top-5 right-5 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-[8px] font-black uppercase border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Visualizar</div>
                         </div>
                       )}
                       <div className="p-8">
                         <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-black text-lg shadow-lg group-hover:rotate-12 transition-transform">{String(p.author).charAt(0)}</div>
                             <div>
                               <h4 className="font-black text-xs uppercase text-white group-hover:text-blue-400 transition-colors">{p.author}</h4>
                               <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-1">{new Date(p.timestamp).toLocaleDateString()}</p>
                             </div>
                           </div>
                           {isAdmin && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', p.id))} className="p-3 bg-red-500/10 text-red-500 opacity-20 group-hover:opacity-100 rounded-xl transition-all hover:bg-red-500/20 active:scale-90"><Trash2 size={18}/></button>}
                         </div>
                         <p className="text-gray-400 text-sm leading-[1.8] font-medium">{p.content}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'lore' && (
            <div className="max-w-4xl space-y-20 pb-32">
               <div className="text-center">
                 <h2 className="text-8xl font-black italic uppercase tracking-tighter">As Crónicas</h2>
                 <p className="text-gray-600 uppercase font-black tracking-[1em] text-xs mt-4">Arquivo da Humanidade</p>
               </div>
               <LoreChapter num="I" title="A Era do Arkanis">Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente. Naquele tempo, as nações exploravam e experimentavam com magia e novas tecnologias, todas com potencial enorme. Porém, a ganância dessas nações era tremenda, e elas competiam entre si por poderio econômico. O recurso mais cobiçado por todas as nações era o Arkanis, um recurso lendário que podia ser usado tanto para avanços tecnológicos quanto para avanços na magia.</LoreChapter>
               <LoreChapter num="II" title="O Olho de Hórus">Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder: uma máquina mágica que usava tecnologia dimensional, magia pura e Arkanis com o intuito de gerar energia e magia infinitas. O nome dessa máquina era "O Olho de Hórus". Mas algo aconteceu. A máquina não funcionou do jeito que previram. Na verdade, ela tornou o tecido da realidade extremamente fino, fazendo com que portais e fissuras na terra se abrissem por todo o globo.</LoreChapter>
               <LoreChapter num="III" title="A Guerra dos Nêmesis">As nações mais poderosas se fecharam e culpavam umas às outras pelo ocorrido. Em meio à briga e ao desespero, dois grupos se formaram: os Ferronatos e os Etéreos. Os Ferronatos culpavam a magia, acreditando que ela era volátil, incontrolável e selvagem. Em contrapartida, os Etéreos culpavam a tecnologia, alegando que ela corrompia as mentes, destruía o ecossistema e deturpava o equilíbrio da vida.</LoreChapter>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-40 pb-40">
               <TeamSection color="#bc13fe" name="Andromeda" players={displayAndromeda} />
               <TeamSection color="#22c55e" name="Helix" players={displayHelix} reverse />
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="max-w-4xl space-y-12 pb-20">
               {!isAdmin ? (
                 <div className="bg-[#0a0a0a] p-24 rounded-[4rem] border border-white/5 text-center shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-500 shadow-[0_0_20px_#eab308]"></div>
                    <Lock size={64} className="mx-auto mb-8 text-yellow-500 drop-shadow-[0_0_15px_#eab30866]" />
                    <h2 className="text-6xl font-black italic uppercase mb-12 tracking-tighter">Terminal Master</h2>
                    {authError && <div className="mb-10 p-5 bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase text-xs rounded-2xl animate-shake">{authError}</div>}
                    <form onSubmit={handleAdminLogin} className="max-w-md mx-auto space-y-6">
                       {!isRealUser && (
                         <div className="grid grid-cols-2 gap-5">
                            <input type="email" placeholder="EMAIL DE COMANDO" className="bg-black border border-white/5 p-5 rounded-2xl font-black text-xs outline-none focus:border-yellow-500 shadow-inner transition-all" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                            <input type="password" placeholder="SENHA" className="bg-black border border-white/5 p-5 rounded-2xl font-black text-xs outline-none focus:border-yellow-500 shadow-inner transition-all" value={adminAuthPass} onChange={e => setAdminAuthPass(e.target.value)} />
                         </div>
                       )}
                       {isRealUser && <div className="mb-6 p-4 bg-green-500/5 border border-green-500/10 text-green-500 font-black uppercase text-[10px] rounded-xl italic">Autenticado via Protocolo: {loggedPlayer?.name || user.email}</div>}
                       <input type="password" placeholder="CHAVE MASTER ARKANIS" className="w-full bg-black border border-white/5 p-6 rounded-3xl text-center font-black focus:border-yellow-500 outline-none text-xl shadow-inner transition-all" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                       <button className="w-full bg-yellow-500 text-black font-black p-6 rounded-3xl uppercase tracking-[0.4em] shadow-2xl hover:bg-yellow-400 hover:-translate-y-1 transition-all active:scale-95">Abrir Terminal</button>
                    </form>
                 </div>
               ) : (
                 <div className="space-y-12">
                    <header className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 flex justify-between items-center shadow-2xl relative overflow-hidden">
                       <div className="relative z-10">
                          <h3 className="font-black text-2xl uppercase italic tracking-tighter">Sessão {adminRole.toUpperCase()}</h3>
                          <p className="text-[10px] font-black uppercase text-yellow-500 tracking-[0.5em] mt-2">Conexão Estabilizada</p>
                       </div>
                       <div className="flex gap-4 relative z-10">
                         {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-5 rounded-2xl transition-all shadow-xl ${showSettings ? 'bg-yellow-500 text-black shadow-yellow-500/20' : 'bg-white/5 text-white hover:bg-white/10'}`}><Settings size={24}/></button>}
                         <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all shadow-xl active:scale-90"><LogOut size={24}/></button>
                       </div>
                    </header>

                    {showSettings && (
                      <div className="grid grid-cols-2 gap-10 animate-in zoom-in-95 duration-500">
                        <div className="bg-yellow-500/5 p-12 rounded-[3.5rem] border border-yellow-500/20 space-y-8 shadow-2xl">
                           <h4 className="font-black uppercase text-yellow-500 italic text-xl tracking-tighter"><Palette size={22} className="inline mr-3 mb-1"/> Identidade Site</h4>
                           <div className="flex items-center gap-8">
                              <img src={siteSettings.logoUrl} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-yellow-500/20 shadow-2xl" />
                              <div className="flex-1 space-y-3">
                                 <button onClick={() => logoInputRef.current?.click()} className="w-full bg-yellow-500 text-black font-black p-5 rounded-2xl uppercase text-xs tracking-widest hover:bg-yellow-400 shadow-xl transition-all">Mudar Logo</button>
                                 {isUploading && <p className="text-[10px] text-yellow-500 font-black uppercase text-center animate-pulse">{uploadProgress}</p>}
                              </div>
                              <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoUpdate} />
                           </div>
                        </div>
                        <div className="bg-blue-500/5 p-12 rounded-[3.5rem] border border-blue-500/20 space-y-6 shadow-2xl">
                           <h4 className="font-black uppercase text-blue-400 italic text-xl tracking-tighter"><Settings size={22} className="inline mr-3 mb-1"/> API GitHub Master</h4>
                           <input type="password" placeholder="TOKEN" className="w-full bg-black border border-white/5 p-4 rounded-2xl font-black text-xs outline-none focus:border-blue-500 shadow-inner" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} />
                           <div className="grid grid-cols-2 gap-4">
                              <input type="text" placeholder="DONO" className="bg-black border border-white/5 p-4 rounded-2xl font-black text-xs outline-none shadow-inner" value={ghConfig.owner} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} />
                              <input type="text" placeholder="REPO" className="bg-black border border-white/5 p-4 rounded-2xl font-black text-xs outline-none shadow-inner" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} />
                           </div>
                           <button onClick={saveGhConfig} className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl uppercase text-[10px] tracking-[0.2em] hover:bg-blue-500 shadow-xl transition-all">Guardar Chaves</button>
                        </div>
                      </div>
                    )}

                    <div className="bg-[#0a0a0a] p-12 rounded-[4rem] border border-white/5 space-y-10 shadow-2xl relative overflow-hidden">
                       <h3 className="text-3xl font-black italic uppercase text-yellow-500 tracking-tighter"><Plus size={32} className="inline mr-4 mb-1"/> Transmissão de Mural</h3>
                       <div className="grid grid-cols-2 gap-12">
                          <div className="space-y-4">
                             <div onClick={() => !isUploading && fileInputRef.current?.click()} className="aspect-video bg-black border-4 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] hover:border-yellow-500/20 transition-all group overflow-hidden relative shadow-inner">
                                {newPost.mediaUrl ? <img src={newPost.mediaUrl} className="w-full h-full object-cover" /> : <Camera size={64} className="text-gray-800 group-hover:text-yellow-500 transition-colors" />}
                                {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-pulse"><Loader2 className="animate-spin text-yellow-500" size={48}/></div>}
                             </div>
                             <p className="text-center text-[10px] font-black uppercase text-gray-600 tracking-widest italic">{isUploading ? uploadProgress : 'Anexar Mídia Oficial'}</p>
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" onChange={e => handleUpload(e, 'official')} />
                          <form onSubmit={createPost} className="space-y-5">
                             <input type="text" placeholder="TÍTULO DA TRANSMISSÃO" className="w-full bg-black border border-white/5 p-6 rounded-2xl font-black uppercase text-sm focus:border-yellow-500 outline-none shadow-inner transition-all" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                             <textarea placeholder="Relatório operacional detalhado..." className="w-full bg-black border border-white/5 p-8 rounded-[2.5rem] h-48 font-medium text-lg focus:border-yellow-500 outline-none shadow-inner resize-none transition-all" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}></textarea>
                             <button className="w-full bg-yellow-500 text-black font-black p-6 rounded-[2rem] uppercase tracking-[0.4em] shadow-2xl hover:bg-yellow-400 hover:-translate-y-1 transition-all active:scale-95">Disparar Relatório</button>
                          </form>
                       </div>
                    </div>

                    <div className="bg-[#0a0a0a] p-12 rounded-[4rem] border border-white/5 space-y-10 shadow-2xl">
                      <h3 className="text-3xl font-black italic uppercase text-green-500 tracking-tighter"><Users size={32} className="inline mr-4 mb-1"/> Recrutamento de Nações</h3>
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
                           {players.length === 0 ? <p className="text-center p-20 text-gray-700 font-black uppercase text-[10px] tracking-widest">Nenhum Lorde registado no banco de dados.</p> : 
                             players.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).map(p => (
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
        </div>
      </div>
      <footer className="mt-40 border-t border-white/5 py-32 text-center opacity-20 italic font-black uppercase tracking-[1em] text-[10px]">
        MMXXVI • PROTOCOLO ETERNUS • SINCRO TOTAL 100%
      </footer>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white">
       {isMobile ? <MobileUI /> : <DesktopUI />}
    </div>
  );
}

// --- SUBCOMPONENTES AUXILIARES ---

function MobileNavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-yellow-500 scale-110' : 'text-gray-600 hover:text-gray-400'}`}>
      <Icon size={24} className={active ? 'drop-shadow-[0_0_10px_#eab308]' : ''} />
      <span className="text-[7px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function DesktopNavBtn({ active, onClick, Icon, label, highlight }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] transition-all duration-300 ${highlight ? 'bg-yellow-500 text-black shadow-[0_15px_30px_rgba(234,179,8,0.3)] hover:scale-105 hover:bg-yellow-400 active:scale-95' : active ? 'bg-white/10 text-white translate-x-3 shadow-xl' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
      <div className="flex items-center gap-5">
        <Icon size={20} className={active && !highlight ? 'text-yellow-500' : ''} />
        <span>{label}</span>
      </div>
      <ChevronRight size={16} className={active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'} />
    </button>
  );
}

function LoreChapter({ num, title, children }) {
  return (
    <section className="bg-[#050505] p-10 rounded-[3rem] border border-white/5 shadow-2xl hover:border-yellow-500/20 transition-all group relative overflow-hidden">
      <div className="absolute -top-10 -left-10 text-[180px] font-black text-white/[0.01] italic select-none group-hover:text-yellow-500/5 transition-colors">{num}</div>
      <div className="relative z-10 flex items-center gap-8 mb-8">
        <span className="text-7xl font-black text-white/[0.05] italic leading-none group-hover:text-yellow-500/20 transition-all">{num}</span>
        <h3 className="text-4xl font-black text-yellow-500 uppercase italic tracking-tighter group-hover:translate-x-2 transition-transform">{title}</h3>
      </div>
      <p className="relative z-10 text-gray-400 leading-[2.2] font-medium text-justify border-l-4 border-white/10 pl-10 group-hover:border-yellow-500/40 transition-all text-xl">{children}</p>
    </section>
  );
}

function TeamSection({ color, name, players, reverse, isMobile }) {
  return (
    <div className={`flex flex-col ${reverse ? 'items-end text-right' : 'items-start'} space-y-12`}>
      <div className={reverse ? 'text-right' : 'text-left'}>
         <div className={`h-2 w-32 rounded-full mb-5 ${reverse ? 'ml-auto' : ''}`} style={{ backgroundColor: color, boxShadow: `0 0 30px ${color}` }}></div>
         <h2 className={`font-black italic uppercase tracking-tighter leading-none ${isMobile ? 'text-6xl' : 'text-9xl'}`} style={{color}}>{name}</h2>
         <p className="text-gray-600 uppercase font-black tracking-[1em] text-xs mt-4 italic">Membros Registados</p>
      </div>
      <div className={`grid w-full gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-4'}`}>
        {players.length === 0 ? <p className="col-span-full text-center py-20 bg-[#0a0a0a] rounded-3xl border border-dashed border-white/5 text-gray-800 font-black uppercase text-xs italic tracking-widest">Nação sem Lordes ativos</p> : 
          players.map(p => (
          <div key={p.id} className="bg-[#0a0a0a] p-8 rounded-[2rem] border-b-8 font-black italic text-3xl shadow-2xl hover:-translate-y-2 transition-all flex items-center justify-between group overflow-hidden relative" style={{ borderBottomColor: color }}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.01] rounded-full translate-x-8 -translate-y-8 group-hover:scale-150 transition-all"></div>
            <span className="relative z-10 truncate group-hover:scale-110 transition-transform origin-left">{p.name}</span>
            {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="relative z-10 p-2 text-gray-600 hover:text-white transition-colors"><LinkIcon size={20}/></a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SideCard({ color, name, desc }) {
  return (
    <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl group hover:border-white/20 transition-all overflow-hidden relative">
       <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.02] rounded-full group-hover:scale-150 transition-all"></div>
       <h4 className="font-black text-3xl mb-4 italic tracking-tighter uppercase leading-none" style={{color}}>{name}</h4>
       <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">{desc}</p>
       <div className="mt-8 h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
          <div className="h-full w-[40%] group-hover:w-full transition-all duration-[2000ms] ease-out shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{backgroundColor: color, boxShadow: `0 0 15px ${color}`}}></div>
       </div>
    </div>
  );
}

function StatusLine({ label, value, color }) {
  return (
    <div className="flex justify-between items-center text-xs font-black uppercase tracking-[0.2em] border-b border-white/5 pb-3">
       <span className="text-gray-600">{label}</span>
       <span className={`${color} italic drop-shadow-sm`}>{value}</span>
    </div>
  );
}

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
  Camera, Settings, Loader2, Palette, Lock, Link as LinkIcon, ImageIcon, User, Globe
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE (DADOS REAIS DO RAFA) ---
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
  
  const [globalError, setGlobalError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); 
  const [authError, setAuthError] = useState('');

  const [adminEmail, setAdminEmail] = useState('');
  const [adminAuthPass, setAdminAuthPass] = useState('');
  const [adminPass, setAdminPass] = useState(''); 

  const [posts, setPosts] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]); 
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const commFileInputRef = useRef(null); 

  const [siteSettings, setSiteSettings] = useState({
    logoUrl: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop',
    siteName: 'NÊMESIS 2'
  });

  const [ghConfig, setGhConfig] = useState({ token: '', owner: '', repo: '', path: 'media' });
  const [showSettings, setShowSettings] = useState(false);
  
  const [newPost, setNewPost] = useState({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  const [newPlayer, setNewPlayer] = useState({ name: '', team: 'andromeda', link: '', email: '' }); 
  const [newCommPost, setNewCommPost] = useState({ author: '', content: '', mediaUrl: '', mediaType: 'image' }); 
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth); 
          setGlobalError('');
        } catch (e) { console.error("Erro Auth:", e); }
      } else {
        setGlobalError('');
      }
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const postsCol = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
    const unsubscribePosts = onSnapshot(postsCol, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      setLoading(false);
    });

    const commCol = collection(db, 'artifacts', appId, 'public', 'data', 'community');
    const unsubscribeComm = onSnapshot(commCol, (snapshot) => {
      const commData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCommunityPosts(commData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });

    const playersCol = collection(db, 'artifacts', appId, 'public', 'data', 'players');
    const unsubscribePlayers = onSnapshot(playersCol, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const siteConfigDoc = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site');
    const unsubscribeSite = onSnapshot(siteConfigDoc, (snap) => {
      if (snap.exists()) setSiteSettings(snap.data());
    });

    const ghConfigDoc = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github');
    const unsubscribeGh = onSnapshot(ghConfigDoc, (snap) => {
      if (snap.exists()) setGhConfig(snap.data());
    });

    return () => {
      unsubscribePosts();
      unsubscribeComm();
      unsubscribeSite();
      unsubscribePlayers();
      unsubscribeGh();
    };
  }, [user]);

  const isRealUser = user && !user.isAnonymous;
  const loggedPlayer = isRealUser ? players.find(p => p.email && p.email.toLowerCase() === user.email?.toLowerCase()) : null;

  const handlePlayerAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        const isWhitelisted = players.some(p => p.email && p.email.toLowerCase() === authEmail.toLowerCase());
        if (!isWhitelisted) {
          setAuthError('E-mail não autorizado!');
          return;
        }
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthEmail(''); setAuthPassword('');
    } catch (err) {
      setAuthError('Falha na autenticação. Verifique os dados.');
    }
  };

  const handlePlayerLogout = async () => {
    setIsAdmin(false);
    setAdminRole(null);
    await signOut(auth); 
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (!isRealUser) {
        await signInWithEmailAndPassword(auth, adminEmail, adminAuthPass);
      }
      if (adminPass === 'ROGZINHU-T10b20cd00n804') { 
        setIsAdmin(true); setAdminRole('master'); setAdminPass('');
      } else if (adminPass === 'ADMNEMESIS15') {
        setIsAdmin(true); setAdminRole('admin'); setAdminPass('');
      } else {
        setAuthError('Chave de Acesso inválida!');
      }
    } catch (err) { setAuthError('E-mail ou Senha incorretos.'); }
  };

  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token || !ghConfig.owner || !ghConfig.repo) {
      setGlobalError("GitHub não configurado no painel Master!");
      return null;
    }
    // Aviso de tamanho
    if (file.size > 100 * 1024 * 1024) {
      setGlobalError("Ficheiro demasiado grande para o GitHub (Máx 100MB). Use a opção de Link Direto!");
      return null;
    }

    const path = subPath || ghConfig.path || 'media';
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        const content = reader.result.split(',')[1];
        try {
          const response = await fetch(
            `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${path}/${fileName}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${ghConfig.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ message: `Upload: ${fileName}`, content: content }),
            }
          );
          if (!response.ok) throw new Error('Erro API');
          const data = await response.json();
          resolve(data.content.download_url);
        } catch (error) { reject(error); }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress('A enviar para o GitHub...');
    try {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const url = await uploadToGitHub(file, 'official');
      if (url) {
        setNewPost(prev => ({ ...prev, mediaUrl: url, mediaType: type }));
        setUploadProgress('Pronto!');
      }
    } catch (err) { setGlobalError("Erro no upload. Tente um ficheiro menor ou use um link."); } 
    finally { setIsUploading(false); setTimeout(() => setUploadProgress(''), 3000); }
  };

  const handleCommFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress('Sincronizando...');
    try {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const url = await uploadToGitHub(file, 'community');
      if (url) {
        setNewCommPost(prev => ({ ...prev, mediaUrl: url, mediaType: type }));
        setUploadProgress('Sucesso!');
      }
    } catch (err) { setGlobalError("Erro. Use ficheiros menores que 100MB ou um link direto."); } 
    finally { setIsUploading(false); setTimeout(() => setUploadProgress(''), 3000); }
  };

  const handleLogoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToGitHub(file, 'system');
      if (url) {
        const siteConfigDoc = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site');
        await setDoc(siteConfigDoc, { ...siteSettings, logoUrl: url }, { merge: true });
        setUploadProgress('Logo atualizada!');
      }
    } catch (err) { setGlobalError("Erro ao atualizar logo."); }
    finally { setIsUploading(false); setTimeout(() => setUploadProgress(''), 3000); }
  };

  const saveGhConfig = async () => {
    if (!user) return;
    try {
      const configDoc = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github');
      await setDoc(configDoc, ghConfig);
      setShowSettings(false);
      setGlobalError('Configurações Salvas!');
      setTimeout(() => setGlobalError(''), 3000);
    } catch (err) { console.error(err); }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!user || !newPost.title || !newPost.content) return;
    const postsCol = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
    await addDoc(postsCol, { ...newPost, author: adminRole === 'master' ? 'Master Comandante' : 'Operador ADM', timestamp: Date.now() });
    setNewPost({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const deletePost = async (id) => {
    if (adminRole !== 'master') return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', id));
  };

  const createCommPost = async (e, forceAuthorName) => {
    e.preventDefault();
    const finalAuthor = forceAuthorName || newCommPost.author;
    if (!user || !finalAuthor || (!newCommPost.content && !newCommPost.mediaUrl)) return;
    const commCol = collection(db, 'artifacts', appId, 'public', 'data', 'community');
    await addDoc(commCol, { ...newCommPost, author: finalAuthor, timestamp: Date.now() });
    setNewCommPost({ author: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const deleteCommPost = async (id) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', id));
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!user || !newPlayer.name || !newPlayer.email) return;
    const playersCol = collection(db, 'artifacts', appId, 'public', 'data', 'players');
    await addDoc(playersCol, { ...newPlayer, timestamp: Date.now() });
    setNewPlayer({ name: '', team: 'andromeda', link: '', email: '' });
  };

  const deletePlayer = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', id));
  };

  const andromeda = ["Night", "Elma", "Netunolis", "Peixo", "Never", "Codein", "Virgula", "Little", "Rogzinhu", "Eddie", "Tio Thalys", "Yuri"];
  const helix = ["YasBruxa", "LeLeo", "Kirito", "Nisotto_", "daisukih", "TwinMilk", "FeehGaito", "Green Mage", "Fabrisla", "Oiyunao", "eclipsezero", "Flitz"];

  const dbAndromeda = players.filter(p => p.team === 'andromeda');
  const dbHelix = players.filter(p => p.team === 'helix');
  const displayAndromeda = players.length === 0 ? andromeda.map(name => ({ id: name, name, link: '', email: '' })) : dbAndromeda;
  const displayHelix = players.length === 0 ? helix.map(name => ({ id: name, name, link: '', email: '' })) : dbHelix;
  const allPlayerNames = players.length > 0 ? players.map(p => p.name) : [...andromeda, ...helix];
  
  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-yellow-500/30 font-sans overflow-x-hidden">
      {globalError && (
        <div className={`font-black text-center p-3 text-xs uppercase tracking-widest z-[100] relative transition-all ${globalError.includes('Salvas') || globalError.includes('Sucesso') ? 'bg-green-600' : 'bg-red-600 animate-pulse'}`}>
          {globalError}
          <button onClick={() => setGlobalError('')} className="ml-4 underline opacity-50 hover:opacity-100">Fechar</button>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-green-900 blur-[120px] rounded-full animate-pulse"></div>
      </div>

      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <img src={String(siteSettings.logoUrl)} className="w-12 h-12 rounded-lg shadow-xl object-cover border border-white/10" alt="Logo" />
            <span className="font-black text-2xl tracking-tighter italic uppercase hidden sm:block">{String(siteSettings.siteName)}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            <NavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural" />
            <NavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
            <NavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Lore" />
            <NavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Nações" />
            <button onClick={() => { setActiveTab('admin'); setAuthError(''); }} className={`p-3 rounded-xl transition flex items-center gap-2 ${activeTab === 'admin' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={20} />
              <span className="hidden md:block text-xs font-black uppercase">Painel</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        
        {activeTab === 'home' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative rounded-[2.5rem] overflow-hidden aspect-[21/9] min-h-[300px] flex items-center justify-center border border-white/5 shadow-2xl">
              <img src={String(siteSettings.logoUrl)} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" alt="Hero" />
              <div className="relative text-center px-4">
                <h2 className="text-yellow-500 font-black text-5xl md:text-8xl mb-4 tracking-tighter uppercase italic">Nações</h2>
                <p className="text-gray-400 tracking-[0.5em] uppercase text-xs md:text-sm font-bold mb-10 italic">O despertar dos escolhidos</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={() => setActiveTab('lore')} className="px-10 py-4 bg-white text-black font-black rounded-xl hover:bg-yellow-500 transition-all shadow-2xl uppercase italic">Ler Lore</button>
                  <button onClick={() => setActiveTab('teams')} className="px-10 py-4 bg-white/5 backdrop-blur-md border border-white/10 hover:border-white rounded-xl font-black transition-all shadow-2xl uppercase italic">Ver Times</button>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-10">
                <h3 className="text-2xl font-black flex items-center gap-3 px-2 uppercase italic tracking-tighter text-yellow-500">
                  <MessageSquare size={24} /> Transmissões Oficiais
                </h3>
                {loading ? (
                  <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-yellow-500" size={48} /></div>
                ) : posts.length === 0 ? (
                  <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] text-gray-600 font-black uppercase tracking-widest text-xs italic">Nenhuma transmissão captada.</div>
                ) : (
                  posts.map(post => (
                    <article key={post.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl transition-all hover:border-white/10">
                      <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-white/[0.02]">
                        <img src={String(siteSettings.logoUrl)} className="w-10 h-10 rounded-full border border-yellow-500/30 object-cover" alt="Author" />
                        <div>
                          <h4 className="font-black text-sm uppercase tracking-tight">{String(post.title || '')}</h4>
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{String(post.author || 'Sistema')}</p>
                        </div>
                      </div>
                      {post.mediaUrl && (
                        <div className="w-full bg-black flex items-center justify-center">
                          {post.mediaType === 'video' ? <video src={String(post.mediaUrl)} controls className="w-full max-h-[600px] object-contain" /> : <img src={String(post.mediaUrl)} className="w-full max-h-[600px] object-contain" alt="Media" />}
                        </div>
                      )}
                      <div className="p-8">
                        <div className="text-gray-300 text-lg whitespace-pre-wrap mb-6 leading-relaxed font-medium">{String(post.content || '')}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] italic opacity-30">Registro Temporal: {new Date(post.timestamp || Date.now()).toLocaleString()}</div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="space-y-8">
                <SideCard color="#bc13fe" name="Andromeda" desc="Reconstruir o legado do passado com a tecnologia do amanhã." />
                <SideCard color="#22c55e" name="Helix" desc="Evoluir em simbiose com as novas energias do mundo." />
                <div className="bg-yellow-500/5 border border-yellow-500/20 p-8 rounded-[2rem] space-y-4 shadow-2xl">
                   <h4 className="font-black uppercase text-yellow-500 flex items-center gap-2 italic tracking-tighter"><AlertTriangle size={18}/> Status Global</h4>
                   <StatusLine label="Lords" value="Ativos" color="text-red-500" />
                   <StatusLine label="Arcas" value="Sincronizadas" color="text-green-500" />
                   <div className="pt-2">
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-[85%] bg-yellow-500 shadow-[0_0_10px_#eab308]"></div>
                     </div>
                     <p className="text-[9px] font-black text-gray-500 mt-2 uppercase tracking-widest text-center">Nível de Purificação: 85%</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="max-w-4xl mx-auto space-y-16 animate-in slide-in-from-bottom duration-500">
            <header className="text-center mb-10">
              <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter">Galeria da Comunidade</h2>
              <p className="text-gray-400 mt-4 font-black uppercase tracking-widest text-xs">Compartilhe conquistas, momentos e memórias da arca.</p>
              <div className="w-32 h-2 bg-blue-500 mx-auto rounded-full mt-6 shadow-[0_0_15px_#3b82f6]"></div>
            </header>

            {isAdmin || isRealUser ? (
              <div className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient"></div>
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl flex items-center gap-2 uppercase italic tracking-tighter"><ImageIcon size={22} className="text-blue-500"/> Registrar Momento</h3>
                    {isRealUser && <button onClick={handlePlayerLogout} className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"><LogOut size={12}/> Desconectar</button>}
                 </div>
                 
                 <form onSubmit={(e) => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="space-y-4">
                   <div className="grid md:grid-cols-2 gap-4">
                      {isAdmin ? (
                        <select className="w-full bg-black border border-white/5 p-4 rounded-2xl focus:border-blue-500 outline-none font-black uppercase text-xs appearance-none cursor-pointer" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                           <option value="">AUTOR DO REGISTRO</option>
                           {allPlayerNames.sort().map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                      ) : (
                        <div className="w-full bg-black/50 border border-white/5 p-4 rounded-2xl flex items-center gap-3 opacity-80 shadow-inner">
                           <User size={16} className="text-blue-500" />
                           <span className="font-black uppercase text-xs tracking-tight">{loggedPlayer?.name || user.email}</span>
                        </div>
                      )}
                      
                      <div onClick={() => !isUploading && commFileInputRef.current?.click()} className={`w-full p-4 border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer transition-all bg-black hover:bg-white/[0.02] ${newCommPost.mediaUrl && !newCommPost.mediaUrl.startsWith('http') ? 'border-green-500/40' : 'border-white/5'}`}>
                         {isUploading ? <div className="flex items-center gap-2"><Loader2 className="animate-spin text-blue-500" size={16}/><span className="text-[10px] font-black uppercase text-blue-500">{uploadProgress}</span></div> : newCommPost.mediaUrl && !newCommPost.mediaUrl.startsWith('http') ? <span className="text-[10px] font-black uppercase text-green-500 font-bold">✓ MÍDIA ANEXADA (GITHUB)</span> : <div className="flex items-center gap-2 text-gray-500"><Camera size={16}/> <span className="text-[10px] font-black uppercase">ANEXAR (ATÉ 100MB)</span></div>}
                      </div>
                      <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={handleCommFileChange} />
                   </div>

                   {/* CAMPO DE LINK DIRETO (SEM LIMITES) */}
                   <div className="relative group">
                      <Globe size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                      <input type="text" placeholder="OU COLE UM LINK DIRETO (YouTube, Imgur, Discord, etc.)" className="w-full bg-black border border-white/5 p-5 pl-14 rounded-2xl focus:border-blue-500 outline-none font-black text-xs transition-all shadow-inner" value={newCommPost.mediaUrl.startsWith('http') ? newCommPost.mediaUrl : ''} onChange={(e) => {
                        const url = e.target.value;
                        setNewCommPost({...newCommPost, mediaUrl: url, mediaType: (url.includes('youtube') || url.includes('mp4') || url.includes('vimeo')) ? 'video' : 'image'});
                      }} />
                   </div>
                   
                   <textarea placeholder="DIGITE SUA MENSAGEM OU LEGENDA AQUI..." className="w-full bg-black border border-white/5 p-6 rounded-2xl focus:border-blue-500 outline-none h-24 font-medium resize-none leading-relaxed text-sm shadow-inner" value={newCommPost.content} onChange={(e) => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                   
                   <button disabled={isUploading || (!isAdmin && !loggedPlayer) || (isAdmin && !newCommPost.author) || (!newCommPost.content && !newCommPost.mediaUrl)} className="w-full font-black p-5 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:grayscale shadow-xl active:scale-[0.98] text-xs uppercase tracking-widest transition-all">
                      {isUploading ? 'PROCESSANDO...' : 'PUBLICAR NA GALERIA'}
                   </button>
                 </form>
              </div>
            ) : (
              <div className="bg-[#0a0a0a] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl max-w-md mx-auto text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                 <Lock size={32} className="text-blue-500 mx-auto mb-4" />
                 <h3 className="font-black text-xl uppercase italic mb-2 tracking-tighter">Terminal Restrito</h3>
                 <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-8 leading-relaxed px-4">Faça login para postar registros. Apenas membros alistados por um Comandante podem entrar.</p>
                 
                 {authError && <div className="mb-6 text-[10px] font-black uppercase text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{authError}</div>}
                 
                 <form onSubmit={handlePlayerAuth} className="space-y-3">
                    <input type="email" placeholder="SEU E-MAIL DA ARCA" required className="w-full bg-black border border-white/5 p-4 rounded-xl focus:border-blue-500 outline-none font-black text-xs transition-all shadow-inner" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                    <input type="password" placeholder="SUA SENHA DE ACESSO" required minLength="6" className="w-full bg-black border border-white/5 p-4 rounded-xl focus:border-blue-500 outline-none font-black text-xs transition-all shadow-inner" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                    <button type="submit" className="w-full font-black p-5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-lg active:scale-95 text-xs uppercase tracking-widest transition-all mt-4">
                       {authMode === 'login' ? 'Estabelecer Conexão' : 'Registrar Identidade'}
                    </button>
                 </form>
                 
                 <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="mt-8 text-[10px] text-gray-600 hover:text-white font-black uppercase transition-all tracking-widest">
                    {authMode === 'login' ? 'Não tem acesso? Registre-se aqui.' : 'Já possui registro? Clique aqui.'}
                 </button>
              </div>
            )}

            <div className="space-y-8">
               {communityPosts.length === 0 ? (
                  <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] text-gray-600 font-black uppercase tracking-widest text-xs italic">Nenhum registro da comunidade ainda. Seja o primeiro!</div>
               ) : (
                 <div className="columns-1 md:columns-2 gap-6 space-y-6">
                    {communityPosts.map(post => (
                      <div key={post.id} className="break-inside-avoid bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl group hover:border-blue-500/20 transition-all duration-500">
                         {post.mediaUrl && (
                           <div className="w-full bg-black relative">
                             {post.mediaType === 'video' ? (
                               post.mediaUrl.includes('youtube.com') || post.mediaUrl.includes('youtu.be') ? (
                                  <iframe src={`https://www.youtube.com/embed/${post.mediaUrl.split('v=')[1] || post.mediaUrl.split('/').pop()}`} className="w-full aspect-video border-none" allowFullScreen />
                               ) : <video src={String(post.mediaUrl)} controls className="w-full object-cover" />
                             ) : <img src={String(post.mediaUrl)} className="w-full object-cover border-b border-white/5" alt="Registro" />}
                             <div className="absolute top-4 left-4 flex gap-2">
                               <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[8px] font-black uppercase text-white/50 border border-white/10 tracking-widest">
                                 {post.mediaType === 'video' ? 'Vídeo' : 'Imagem'}
                               </span>
                             </div>
                           </div>
                         )}
                         <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-black text-xs text-white uppercase shadow-lg group-hover:rotate-6 transition-transform">{String(post.author).charAt(0)}</div>
                                  <div>
                                    <h4 className="font-black text-xs uppercase tracking-tight text-white group-hover:text-blue-400 transition-colors">{post.author}</h4>
                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{new Date(post.timestamp).toLocaleDateString()}</p>
                                  </div>
                               </div>
                               {isAdmin && <button onClick={() => deleteCommPost(post.id)} className="p-2.5 bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 rounded-xl transition-all"><Trash2 size={16}/></button>}
                            </div>
                            {post.content && <p className="text-gray-400 text-sm whitespace-pre-wrap leading-relaxed font-medium">{post.content}</p>}
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'lore' && (
          <div className="max-w-4xl mx-auto space-y-20 py-10 animate-in slide-in-from-bottom duration-500">
            <header className="text-center">
              <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white">Crônicas</h2>
              <div className="w-32 h-2 bg-yellow-500 mx-auto rounded-full mt-4 shadow-[0_0_15px_#eab308]"></div>
            </header>
            <LoreChapter num="I" title="A Era do Arkanis">
              Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente. Naquele tempo, as nações exploravam e experimentavam com magia e novas tecnologias, todas com potencial enorme. Porém, a ganância dessas nações era tremenda, e elas competiam entre si por poderio econômico. O recurso mais cobiçado por todas as nações era o Arkanis, um recurso lendário que podia ser usado tanto para avanços tecnológicos quanto para avanços na magia. Projetos envolvendo Arkanis eram tratados com o maior sigilo possível, pois eram os mais lucrativos. As descobertas feitas com o Arkanis eram revolucionárias, e as nações que não conseguiam acesso ao recurso se viam obrigadas a deixar a corrida por poder e aliar-se a outra nação que tinha acesso, a fim de compartilhar dos avanços.
            </LoreChapter>
            <LoreChapter num="II" title="O Olho de Hórus">
              Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder: uma máquina mágica que usava tecnologia dimensional, magia pura e Arkanis com o intuito de gerar energia e magia infinitas. O nome dessa máquina era "O Olho de Hórus". Mas algo aconteceu. A máquina não funcionou do jeito que previram. Na verdade, ela tornou o tecido da realidade extremamente fino, fazendo com que portais e fissuras na terra se abrissem por todo o globo. De dentro desses portais, criaturas desconhecidas começaram a invadir e causar destruição por onde passavam. Cidades foram arrasadas, biomas completos foram corrompidos, e tudo piorava à noite, quando as criaturas ficavam mais fortes e mais delas apareciam.
            </LoreChapter>
            <LoreChapter num="III" title="A Guerra dos Nêmesis">
              As nações mais poderosas se fecharam e culpavam umas às outras pelo ocorrido. Em meio à briga e ao desespero, dois grupos se formaram: os Ferronatos e os Etéreos. Os Ferronatos culpavam a magia, acreditando que ela era volátil, incontrolável e selvagem. Em contrapartida, os Etéreos culpavam a tecnologia, alegando que ela corrompia as mentes, destruía o ecossistema e deturpava o equilíbrio da vida. No fim, por causa da escassez de recursos básicos, Ferronatos e Etéreos entraram em conflito, ambos os lados usando suas armas mais poderosas na tentativa de aniquilar o outro. Este conflito ficou marcado na história como a Guerra dos Nêmesis.
            </LoreChapter>
            <LoreChapter num="IV" title="Protocolo Eternus">
              Em meio ao conflito, um grupo de pessoas composto por cientistas, engenheiros, magos e feiticeiros se uniu, pois possuíam pensamentos convergentes e notoriamente menos extremos. Juntos, eles utilizaram o que sobrou do Olho de Hórus e criaram o "Protocolo Eternus". O intuito deste protocolo era preservar a raça humana da inevitável destruição causada pela Guerra dos Nêmesis. Com isso, diversas arcas foram construídas junto de um grande satélite e lançadas ao espaço em segredo. Entretanto, o projeto acabou sendo vazado em seu momento mais crítico, fazendo com que os radicais Ferronatos e Etéreos atacassem as instalações do Protocolo Eternus, obrigando-o a ser lançado mais cedo que o esperado. Enquanto isso, Ferronatos e Etéreos se afundaram cada vez mais nos conflitos, até que, por fim, todo o mundo foi destruído.
            </LoreChapter>
            <LoreChapter num="V" title="O Despertar Prematuro">
              Durante o lançamento do Projeto Eternus, várias arcas foram perdidas e o satélite sofreu graves danos, mas, mesmo assim, a missão foi um sucesso. Contudo, uma grande quantidade de recursos foi perdida, fazendo com que os sistemas de hibernação das arcas, que mantinham os sobreviventes em estase por anos, falhassem e despertassem os passageiros mais cedo do que o esperado. Ao analisarem o planeta com os sistemas do satélite, os sobreviventes perceberam que o mundo havia mudado e anos haviam se passado, mas não o suficiente para que o planeta se purificasse por completo. Monstros muito mais perigosos rondavam a superfície, e o véu entre as dimensões ainda era muito fino. Ainda assim, havia esperança: a humanidade retornaria de suas cinzas e exploraria este novo mundo.
            </LoreChapter>
            <LoreChapter num="VI" title="O Nascimento das Nações">
              Durante a análise do planeta, o satélite mostrou que novos recursos foram formados e novas fontes de magia também foram encontradas, originadas da mistura de magia e radiação das guerras. Isso gerou uma divisão entre os sobreviventes: parte deles queria explorar esses novos recursos e reconstruir o império humano, evitando os erros do passado; já o outro grupo queria abandonar por completo o passado corrupto da humanidade e conviver no novo mundo em harmonia com sua nova forma. Dessa divisão de pensamentos, os grupos Andrômeda e Hélix nasceram, e agora eles disputam o futuro da raça humana.
            </LoreChapter>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-32 py-10 animate-in zoom-in duration-500">
            <TeamGrid color="#bc13fe" name="Andromeda" players={displayAndromeda} motto="Restauração Total" />
            <TeamGrid color="#22c55e" name="Helix" players={displayHelix} motto="Adaptação Extrema" reverse />
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto py-10 animate-in fade-in duration-500">
            {!isAdmin ? (
              <div className="bg-[#0a0a0a] p-16 rounded-[3rem] border border-white/5 text-center shadow-2xl max-w-xl mx-auto relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 shadow-[0_0_10px_#eab308]"></div>
                <Lock size={40} className="text-yellow-500 mx-auto mb-6 shadow-xl" />
                <h2 className="text-4xl font-black mb-8 uppercase tracking-tighter italic">Terminal Arca</h2>
                {authError && <div className="mb-6 text-[10px] font-black uppercase text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{authError}</div>}
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  {!isRealUser && (
                    <>
                      <input type="email" placeholder="E-MAIL DE COMANDO" required className="w-full bg-black border border-white/5 p-5 rounded-2xl focus:border-yellow-500 outline-none text-center font-black text-xs transition-all shadow-inner" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                      <input type="password" placeholder="SENHA DE IDENTIDADE" required className="w-full bg-black border border-white/5 p-5 rounded-2xl focus:border-yellow-500 outline-none text-center font-black text-xs transition-all shadow-inner" value={adminAuthPass} onChange={(e) => setAdminAuthPass(e.target.value)} />
                    </>
                  )}
                  {isRealUser && <div className="mb-4 text-[10px] font-black uppercase text-green-500 bg-green-500/5 p-4 rounded-xl border border-green-500/10 italic tracking-widest">Sessão Ativa: {loggedPlayer?.name || user.email}</div>}
                  <input type="password" placeholder="CHAVE DE ACESSO MASTER" required className="w-full bg-black border border-white/5 p-5 rounded-2xl focus:border-yellow-500 outline-none text-center font-black text-xs transition-all shadow-inner" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
                  <button className="w-full bg-yellow-500 text-black font-black p-6 rounded-2xl hover:bg-yellow-400 shadow-2xl active:scale-95 text-xs uppercase tracking-[0.2em] transition-all">Estabelecer Conexão</button>
                </form>
              </div>
            ) : (
              <div className="space-y-10">
                <header className="flex justify-between items-center bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                  <div>
                    <h3 className="font-black text-xl uppercase italic tracking-tighter">Terminal Ativo</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${adminRole === 'master' ? 'text-yellow-500 shadow-sm' : 'text-blue-500'}`}>{adminRole === 'master' ? 'Comandante Master' : 'Operador ADM'}</p>
                  </div>
                  <div className="flex gap-3">
                    {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-2xl transition-all ${showSettings ? 'bg-yellow-500 text-black shadow-[0_0_15px_#eab308]' : 'bg-white/5 text-white hover:bg-white/10'}`}><Settings size={22}/></button>}
                    <button onClick={() => setIsAdmin(false)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all"><LogOut size={22}/></button>
                  </div>
                </header>

                {showSettings && adminRole === 'master' && (
                  <div className="grid md:grid-cols-2 gap-8 animate-in zoom-in duration-300">
                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-10 rounded-[2.5rem] space-y-6 shadow-xl">
                      <h4 className="font-black uppercase text-yellow-500 italic flex items-center gap-2 tracking-tighter"><Palette size={18}/> Identidade</h4>
                      <div className="flex items-center gap-6">
                         <img src={String(siteSettings.logoUrl)} className="w-24 h-24 rounded-2xl object-cover border-2 border-yellow-500/50 shadow-2xl" alt="Logo Settings" />
                         <div className="flex-1 space-y-2">
                           <button disabled={isUploading} onClick={() => logoInputRef.current?.click()} className="w-full p-4 bg-yellow-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all">Mudar Logo</button>
                           {isUploading && <p className="text-[10px] text-yellow-500 font-black uppercase text-center animate-pulse">{uploadProgress}</p>}
                         </div>
                         <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpdate} />
                      </div>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/20 p-10 rounded-[2.5rem] space-y-4 shadow-xl">
                      <h4 className="font-black uppercase text-blue-400 italic flex items-center gap-2 tracking-tighter"><Settings size={18}/> GitHub API</h4>
                      <input type="password" placeholder="Token de Acesso" className="w-full bg-black border border-white/5 p-4 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-500 shadow-inner" value={String(ghConfig.token || '')} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Dono" className="bg-black border border-white/5 p-4 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-500 shadow-inner" value={String(ghConfig.owner || '')} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} />
                        <input type="text" placeholder="Repositorio" className="bg-black border border-white/5 p-4 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-500 shadow-inner" value={String(ghConfig.repo || '')} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} />
                      </div>
                      <button onClick={saveGhConfig} className="w-full bg-blue-600 text-white font-black p-4 rounded-xl uppercase text-[10px] tracking-[0.2em] hover:bg-blue-500 transition-all">Sincronizar Chaves</button>
                    </div>
                  </div>
                )}

                <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500/30"></div>
                  <h3 className="font-black text-2xl mb-8 flex items-center gap-3 uppercase italic tracking-tighter"><Plus size={28} className="text-yellow-500"/> Disparar Oficial</h3>
                  <div className="grid lg:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-full aspect-video border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all bg-black hover:bg-white/[0.02] ${newPost.mediaUrl && !newPost.mediaUrl.startsWith('http') ? 'border-yellow-500/40' : 'border-white/5'}`}>
                         {isUploading ? <div className="text-center"><Loader2 className="animate-spin text-yellow-500 mx-auto" /><p className="text-[10px] font-black uppercase text-yellow-500 mt-2">{uploadProgress}</p></div> : newPost.mediaUrl && !newPost.mediaUrl.startsWith('http') ? <img src={String(newPost.mediaUrl)} className="w-full h-full object-cover rounded-[2rem]" alt="Preview" /> : <div className="text-center text-gray-700"><Camera size={40} className="mx-auto"/><p className="text-[10px] font-black uppercase mt-2">Upload (Max 100MB)</p></div>}
                       </div>
                       <input type="text" placeholder="OU LINK DIRETO (SEM LIMITES)" className="w-full bg-black border border-white/5 p-4 rounded-xl focus:border-yellow-500 outline-none font-black text-[10px] shadow-inner" value={newPost.mediaUrl.startsWith('http') ? newPost.mediaUrl : ''} onChange={(e) => {
                          const url = e.target.value;
                          setNewPost({...newPost, mediaUrl: url, mediaType: (url.includes('youtube') || url.includes('mp4')) ? 'video' : 'image'});
                       }} />
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                    </div>
                    <form onSubmit={createPost} className="flex flex-col gap-4">
                       <input type="text" placeholder="TÍTULO DA TRANSMISSÃO" className="w-full bg-black border border-white/5 p-5 rounded-2xl focus:border-yellow-500 outline-none font-black uppercase text-sm shadow-inner" value={newPost.title} onChange={(e) => setNewPost({...newPost, title: e.target.value})} />
                       <textarea placeholder="CONTEÚDO DO RELATÓRIO..." className="w-full bg-black border border-white/5 p-6 rounded-3xl focus:border-yellow-500 outline-none h-40 font-medium resize-none leading-relaxed text-gray-300 shadow-inner" value={newPost.content} onChange={(e) => setNewPost({...newPost, content: e.target.value})}></textarea>
                       <button disabled={isUploading || !newPost.title} className="w-full font-black p-6 rounded-[2rem] bg-yellow-500 text-black hover:bg-yellow-400 shadow-2xl active:scale-95 text-sm uppercase tracking-widest transition-all">Publicar no Mural</button>
                    </form>
                  </div>
                </div>

                <div className="space-y-4">
                   <h3 className="font-black text-2xl px-6 uppercase italic tracking-tighter text-gray-500">Histórico de Transmissões</h3>
                   {posts.map(p => (
                     <div key={p.id} className="flex items-center justify-between bg-[#0a0a0a] p-6 rounded-[2rem] border border-white/5 group hover:border-white/20 transition-all shadow-xl">
                       <div className="flex items-center gap-6 overflow-hidden">
                          <img src={String(p.mediaUrl || siteSettings.logoUrl)} className="w-16 h-16 rounded-2xl object-cover border border-white/10" alt="Post" />
                          <div>
                            <h4 className="font-black text-white uppercase text-lg truncate leading-none mb-1 tracking-tight">{p.title}</h4>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Autor: {p.author}</p>
                          </div>
                       </div>
                       {adminRole === 'master' && <button onClick={() => deletePost(p.id)} className="p-4 bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 rounded-2xl transition-all active:scale-90"><Trash2 size={24}/></button>}
                     </div>
                   ))}
                </div>

                <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl mt-10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500/30"></div>
                  <h3 className="font-black text-2xl mb-8 flex items-center gap-3 uppercase italic tracking-tighter"><Users size={28} className="text-green-500"/> Gerenciar Nações</h3>
                  <div className="grid lg:grid-cols-2 gap-10">
                    <form onSubmit={addPlayer} className="flex flex-col gap-4">
                       <input type="text" placeholder="NOME DO LORDE" className="w-full bg-black border border-white/5 p-5 rounded-2xl focus:border-green-500 outline-none font-black uppercase text-sm shadow-inner" value={newPlayer.name} onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})} />
                       <input type="email" placeholder="E-MAIL DE REGISTRO" className="w-full bg-black border border-white/5 p-5 rounded-2xl focus:border-green-500 outline-none font-black text-xs shadow-inner" value={newPlayer.email} onChange={(e) => setNewPlayer({...newPlayer, email: e.target.value})} />
                       <select className="w-full bg-black border border-white/5 p-5 rounded-2xl focus:border-green-500 outline-none font-black uppercase text-xs appearance-none cursor-pointer shadow-inner" value={newPlayer.team} onChange={(e) => setNewPlayer({...newPlayer, team: e.target.value})}>
                          <option value="andromeda">Nação Andrômeda</option>
                          <option value="helix">Nação Hélix</option>
                       </select>
                       <div className="relative">
                          <LinkIcon size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input type="url" placeholder="LINK DO PERFIL (INSTAGRAM/DISCORD)" className="w-full bg-black border border-white/5 p-5 pl-14 rounded-2xl focus:border-green-500 outline-none font-black text-xs shadow-inner" value={newPlayer.link} onChange={(e) => setNewPlayer({...newPlayer, link: e.target.value})} />
                       </div>
                       <button className="w-full font-black p-5 rounded-[2rem] bg-green-600 text-white hover:bg-green-500 shadow-2xl active:scale-95 text-[10px] uppercase tracking-[0.2em] mt-2 transition-all">Alistar na Nação</button>
                    </form>
                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                       {players.length === 0 ? (
                         <div className="text-center p-10 text-gray-600 font-black text-[10px] uppercase italic border border-dashed border-white/5 rounded-2xl">Vazio.</div>
                       ) : players.map(p => (
                         <div key={p.id} className="flex items-center justify-between bg-black p-4 rounded-2xl border border-white/5 group hover:border-green-500/20 transition-all shadow-inner">
                           <div className="flex items-center gap-4">
                              <span className={`w-3 h-3 rounded-full ${p.team === 'andromeda' ? 'bg-[#bc13fe] shadow-[0_0_10px_#bc13fe]' : 'bg-[#22c55e] shadow-[0_0_10px_#22c55e]'}`}></span>
                              <div>
                                 <h4 className="font-black text-white uppercase text-xs tracking-tight">{p.name}</h4>
                                 <p className="text-[9px] text-blue-400 font-black tracking-widest">{p.email}</p>
                              </div>
                           </div>
                           <button onClick={() => deletePlayer(p.id)} className="p-3 bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 rounded-xl transition-all active:scale-90"><Trash2 size={16}/></button>
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

      <footer className="mt-20 border-t border-white/5 py-20 text-center opacity-20 italic font-black uppercase tracking-[0.8em] text-[9px]">
        Sincronizado via Protocolo Eternus • MMXXVI
      </footer>
    </div>
  );
}

function NavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 md:px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-300 ${active ? 'bg-yellow-500 text-black shadow-[0_0_15px_#eab30866]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
      {Icon && <Icon size={16}/>} 
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function LoreChapter({ num, title, children }) {
  return (
    <section className="group bg-white/[0.01] p-10 rounded-[3rem] border border-white/0 hover:border-white/5 transition-all shadow-2xl duration-500">
      <div className="flex items-center gap-8 mb-8 transition-transform group-hover:translate-x-2">
        <span className="text-8xl font-black text-white/[0.02] italic select-none leading-none">{num}</span>
        <h3 className="text-4xl font-black text-yellow-500 uppercase italic tracking-tighter leading-none group-hover:text-yellow-400 transition-colors">{title}</h3>
      </div>
      <div className="pl-12 text-gray-400 leading-[2.2] text-xl border-l-4 border-white/5 font-medium text-justify transition-all group-hover:border-yellow-500/30 group-hover:text-gray-200">{children}</div>
    </section>
  );
}

function TeamGrid({ color, name, players, motto, reverse }) {
  return (
    <div className={`flex flex-col ${reverse ? 'items-end text-right' : 'items-start'} space-y-12`}>
      <div className="space-y-3">
         <div className="h-2 w-32 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}></div>
         <h2 className="text-8xl font-black italic uppercase tracking-tighter leading-none" style={{color: color}}>{name}</h2>
         <p className="text-gray-600 text-sm font-black uppercase tracking-[0.6em] italic">{motto}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
        {players.map(p => {
          const isLink = !!p.link;
          const Tag = isLink ? 'a' : 'div';
          return (
            <Tag key={p.id} href={isLink ? p.link : undefined} target={isLink ? "_blank" : undefined}
              className={`bg-[#0a0a0a] p-6 font-black text-2xl italic shadow-2xl border-b-4 transition-all hover:-translate-y-2 flex items-center justify-between group ${isLink ? 'cursor-pointer hover:bg-white/[0.03]' : ''}`} 
              style={{borderBottomColor: color}}
            >
              <span className="truncate group-hover:scale-105 transition-transform origin-left" style={{color: isLink ? color : 'white'}}>{p.name}</span>
              {isLink && <LinkIcon size={20} className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 translate-x-2 group-hover:translate-x-0" style={{color}} />}
            </Tag>
          )
        })}
      </div>
    </div>
  );
}

function SideCard({ color, name, desc }) {
  return (
    <div className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 shadow-2xl group hover:border-white/10 transition-all duration-500 overflow-hidden relative">
       <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rounded-full translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform"></div>
       <h4 className="font-black text-2xl mb-2 italic tracking-tighter uppercase leading-none" style={{color}}>{name}</h4>
       <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase tracking-tight">{desc}</p>
       <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full w-[40%] group-hover:w-full transition-all duration-1000 ease-out" style={{backgroundColor: color, boxShadow: `0 0 10px ${color}`}}></div>
       </div>
    </div>
  );
}

function StatusLine({ label, value, color }) {
  return (
    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
       <span className="text-gray-600 tracking-[0.2em]">{label}</span>
       <span className={`${color} italic shadow-sm`}>{value}</span>
    </div>
  );
}

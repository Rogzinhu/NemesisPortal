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
        try { await signInAnonymously(auth); } catch (e) { console.error(e); }
      }
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Mural Oficial
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      setLoading(false);
    });

    // Galeria Comunidade
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'community'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCommunityPosts(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });

    // Players/Whitelist
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'players'), (snap) => {
      setPlayers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Configurações do Site
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site'), (snap) => {
      if (snap.exists()) setSiteSettings(snap.data());
    });

    // Configurações GitHub Master (Sincronizado)
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), (snap) => {
      if (snap.exists()) setGhConfig(snap.data());
    });
  }, [user]);

  const isRealUser = user && !user.isAnonymous;
  const loggedPlayer = isRealUser ? players.find(p => p.email && p.email.toLowerCase() === user.email?.toLowerCase()) : null;

  // --- FUNÇÃO DE UPLOAD ROBUSTA ---
  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token || !ghConfig.owner || !ghConfig.repo) {
      throw new Error("As chaves do GitHub não foram configuradas pelo Master!");
    }
    
    if (file.size > 25 * 1024 * 1024) {
      throw new Error("Ficheiro excede 25MB (limite do GitHub). Use a opção de link direto!");
    }

    const path = subPath || ghConfig.path || 'media';
    const fileName = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Falha ao ler o ficheiro no navegador."));
      reader.onload = async () => {
        try {
          const base64Content = reader.result.split(',')[1];
          const response = await fetch(
            `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${path}/${fileName}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${ghConfig.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `Upload de ${fileName} via Portal Nêmesis`,
                content: base64Content
              }),
            }
          );
          
          if (response.status === 401) throw new Error("Token Master inválido. Gere um novo no GitHub.");
          if (response.status === 404) throw new Error("Repositório ou Usuário não encontrado.");
          if (!response.ok) throw new Error(`Erro GitHub (${response.status}): ${response.statusText}`);
          
          const data = await response.json();
          resolve(data.content.download_url);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress('Sincronizando...');
    setGlobalError('');

    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const url = await uploadToGitHub(file, type === 'official' ? 'official' : 'community');
      
      if (type === 'official') {
        setNewPost(prev => ({ ...prev, mediaUrl: url, mediaType }));
      } else {
        setNewCommPost(prev => ({ ...prev, mediaUrl: url, mediaType }));
      }
      setUploadProgress('Sincronizado!');
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(''), 3000);
    }
  };

  const handleLogoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress('Atualizando...');
    try {
      const url = await uploadToGitHub(file, 'system');
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site'), { ...siteSettings, logoUrl: url }, { merge: true });
      setUploadProgress('Logo Salva!');
    } catch (err) { setGlobalError(err.message); }
    finally { setIsUploading(false); setTimeout(() => setUploadProgress(''), 3000); }
  };

  // --- SISTEMA DE LOGIN ---
  const handlePlayerAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        const isWhitelisted = players.some(p => p.email && p.email.toLowerCase() === authEmail.toLowerCase());
        if (!isWhitelisted) { setAuthError('E-mail não está na whitelist das nações!'); return; }
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else { await signInWithEmailAndPassword(auth, authEmail, authPassword); }
      setAuthEmail(''); setAuthPassword('');
    } catch (err) { setAuthError('Falha no terminal de acesso. Verifique os dados.'); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (!isRealUser) { await signInWithEmailAndPassword(auth, adminEmail, adminAuthPass); }
      if (adminPass === 'ROGZINHU-T10b20cd00n804') { setIsAdmin(true); setAdminRole('master'); }
      else if (adminPass === 'ADMNEMESIS15') { setIsAdmin(true); setAdminRole('admin'); }
      else { setAuthError('Chave Master incorreta.'); }
    } catch (err) { setAuthError('E-mail ou Senha incorretos.'); }
  };

  // --- AÇÕES DO BANCO ---
  const saveGhConfig = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), ghConfig);
      setShowSettings(false);
      setGlobalError('Chaves Sincronizadas com Sucesso!');
      setTimeout(() => setGlobalError(''), 3000);
    } catch (err) { setGlobalError('Erro ao salvar no banco.'); }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), {
      ...newPost, author: adminRole === 'master' ? 'Master Comandante' : 'Operador ADM', timestamp: Date.now()
    });
    setNewPost({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const createCommPost = async (e, forceName) => {
    e.preventDefault();
    const finalAuthor = forceName || newCommPost.author;
    if (!finalAuthor || (!newCommPost.content && !newCommPost.mediaUrl)) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community'), {
      ...newCommPost, author: finalAuthor, timestamp: Date.now()
    });
    setNewCommPost({ author: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name || !newPlayer.email) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'players'), { ...newPlayer, timestamp: Date.now() });
    setNewPlayer({ name: '', team: 'andromeda', link: '', email: '' });
  };

  const andromedaStatic = ["Night", "Elma", "Netunolis", "Peixo", "Never", "Codein", "Virgula", "Little", "Rogzinhu", "Eddie", "Tio Thalys", "Yuri"];
  const helixStatic = ["YasBruxa", "LeLeo", "Kirito", "Nisotto_", "daisukih", "TwinMilk", "FeehGaito", "Green Mage", "Fabrisla", "Oiyunao", "eclipsezero", "Flitz"];

  const displayAndromeda = players.length === 0 ? andromedaStatic.map(n => ({ id: n, name: n, link: '' })) : players.filter(p => p.team === 'andromeda');
  const displayHelix = players.length === 0 ? helixStatic.map(n => ({ id: n, name: n, link: '' })) : players.filter(p => p.team === 'helix');
  const allPlayerNames = players.length > 0 ? players.map(p => p.name) : [...andromedaStatic, ...helixStatic];

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-yellow-500/30 font-sans overflow-x-hidden">
      {globalError && (
        <div className={`fixed top-0 left-0 w-full p-4 text-[10px] font-black uppercase text-center z-[100] transition-all flex items-center justify-center gap-4 ${globalError.includes('Sucesso') ? 'bg-green-600' : 'bg-red-600 animate-pulse'}`}>
          <span>⚠️ {globalError}</span>
          <button onClick={() => setGlobalError('')} className="bg-black/20 px-3 py-1 rounded">Fechar</button>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-green-900 blur-[120px] rounded-full"></div>
      </div>

      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
            <img src={String(siteSettings.logoUrl)} className="w-12 h-12 rounded-lg object-cover border border-white/10" alt="Logo" />
            <span className="font-black text-2xl tracking-tighter italic uppercase hidden sm:block">{siteSettings.siteName}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            <NavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Mural" />
            <NavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} Icon={ImageIcon} label="Galeria" />
            <NavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Lore" />
            <NavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Nações" />
            <button onClick={() => setActiveTab('admin')} className={`p-3 rounded-xl transition ${activeTab === 'admin' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {activeTab === 'home' && (
          <div className="space-y-16 animate-in fade-in duration-700">
             <div className="relative rounded-[2.5rem] overflow-hidden aspect-[21/9] min-h-[300px] flex items-center justify-center border border-white/5 shadow-2xl">
              <img src={String(siteSettings.logoUrl)} className="absolute inset-0 w-full h-full object-cover brightness-[0.2]" />
              <div className="relative text-center px-4">
                <h2 className="text-yellow-500 font-black text-5xl md:text-8xl mb-4 tracking-tighter uppercase italic">Nações</h2>
                <p className="text-gray-400 tracking-[0.5em] uppercase text-xs md:text-sm font-bold mb-10 italic">O despertar dos escolhidos</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={() => setActiveTab('lore')} className="px-10 py-4 bg-white text-black font-black rounded-xl hover:bg-yellow-500 transition-all uppercase italic text-sm">Ler Lore</button>
                  <button onClick={() => setActiveTab('teams')} className="px-10 py-4 bg-white/5 backdrop-blur-md border border-white/10 hover:border-white rounded-xl font-black transition-all uppercase italic text-sm">Ver Times</button>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-10">
                <h3 className="text-2xl font-black flex items-center gap-3 uppercase italic tracking-tighter text-yellow-500">
                  <MessageSquare size={24} /> Transmissões Oficiais
                </h3>
                {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-yellow-500" size={48} /></div> : 
                  posts.map(post => (
                    <article key={post.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl transition-all hover:border-white/10">
                      <div className="p-6 flex items-center gap-4 bg-white/[0.02]">
                        <img src={String(siteSettings.logoUrl)} className="w-10 h-10 rounded-full border border-yellow-500/30 object-cover" />
                        <div>
                          <h4 className="font-black text-sm uppercase tracking-tight">{post.title}</h4>
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{post.author}</p>
                        </div>
                      </div>
                      {post.mediaUrl && (
                        <div className="w-full bg-black flex items-center justify-center">
                          {post.mediaType === 'video' ? <video src={String(post.mediaUrl)} controls className="w-full max-h-[600px]" /> : <img src={String(post.mediaUrl)} className="w-full max-h-[600px] object-contain" />}
                        </div>
                      )}
                      <div className="p-8">
                        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] italic opacity-20 mt-6">{new Date(post.timestamp).toLocaleString()}</p>
                      </div>
                    </article>
                  ))
                }
              </div>
              <div className="space-y-8">
                <SideCard color="#bc13fe" name="Andromeda" desc="Reconstruir o legado com tecnologia." />
                <SideCard color="#22c55e" name="Helix" desc="Evoluir em simbiose com a energia." />
                <div className="bg-yellow-500/5 border border-yellow-500/20 p-8 rounded-[2rem] space-y-4">
                   <h4 className="font-black uppercase text-yellow-500 flex items-center gap-2 italic"><AlertTriangle size={18}/> Status Global</h4>
                   <StatusLine label="Lords" value="Ativos" color="text-red-500" />
                   <StatusLine label="Arcas" value="Sincronizadas" color="text-green-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom duration-500">
            <header className="text-center">
              <h2 className="text-5xl font-black italic uppercase tracking-tighter">Galeria da Comunidade</h2>
              <div className="w-32 h-2 bg-blue-500 mx-auto rounded-full mt-4"></div>
            </header>

            {(isAdmin || isRealUser) ? (
              <div className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-black text-xl flex items-center gap-2 uppercase italic tracking-tighter text-blue-500"><ImageIcon size={22}/> Novo Registro</h3>
                   {isRealUser && <button onClick={() => signOut(auth)} className="text-[9px] font-black uppercase text-red-500 flex items-center gap-1 hover:underline"><LogOut size={12}/> Desconectar</button>}
                </div>
                <form onSubmit={(e) => createCommPost(e, isAdmin ? null : loggedPlayer?.name)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {isAdmin ? (
                      <select className="bg-black border border-white/5 p-4 rounded-xl font-black uppercase text-[10px] outline-none" value={newCommPost.author} onChange={e => setNewCommPost({...newCommPost, author: e.target.value})}>
                        <option value="">AUTOR DO REGISTRO</option>
                        {allPlayerNames.sort().map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    ) : <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-black uppercase text-[10px] flex items-center gap-2"><User size={14} className="text-blue-500"/> {loggedPlayer?.name || user.email}</div>}
                    <div onClick={() => !isUploading && commFileInputRef.current?.click()} className={`p-4 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all ${newCommPost.mediaUrl && !newCommPost.mediaUrl.startsWith('http') ? 'border-green-500/40 bg-green-500/5' : 'border-white/5 bg-black'}`}>
                      {isUploading ? <div className="flex items-center gap-2 animate-pulse"><Loader2 size={14} className="animate-spin text-blue-500"/> <span className="text-[9px] font-black uppercase text-blue-500">{uploadProgress}</span></div> : newCommPost.mediaUrl && !newCommPost.mediaUrl.startsWith('http') ? <span className="text-[9px] font-black text-green-500">MÍDIA PRONTA ✓</span> : <div className="flex items-center gap-2 text-gray-500"><Camera size={14}/> <span className="text-[9px] font-black uppercase">ANEXAR (GITHUB)</span></div>}
                    </div>
                    <input type="file" ref={commFileInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileChange(e, 'community')} />
                  </div>
                  <div className="relative">
                    <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input type="text" placeholder="OU COLE UM LINK DIRETO (YouTube, Discord...)" className="w-full bg-black border border-white/5 p-4 pl-12 rounded-xl focus:border-blue-500 outline-none font-black text-[10px] uppercase shadow-inner" value={newCommPost.mediaUrl.startsWith('http') ? newCommPost.mediaUrl : ''} onChange={e => {
                       const url = e.target.value;
                       setNewCommPost({...newCommPost, mediaUrl: url, mediaType: (url.includes('youtu') || url.includes('mp4')) ? 'video' : 'image'});
                    }} />
                  </div>
                  <textarea placeholder="DESCRIÇÃO DO MOMENTO..." className="w-full bg-black border border-white/5 p-5 rounded-xl h-24 font-medium text-sm outline-none focus:border-blue-500" value={newCommPost.content} onChange={e => setNewCommPost({...newCommPost, content: e.target.value})}></textarea>
                  <button disabled={isUploading || (!isAdmin && !loggedPlayer)} className="w-full bg-blue-600 p-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 active:scale-95 transition-all shadow-xl">Publicar na Galeria</button>
                </form>
              </div>
            ) : (
              <div className="bg-[#0a0a0a] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl max-w-md mx-auto text-center">
                 <Lock size={32} className="text-blue-500 mx-auto mb-4" />
                 <h3 className="font-black text-xl uppercase mb-2">Terminal Restrito</h3>
                 <p className="text-[9px] text-gray-500 font-black uppercase mb-8">Login necessário para registar memórias.</p>
                 {authError && <div className="mb-4 p-3 bg-red-500/10 text-red-500 font-black text-[9px] rounded-lg uppercase">{authError}</div>}
                 <form onSubmit={handlePlayerAuth} className="space-y-3">
                    <input type="email" placeholder="E-MAIL" className="w-full bg-black border border-white/5 p-4 rounded-xl font-black text-[10px] uppercase outline-none" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                    <input type="password" placeholder="SENHA" className="w-full bg-black border border-white/5 p-4 rounded-xl font-black text-[10px] outline-none" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                    <button className="w-full bg-blue-600 p-4 rounded-xl font-black text-[10px] uppercase shadow-lg">Aceder Sistema</button>
                 </form>
                 <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 text-[9px] text-gray-600 font-black uppercase hover:text-white transition-all">{authMode === 'login' ? 'Criar nova identidade' : 'Já possuo registo'}</button>
              </div>
            )}

            <div className="columns-1 md:columns-2 gap-6 space-y-6">
              {communityPosts.map(post => (
                <div key={post.id} className="break-inside-avoid bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl group hover:border-blue-500/30 transition-all duration-500">
                  {post.mediaUrl && (
                    <div className="w-full bg-black relative">
                      {post.mediaType === 'video' ? (
                        post.mediaUrl.includes('youtu') ? (
                          <iframe src={`https://www.youtube.com/embed/${post.mediaUrl.split('v=')[1] || post.mediaUrl.split('/').pop()}`} className="w-full aspect-video border-none" allowFullScreen />
                        ) : <video src={String(post.mediaUrl)} controls className="w-full" />
                      ) : <img src={String(post.mediaUrl)} className="w-full object-cover border-b border-white/5" alt="Registro" />}
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-black text-xs text-white uppercase">{String(post.author).charAt(0)}</div>
                          <div>
                            <h4 className="font-black text-[11px] uppercase text-white group-hover:text-blue-400 transition-colors">{post.author}</h4>
                            <p className="text-[8px] text-gray-600 font-black uppercase">{new Date(post.timestamp).toLocaleDateString()}</p>
                          </div>
                       </div>
                       {isAdmin && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community', post.id))} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"><Trash2 size={14}/></button>}
                    </div>
                    {post.content && <p className="text-gray-400 text-xs leading-relaxed">{post.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'lore' && (
          <div className="max-w-4xl mx-auto space-y-20 py-10 animate-in slide-in-from-bottom duration-500">
            <header className="text-center"><h2 className="text-6xl font-black italic uppercase tracking-tighter">Crônicas</h2><div className="w-32 h-2 bg-yellow-500 mx-auto rounded-full mt-4 shadow-[0_0_15px_#eab308]"></div></header>
            <LoreChapter num="I" title="A Era do Arkanis">Houve uma época em que nosso mundo foi completamente diferente do que é hoje, uma era que se passou, mas que deixou uma marca profunda que alterou nosso mundo permanentemente. Naquele tempo, as nações exploravam e experimentavam com magia e novas tecnologias, todas com potencial enorme. Porém, a ganância dessas nações era tremenda, e elas competiam entre si por poderio econômico. O recurso mais cobiçado por todas as nações era o Arkanis, um recurso lendário que podia ser usado tanto para avanços tecnológicos quanto para avanços na magia.</LoreChapter>
            <LoreChapter num="II" title="O Olho de Hórus">Num fatídico dia, em um laboratório de uma dessas nações, uma equipe trabalhava em um projeto que traria o fim para a corrida de poder: uma máquina mágica que usava tecnologia dimensional, magia pura e Arkanis com o intuito de gerar energia e magia infinitas. O nome dessa máquina era "O Olho de Hórus". Mas algo aconteceu. A máquina não funcionou do jeito que previram. Na verdade, ela tornou o tecido da realidade extremamente fino, fazendo com que portais e fissuras na terra se abrissem por todo o globo.</LoreChapter>
            <LoreChapter num="III" title="A Guerra dos Nêmesis">As nações mais poderosas se fecharam e culpavam umas às outras pelo ocorrido. Em meio à briga e ao desespero, dois grupos se formaram: os Ferronatos e os Etéreos. Os Ferronatos culpavam a magia, acreditando que ela era volátil, incontrolável e selvagem. Em contrapartida, os Etéreos culpavam a tecnologia, alegando que ela corrompia as mentes, destruía o ecossistema e deturpava o equilíbrio da vida.</LoreChapter>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-32 py-10 animate-in zoom-in duration-500">
            <TeamGrid color="#bc13fe" name="Andromeda" players={displayAndromeda} motto="Restauração Total" />
            <TeamGrid color="#22c55e" name="Helix" players={displayHelix} motto="Adaptação Extrema" reverse />
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto py-10">
            {!isAdmin ? (
              <div className="bg-[#0a0a0a] p-16 rounded-[3rem] border border-white/5 text-center shadow-2xl max-w-xl mx-auto relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                <Lock size={40} className="text-yellow-500 mx-auto mb-6" />
                <h2 className="text-4xl font-black mb-8 uppercase tracking-tighter italic">Terminal Master</h2>
                {authError && <div className="mb-6 p-4 bg-red-500/10 text-red-500 font-black text-[10px] rounded-xl uppercase border border-red-500/20">{authError}</div>}
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  {!isRealUser && (
                    <div className="grid grid-cols-2 gap-4">
                       <input type="email" placeholder="E-MAIL" className="bg-black border border-white/5 p-4 rounded-xl font-black text-[10px] outline-none focus:border-yellow-500 shadow-inner" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                       <input type="password" placeholder="SENHA" className="bg-black border border-white/5 p-4 rounded-xl font-black text-[10px] outline-none focus:border-yellow-500 shadow-inner" value={adminAuthPass} onChange={e => setAdminAuthPass(e.target.value)} />
                    </div>
                  )}
                  {isRealUser && <div className="mb-4 text-[9px] font-black uppercase text-green-500 bg-green-500/5 p-3 rounded-lg border border-green-500/10">Sessão: {loggedPlayer?.name || user.email}</div>}
                  <input type="password" placeholder="CHAVE MASTER" className="w-full bg-black border border-white/5 p-5 rounded-2xl focus:border-yellow-500 outline-none text-center font-black text-xs shadow-inner" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
                  <button className="w-full bg-yellow-500 text-black font-black p-6 rounded-2xl hover:bg-yellow-400 shadow-2xl active:scale-95 text-xs uppercase tracking-widest transition-all">Aceder Painel</button>
                </form>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in duration-500">
                <header className="flex justify-between items-center bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                   <div><h3 className="font-black text-xl uppercase italic">Terminal Master</h3><p className={`text-[9px] font-black uppercase tracking-widest ${adminRole === 'master' ? 'text-yellow-500' : 'text-blue-500'}`}>{adminRole === 'master' ? 'Comandante Master' : 'Operador ADM'}</p></div>
                   <div className="flex gap-3">
                      {adminRole === 'master' && <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-2xl transition-all ${showSettings ? 'bg-yellow-500 text-black shadow-[0_0:15px_#eab308]' : 'bg-white/5 text-white hover:bg-white/10'}`}><Settings size={22}/></button>}
                      <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all"><LogOut size={22}/></button>
                   </div>
                </header>

                {showSettings && adminRole === 'master' && (
                  <div className="grid md:grid-cols-2 gap-8 animate-in zoom-in duration-300">
                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-8 rounded-[2.5rem] space-y-6">
                      <h4 className="font-black uppercase text-yellow-500 italic flex items-center gap-2"><Palette size={18}/> Visual</h4>
                      <div className="flex items-center gap-6">
                         <img src={String(siteSettings.logoUrl)} className="w-20 h-20 rounded-2xl object-cover border-2 border-yellow-500/50" />
                         <div className="flex-1 space-y-2">
                           <button disabled={isUploading} onClick={() => logoInputRef.current?.click()} className="w-full p-4 bg-yellow-500 text-black font-black rounded-xl text-[10px] uppercase">Mudar Logo</button>
                           {isUploading && <p className="text-[9px] text-yellow-500 font-black uppercase text-center animate-pulse">{uploadProgress}</p>}
                         </div>
                         <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpdate} />
                      </div>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/20 p-8 rounded-[2.5rem] space-y-4">
                      <h4 className="font-black uppercase text-blue-400 italic flex items-center gap-2"><Settings size={18}/> GitHub Master</h4>
                      <input type="password" placeholder="Token" className="w-full bg-black border border-white/5 p-4 rounded-xl text-[10px] font-black outline-none focus:border-blue-500 shadow-inner" value={String(ghConfig.token || '')} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Dono" className="bg-black border border-white/5 p-4 rounded-xl text-[10px] outline-none shadow-inner" value={String(ghConfig.owner || '')} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} />
                        <input type="text" placeholder="Repo" className="bg-black border border-white/5 p-4 rounded-xl text-[10px] outline-none shadow-inner" value={String(ghConfig.repo || '')} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} />
                      </div>
                      <button onClick={saveGhConfig} className="w-full bg-blue-600 text-white font-black p-4 rounded-xl uppercase text-[10px] hover:bg-blue-500">Sincronizar Chaves</button>
                    </div>
                  </div>
                )}

                <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                   <h3 className="font-black text-2xl mb-8 flex items-center gap-3 uppercase italic text-yellow-500"><Plus size={28}/> Transmissão Oficial</h3>
                   <div className="grid lg:grid-cols-2 gap-10">
                     <div className="space-y-4">
                        <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-full aspect-video border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all bg-black hover:bg-white/[0.02] ${newPost.mediaUrl && !newPost.mediaUrl.startsWith('http') ? 'border-green-500/40' : 'border-white/5'}`}>
                          {isUploading ? <div className="text-center animate-pulse"><Loader2 className="animate-spin text-yellow-500 mx-auto" /><p className="text-[9px] font-black uppercase text-yellow-500 mt-2">{uploadProgress}</p></div> : newPost.mediaUrl && !newPost.mediaUrl.startsWith('http') ? <img src={String(newPost.mediaUrl)} className="w-full h-full object-cover rounded-[2rem]" /> : <div className="text-center text-gray-700"><Camera size={40} className="mx-auto"/><p className="text-[10px] font-black uppercase mt-2">Upload (Max 25MB)</p></div>}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileChange(e, 'official')} />
                     </div>
                     <form onSubmit={createPost} className="flex flex-col gap-4">
                        <input type="text" placeholder="TÍTULO" className="w-full bg-black border border-white/5 p-5 rounded-xl outline-none focus:border-yellow-500 font-black uppercase text-sm" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                        <textarea placeholder="RELATÓRIO..." className="w-full bg-black border border-white/5 p-6 rounded-xl outline-none focus:border-yellow-500 h-40 font-medium resize-none text-gray-300" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}></textarea>
                        <button disabled={isUploading || !newPost.title} className="w-full bg-yellow-500 p-6 rounded-xl font-black uppercase text-xs tracking-widest text-black hover:bg-yellow-400 shadow-2xl active:scale-[0.98] transition-all">Lançar Mensagem</button>
                     </form>
                   </div>
                </div>

                <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl mt-10 relative overflow-hidden">
                  <h3 className="font-black text-2xl mb-8 flex items-center gap-3 uppercase italic text-green-500"><Users size={28}/> Gerenciar Nações</h3>
                  <div className="grid lg:grid-cols-2 gap-10">
                    <form onSubmit={addPlayer} className="space-y-4">
                       <input type="text" placeholder="NOME DO JOGADOR" className="w-full bg-black border border-white/5 p-5 rounded-xl font-black uppercase text-sm outline-none focus:border-green-500" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
                       <input type="email" placeholder="E-MAIL DE REGISTO" className="w-full bg-black border border-white/5 p-5 rounded-xl font-black text-xs outline-none focus:border-green-500" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
                       <select className="w-full bg-black border border-white/5 p-5 rounded-xl font-black uppercase text-[10px] outline-none focus:border-green-500" value={newPlayer.team} onChange={e => setNewPlayer({...newPlayer, team: e.target.value})}>
                          <option value="andromeda">Nação Andrômeda</option>
                          <option value="helix">Nação Hélix</option>
                       </select>
                       <button className="w-full bg-green-600 p-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-500 transition-all shadow-xl">Alistar Membro</button>
                    </form>
                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                       {players.map(p => (
                         <div key={p.id} className="flex items-center justify-between bg-black p-4 rounded-xl border border-white/5 group hover:border-green-500/20 transition-all shadow-inner">
                           <div className="flex items-center gap-4">
                              <span className={`w-2.5 h-2.5 rounded-full ${p.team === 'andromeda' ? 'bg-[#bc13fe] shadow-[0_0_8px_#bc13fe]' : 'bg-[#22c55e] shadow-[0_0_8px_#22c55e]'}`}></span>
                              <div><h4 className="font-black text-white uppercase text-[11px]">{p.name}</h4><p className="text-[8px] text-blue-400 font-black tracking-widest">{p.email}</p></div>
                           </div>
                           <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id))} className="p-3 bg-red-500/10 text-red-500/40 hover:text-red-500 rounded-xl transition-all"><Trash2 size={14}/></button>
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

      <footer className="mt-20 border-t border-white/5 py-20 text-center opacity-20 italic font-black uppercase tracking-[0.8em] text-[9px]">MMXXVI • PROTOCOLO ETERNUS</footer>
    </div>
  );
}

function NavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 md:px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-300 ${active ? 'bg-yellow-500 text-black shadow-[0_0_15px_#eab30866]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
      {Icon && <Icon size={16}/>} <span className="hidden md:inline">{label}</span>
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

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, setDoc, deleteDoc, getDoc, updateDoc, query, where, getDocs
} from 'firebase/firestore';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut, signInAnonymously, signInWithCustomToken
} from 'firebase/auth';
import { 
  Home, Search, Compass, Heart, PlusSquare, User, Settings, 
  ShieldCheck, LogOut, MessageCircle, Send, Bookmark, 
  MoreHorizontal, CheckCircle2, Globe, Users, Camera, Loader2, X, AlertCircle
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
const appId = 'nemesis-social-v2';

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); 
  const [feedFilter, setFeedFilter] = useState('official'); 
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [ghConfig, setGhConfig] = useState({ token: '', owner: '', repo: '', path: 'social-media' });

  // Monitorizar Autenticação e Perfil
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setErrorState(null);
      if (u) {
        try {
          const userDocRef = doc(db, 'artifacts', appId, 'users', u.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            // Se o utilizador existe no Auth mas não no Firestore
            console.warn("Perfil não encontrado no Firestore para o UID:", u.uid);
            setErrorState("perfil_nao_encontrado");
          }
          
          const configDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'));
          if (configDoc.exists()) setGhConfig(configDoc.data());
          
          setUser(u);
        } catch (err) {
          console.error("Erro ao carregar dados do utilizador:", err);
          setErrorState("erro_conexao");
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // Monitorizar Dados Globais (Posts e Stories)
  useEffect(() => {
    if (!user || !userData) return;

    const postsCol = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
    const unsubPosts = onSnapshot(postsCol, (snap) => {
      const p = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(p.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (err) => console.error("Erro Posts:", err));

    const storiesCol = collection(db, 'artifacts', appId, 'public', 'data', 'stories');
    const unsubStories = onSnapshot(storiesCol, (snap) => {
      const s = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const now = Date.now();
      setStories(s.filter(story => (now - (story.createdAt || 0)) < 86400000));
    }, (err) => console.error("Erro Stories:", err));

    return () => { unsubPosts(); unsubStories(); };
  }, [user, userData]);

  if (loading) return <LoadingScreen />;

  // Se houver erro de perfil não encontrado, mostra opção de sair ou erro
  if (errorState === "perfil_nao_encontrado") {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-black uppercase italic mb-2 text-white">Perfil não sincronizado</h2>
        <p className="text-zinc-500 text-sm max-w-xs mb-6">
          A tua conta existe, mas os teus dados de nação não foram encontrados na Arca. Contacta um administrador.
        </p>
        <button 
          onClick={() => signOut(auth)}
          className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs hover:bg-zinc-800 transition"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (!userData) return <LoadingScreen message="A preparar perfil..." />;

  return (
    <div className="min-h-screen bg-black text-white flex font-sans">
      {/* Sidebar */}
      <nav className="w-20 md:w-64 border-r border-zinc-800 h-screen sticky top-0 flex flex-col p-4 z-50 bg-black">
        <div className="mb-10 px-2" onClick={() => setActiveTab('home')} style={{cursor: 'pointer'}}>
          <h1 className="text-2xl font-black hidden md:block italic tracking-tighter bg-gradient-to-r from-purple-500 to-green-500 bg-clip-text text-transparent">NEMESIS</h1>
          <div className="w-8 h-8 md:hidden bg-gradient-to-tr from-purple-500 to-green-500 rounded-lg"></div>
        </div>

        <div className="flex-1 space-y-2">
          <NavItem icon={<Home />} label="Início" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={<Search />} label="Pesquisa" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
          <NavItem icon={<Compass />} label="Explorar" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <NavItem icon={<Heart />} label="Notificações" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
          <NavItem icon={<PlusSquare />} label="Criar" onClick={() => setIsPostModalOpen(true)} />
          <NavItem 
            icon={<div className={`w-6 h-6 rounded-full border-2 ${userData?.nation === 'andromeda' ? 'border-purple-500' : 'border-green-500'} overflow-hidden`}>
              <img src={userData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} className="w-full h-full object-cover" alt="Perfil" />
            </div>} 
            label="Perfil" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
        </div>

        <div className="mt-auto pt-4 border-t border-zinc-800 space-y-2">
          {userData?.isAdmin && (
            <NavItem 
              icon={<ShieldCheck className="text-red-500" />} 
              label="Painel Admin" 
              active={activeTab === 'admin'} 
              onClick={() => setActiveTab('admin')} 
            />
          )}
          <NavItem icon={<LogOut />} label="Sair" onClick={() => signOut(auth)} />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {activeTab === 'home' && (
            <div className="max-w-[600px] mx-auto animate-in fade-in duration-500">
              {/* Stories Bar */}
              <div className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide">
                <StoryItem isUser user={userData} />
                {stories.map(s => <StoryItem key={s.id} story={s} />)}
              </div>

              {/* Feed Switcher */}
              <div className="flex border-b border-zinc-800 mb-6">
                <button 
                  onClick={() => setFeedFilter('official')}
                  className={`flex-1 py-4 font-bold text-sm tracking-widest uppercase transition-all ${feedFilter === 'official' ? 'border-b-2 border-white text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Nemesis Oficial
                </button>
                <button 
                  onClick={() => setFeedFilter('nations')}
                  className={`flex-1 py-4 font-bold text-sm tracking-widest uppercase transition-all ${feedFilter === 'nations' ? 'border-b-2 border-white text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Nações
                </button>
              </div>

              {/* Feed Posts */}
              <div className="space-y-6">
                {posts
                  .filter(p => feedFilter === 'official' ? p.isOfficial : !p.isOfficial)
                  .map(post => <PostCard key={post.id} post={post} isAdmin={userData?.isAdmin} />)
                }
                {posts.filter(p => feedFilter === 'official' ? p.isOfficial : !p.isOfficial).length === 0 && (
                  <div className="py-20 text-center text-zinc-600 font-bold uppercase italic border-2 border-dashed border-zinc-900 rounded-3xl">
                    Nenhuma transmissão captada.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && <ProfileView userData={userData} posts={posts.filter(p => p.userId === user?.uid)} ghConfig={ghConfig} />}
          {activeTab === 'admin' && userData?.isAdmin && <AdminPanel ghConfig={ghConfig} />}
          {activeTab === 'notifications' && <NotificationsView />}
          {activeTab === 'search' && <div className="text-center py-20 text-zinc-500 uppercase font-black italic tracking-widest">Sistemas de varredura em manutenção...</div>}
          {activeTab === 'explore' && <div className="text-center py-20 text-zinc-500 uppercase font-black italic tracking-widest">A explorar novos horizontes...</div>}

        </div>
      </main>

      {/* Post Modal */}
      {isPostModalOpen && (
        <PostModal 
          userData={userData} 
          ghConfig={ghConfig} 
          onClose={() => setIsPostModalOpen(false)} 
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENTES DE INTERFACE ---

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 p-3 w-full rounded-xl transition-all
        ${active ? 'bg-zinc-900 font-bold' : 'hover:bg-zinc-900/50 text-zinc-400 hover:text-white'}
      `}
    >
      {icon}
      <span className="hidden md:block">{label}</span>
    </button>
  );
}

function StoryItem({ isUser, user, story }) {
  const nation = user?.nation || story?.nation;
  const borderColor = nation === 'andromeda' ? 'border-purple-600' : 'border-green-600';
  
  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer group flex-shrink-0">
      <div className={`w-16 h-16 rounded-full p-0.5 border-2 ${borderColor} transition-transform group-hover:scale-105`}>
        <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-900">
          <img 
            src={user?.photoURL || story?.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || story?.userId || 'nemesis'}`} 
            className="w-full h-full object-cover" 
            alt="story"
          />
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase truncate w-16 text-center text-zinc-500">
        {isUser ? 'Teu Story' : (story?.username || 'Membro')}
      </span>
    </div>
  );
}

function PostCard({ post, isAdmin }) {
  const nationColor = post?.nation === 'andromeda' ? 'text-purple-500' : 'text-green-500';

  const deletePost = async () => {
    if (confirm("Deseja apagar esta transmissão?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', post.id));
    }
  };

  return (
    <div className="bg-black border border-zinc-900 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full border ${post?.nation === 'andromeda' ? 'border-purple-500' : 'border-green-500'} overflow-hidden`}>
            <img src={post?.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post?.userId}`} className="w-full h-full object-cover" alt="Avatar" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm tracking-tight">{post?.username || 'Sistema'}</span>
              {post?.isOfficial && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500 text-white" />}
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${nationColor}`}>{post?.nation || 'Desconhecida'}</p>
          </div>
        </div>
        {isAdmin && <button onClick={deletePost} className="text-zinc-600 hover:text-red-500 transition"><MoreHorizontal /></button>}
      </div>

      {/* Media */}
      <div className="aspect-square bg-zinc-900 flex items-center justify-center relative group">
        {post?.mediaType === 'video' ? (
          <video src={post?.mediaUrl} controls className="w-full h-full object-contain" />
        ) : (
          <img src={post?.mediaUrl} className="w-full h-full object-cover" alt="Post" />
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6 cursor-pointer hover:text-red-500 transition" />
          <MessageCircle className="w-6 h-6 cursor-pointer hover:text-zinc-400 transition" />
          <Send className="w-6 h-6 cursor-pointer hover:text-blue-500 transition" />
          <div className="flex-1" />
          <Bookmark className="w-6 h-6 cursor-pointer hover:text-yellow-500 transition" />
        </div>
        <div className="text-sm">
          <span className="font-black mr-2 uppercase tracking-tighter text-zinc-100">{post?.username}</span>
          <span className="text-zinc-300">{post?.content}</span>
        </div>
        <p className="text-[10px] text-zinc-600 font-bold uppercase italic tracking-tighter">
          Há {Math.floor((Date.now() - (post?.createdAt || Date.now())) / 60000)} minutos
        </p>
      </div>
    </div>
  );
}

// --- LÓGICA DE UPLOAD GITHUB ---

async function uploadToGitHub(file, ghConfig, subPath = 'social') {
  if (!ghConfig?.token || !ghConfig?.owner || !ghConfig?.repo) {
    throw new Error("GitHub não configurado no painel administrativo.");
  }
  
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      const content = reader.result.split(',')[1];
      try {
        const response = await fetch(
          `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${ghConfig.path}/${subPath}/${fileName}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${ghConfig.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `Upload Social: ${fileName}`,
              content: content,
            }),
          }
        );
        if (!response.ok) throw new Error("Falha na API do GitHub");
        const data = await response.json();
        resolve(data.content.download_url);
      } catch (err) { reject(err); }
    };
    reader.readAsDataURL(file);
  });
}

// --- MODAIS E VIEWS ESPECÍFICAS ---

function PostModal({ userData, ghConfig, onClose }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [isOfficial, setIsOfficial] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!file || !content) return;
    setLoading(true);

    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const mediaUrl = await uploadToGitHub(file, ghConfig);

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), {
        userId: auth.currentUser.uid,
        username: userData?.username || 'Anónimo',
        userPhoto: userData?.photoURL || '',
        nation: userData?.nation || 'desconhecida',
        content,
        mediaUrl,
        mediaType,
        isOfficial: userData?.isAdmin ? isOfficial : false,
        createdAt: Date.now()
      });
      onClose();
    } catch (err) {
      alert("Erro ao publicar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition"><X size={20}/></button>
          <h3 className="font-bold uppercase tracking-widest text-sm italic">Sincronizar Transmissão</h3>
          <button onClick={handlePost} disabled={loading} className="text-blue-500 font-black uppercase text-sm hover:text-blue-400 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Disparar'}
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="aspect-video bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center relative group overflow-hidden">
            {file ? (
              <div className="w-full h-full relative">
                {file.type.startsWith('video/') ? (
                  <video src={URL.createObjectURL(file)} className="w-full h-full object-contain" />
                ) : (
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-contain" alt="Preview" />
                )}
                <button onClick={() => setFile(null)} className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full hover:bg-black transition text-white"><X size={16}/></button>
              </div>
            ) : (
              <div className="text-center">
                <Camera size={40} className="mx-auto text-zinc-700 mb-2" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Anexar Ficheiro</p>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files[0])} />
              </div>
            )}
          </div>
          <textarea 
            placeholder="Relatório da transmissão..." 
            className="w-full bg-transparent border border-zinc-900 rounded-xl p-4 focus:ring-0 focus:border-zinc-700 outline-none resize-none h-32 text-lg font-medium"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          {userData?.isAdmin && (
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl hover:bg-zinc-900 transition border border-zinc-900">
              <input type="checkbox" checked={isOfficial} onChange={e => setIsOfficial(e.target.checked)} className="rounded border-zinc-800 bg-zinc-900 text-blue-500 w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest text-blue-400 italic">Protocolo Oficial Nemesis</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileView({ userData, posts, ghConfig }) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(userData?.bio || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    let photoURL = userData?.photoURL || '';
    if (photoFile) {
      try {
        photoURL = await uploadToGitHub(photoFile, ghConfig, 'profiles');
      } catch (err) {
        alert("Erro ao carregar foto: " + err.message);
      }
    }

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', auth.currentUser.uid), {
        bio: bio,
        photoURL: photoURL
      });
      setIsEditing(false);
    } catch (err) {
      alert("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const nationColor = userData?.nation === 'andromeda' ? 'from-purple-500 to-purple-900' : 'from-green-500 to-green-900';
  const tagColor = userData?.nation === 'andromeda' ? 'text-purple-400' : 'text-green-400';

  return (
    <div className="max-w-3xl mx-auto py-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-center gap-12 mb-16">
        <div className={`p-1 rounded-full bg-gradient-to-tr ${nationColor} shadow-2xl`}>
          <div className="w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-black overflow-hidden relative group">
            <img src={userData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} className="w-full h-full object-cover" alt="Profile" />
            {isEditing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer transition-opacity">
                <Camera className="text-white" />
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setPhotoFile(e.target.files[0])} />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">@{userData?.username || 'membro'}</h2>
            <div className="flex gap-2 justify-center">
              {isEditing ? (
                <button onClick={saveProfile} disabled={saving} className="bg-blue-600 px-6 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition disabled:opacity-50">
                  {saving ? 'A guardar...' : 'Guardar'}
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="bg-zinc-800 px-6 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition">Editar Perfil</button>
              )}
              <button className="bg-zinc-800 p-2 rounded-lg hover:bg-zinc-700 transition"><Settings size={18}/></button>
            </div>
          </div>
          <div className="flex justify-center md:justify-start gap-8 font-black text-xs uppercase tracking-widest opacity-60">
            <span><strong>{posts.length}</strong> posts</span>
            <span><strong>1.2k</strong> seguidores</span>
            <span><strong>950</strong> seguindo</span>
          </div>
          <div className="text-sm">
            <p className={`font-black uppercase tracking-[0.2em] italic mb-2 ${tagColor}`}>
              Nação {userData?.nation || 'Desconhecida'}
            </p>
            {isEditing ? (
              <textarea 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                placeholder="Escreve o teu manifesto..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm font-medium focus:border-zinc-600 outline-none h-24" 
              />
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-zinc-300 font-medium italic">{userData?.bio || 'Sem biografia definida no sistema.'}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-900 pt-10">
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {posts.map(p => (
            <div key={p.id} className="aspect-square bg-zinc-950 overflow-hidden relative group cursor-pointer border border-zinc-900">
              <img src={p.mediaUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Grid post" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-6 font-black text-xs uppercase tracking-widest">
                <span className="flex items-center gap-1"><Heart className="w-4 h-4 fill-white" /> 84</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4 fill-white" /> 12</span>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="col-span-3 py-20 text-center text-zinc-700 font-black uppercase italic text-xs tracking-[0.5em]">
              Sem registos visuais.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ ghConfig }) {
  const [email, setEmail] = useState('');
  const [nation, setNation] = useState('andromeda');
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [localGh, setLocalGh] = useState(ghConfig);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'allowed_users'), (snap) => {
      setAllowedUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const authorizeUser = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'allowed_users'), {
        email: email.toLowerCase().trim(),
        nation,
        createdAt: Date.now()
      });
      setEmail('');
    } catch (err) { alert("Erro ao autorizar."); }
    finally { setIsProcessing(false); }
  };

  const saveGitHub = async () => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'github'), localGh);
      alert("Configurações do GitHub sincronizadas!");
    } catch (err) { alert("Erro ao salvar."); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 py-10 animate-in slide-in-from-bottom-8 duration-500">
      <header className="text-center">
        <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Painel de Comando</h2>
        <div className="h-1 w-20 bg-red-600 mx-auto rounded-full"></div>
      </header>

      <section className="bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800 shadow-xl">
        <h3 className="font-black text-xl mb-6 flex items-center gap-2 uppercase italic tracking-tighter"><ShieldCheck className="text-red-500" /> Triagem de Membros</h3>
        <form onSubmit={authorizeUser} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email do candidato" 
            className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold focus:border-red-900 outline-none"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <div className="flex gap-4">
            <select 
              className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black uppercase text-xs tracking-widest outline-none appearance-none cursor-pointer"
              value={nation}
              onChange={e => setNation(e.target.value)}
            >
              <option value="andromeda">Andrômeda (Roxo)</option>
              <option value="helix">Hélix (Verde)</option>
            </select>
            <button className="bg-white text-black px-8 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 transition active:scale-95">Autorizar</button>
          </div>
        </form>

        <div className="mt-10 space-y-2">
          <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 italic">Frequências Autorizadas</h4>
          <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
            {allowedUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-zinc-800 group hover:border-zinc-700 transition">
                <span className="text-sm font-bold opacity-80">{u.email}</span>
                <div className="flex items-center gap-4">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${u.nation === 'andromeda' ? 'text-purple-500' : 'text-green-500'}`}>{u.nation}</span>
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'allowed_users', u.id))} className="text-red-900 hover:text-red-500 transition"><X size={16}/></button>
                </div>
              </div>
            ))}
            {allowedUsers.length === 0 && <div className="text-center py-6 text-zinc-700 text-xs font-black uppercase italic tracking-widest">Nenhuma autorização pendente.</div>}
          </div>
        </div>
      </section>

      <section className="bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800 shadow-xl">
        <h3 className="font-black text-xl mb-6 flex items-center gap-2 uppercase italic tracking-tighter"><Settings className="text-zinc-500" /> Sincronização GitHub</h3>
        <div className="space-y-4">
          <input type="password" placeholder="GitHub Access Token" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-xs font-bold" value={localGh.token} onChange={e => setLocalGh({...localGh, token: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Owner" className="bg-black border border-zinc-800 p-4 rounded-xl text-xs font-bold" value={localGh.owner} onChange={e => setLocalGh({...localGh, owner: e.target.value})} />
            <input type="text" placeholder="Repo Name" className="bg-black border border-zinc-800 p-4 rounded-xl text-xs font-bold" value={localGh.repo} onChange={e => setLocalGh({...localGh, repo: e.target.value})} />
          </div>
          <button onClick={saveGitHub} className="w-full bg-blue-600 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 transition active:scale-95 shadow-lg">Atualizar Núcleo de Armazenamento</button>
        </div>
      </section>
    </div>
  );
}

// --- SISTEMA DE AUTENTICAÇÃO ---

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Validação de Pré-autorização Robusta
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'allowed_users'), 
          where('email', '==', email.toLowerCase().trim())
        );
        const querySnap = await getDocs(q);
        
        if (querySnap.empty) {
          setError("Acesso negado. Email não encontrado na lista de autorizações do sistema.");
          setLoading(false);
          return;
        }
        
        const allowedData = querySnap.docs[0].data();
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        
        await setDoc(doc(db, 'artifacts', appId, 'users', userCred.user.uid), {
          username: username.toLowerCase().replace(/\s/g, '').substring(0, 15),
          email: email.toLowerCase().trim(),
          nation: allowedData.nation,
          bio: '',
          photoURL: '',
          isAdmin: false,
          createdAt: Date.now()
        });
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError("Frequência ocupada: Este email já possui um registo.");
      else if (err.code === 'auth/weak-password') setError("Protocolo fraco: A palavra-passe deve ser mais complexa.");
      else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') setError("Credenciais inválidas.");
      else setError("Erro no sistema: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-900/10 blur-[150px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-green-900/10 blur-[150px] rounded-full animate-pulse"></div>

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="bg-zinc-950 border border-zinc-900 p-10 rounded-3xl shadow-2xl text-center">
          <h1 className="text-6xl font-black italic tracking-tighter bg-gradient-to-r from-purple-500 to-green-500 bg-clip-text text-transparent mb-10 select-none">
            Nemesis
          </h1>

          <form onSubmit={handleAuth} className="space-y-3">
            {!isLogin && (
              <input 
                type="text" 
                placeholder="ID de Utilizador" 
                className="w-full bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-sm font-bold focus:border-purple-900 outline-none transition-all placeholder:text-zinc-600"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            )}
            <input 
              type="email" 
              placeholder="Email" 
              className="w-full bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-sm font-bold focus:border-purple-900 outline-none transition-all placeholder:text-zinc-600"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Chave de Acesso" 
              className="w-full bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-sm font-bold focus:border-purple-900 outline-none transition-all placeholder:text-zinc-600"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button 
              disabled={loading}
              className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-zinc-200 transition active:scale-95 disabled:opacity-50 mt-4"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : isLogin ? 'Sincronizar' : 'Registar Protocolo'}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
              <p className="text-[10px] text-red-500 font-black uppercase tracking-widest leading-tight">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-zinc-950/50 border border-zinc-900/50 p-6 rounded-2xl text-center backdrop-blur-sm">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            {isLogin ? "Sem registo no sistema?" : "Já possuis uma frequência?"}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="ml-2 font-black text-white hover:text-purple-400 transition"
            >
              {isLogin ? 'Regista-te' : 'Entra'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ message = "Sincronizando Arca..." }) {
  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-green-600 rounded-3xl animate-pulse"></div>
        <Loader2 className="absolute inset-0 m-auto text-white animate-spin opacity-50" size={32} />
      </div>
      <p className="text-zinc-600 font-black uppercase tracking-[0.5em] animate-pulse text-[10px]">{message}</p>
    </div>
  );
}

function NotificationsView() {
  return (
    <div className="max-w-lg mx-auto py-10 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-8 border-l-4 border-yellow-500 pl-4">Radar de Atividade</h2>
      <div className="space-y-6">
        {[1,2,3,4,5].map(n => (
          <div key={n} className="flex items-center gap-4 group cursor-pointer hover:bg-zinc-900/30 p-3 rounded-2xl transition">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${n}`} alt="Notify" />
            </div>
            <p className="text-sm flex-1 font-medium text-zinc-300">
              <span className="font-black text-white uppercase tracking-tighter">Membro_{n}</span> sintonizou na tua transmissão. <span className="text-zinc-600 ml-1 text-xs">4h</span>
            </p>
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg group-hover:border-zinc-700 transition"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

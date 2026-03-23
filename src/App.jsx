import { useState, useEffect, useRef } from 'react';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
// NEW: Imported Real-time Listeners and Database operations
import { collection, addDoc, getDocs, query, deleteDoc, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const getTitle = (item) => item?.title || item?.name;
const getDate = (item) => item?.release_date || item?.first_air_date;
const getYear = (item) => getDate(item)?.substring(0, 4) || 'N/A';
const getRatingColor = (rating) => {
  if (rating >= 7.5) return '#22c55e';
  if (rating >= 6.0) return '#f97316';
  return '#ef4444';
};

// --- SVG ICONS ---
const Icons = {
  Home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Movies: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>,
  TV: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>,
  Anime: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  Parties: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Library: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
  Search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  FilterGenre: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  FilterLang: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
  FilterYear: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  FilterRating: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  FilterClear: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  FilterSort: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
};

const currentYear = 2026;
const YEARS = Array.from(new Array(40), (val, index) => currentYear - index);

export default function App() {
  const [trendingDay, setTrendingDay] = useState([]);
  const [trendingWeek, setTrendingWeek] = useState([]);
  const [newest, setNewest] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  const [activeItem, setActiveItem] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [mediaType, setMediaType] = useState('movie');
  const [currentTab, setCurrentTab] = useState('Home'); 
  
  const [browseItems, setBrowseItems] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);
  
  const [filterGenre, setFilterGenre] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterSort, setFilterSort] = useState('popularity.desc');

  // Firebase Auth, Library & Recommendations State
  const [user, setUser] = useState(null);
  const [myLibrary, setMyLibrary] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  
  // PARTY SYSTEM STATES
  const [partyCode, setPartyCode] = useState('');
  const [generatedPartyCode, setGeneratedPartyCode] = useState(null);
  const [currentPartyCode, setCurrentPartyCode] = useState(null);
  const [partyData, setPartyData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchLibrary(currentUser.uid);
      else setMyLibrary([]);
    });
    return () => unsubscribe();
  }, []);

  const fetchLibrary = async (uid) => {
    try {
      const q = query(collection(db, "users", uid, "library"));
      const querySnapshot = await getDocs(q);
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ ...doc.data(), docId: doc.id });
      });
      setMyLibrary(items);
    } catch (error) {
      console.error("Error fetching library:", error);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail(''); setAuthPassword('');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (error) {
      console.error("Google Sign In Error:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentTab('Home');
  };

  const toggleLibrary = async (targetItem) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!targetItem) return;

    const isSaved = myLibrary.some(item => item.id === targetItem.id);

    try {
      if (isSaved) {
        const itemToRemove = myLibrary.find(item => item.id === targetItem.id);
        await deleteDoc(doc(db, "users", user.uid, "library", itemToRemove.docId));
      } else {
        const itemData = {
          id: targetItem.id,
          title: getTitle(targetItem),
          poster_path: targetItem.poster_path,
          vote_average: targetItem.vote_average,
          release_date: targetItem.release_date || targetItem.first_air_date || '',
          media_type: targetItem.media_type || mediaType || 'movie'
        };
        await addDoc(collection(db, "users", user.uid, "library"), itemData);
      }
      fetchLibrary(user.uid);
    } catch (error) {
      console.error("Error updating library:", error);
    }
  };

  const checkInLibrary = (id) => myLibrary.some(item => item.id === id);

  // --- REAL-TIME WATCH PARTY LOGIC ---

  const hostParty = async () => {
    if (!user) return setShowAuthModal(true);
    if (!activeItem) return;
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await setDoc(doc(db, "parties", code), {
        hostId: user.uid,
        mediaId: activeItem.id,
        mediaType: mediaType,
        season: season,
        episode: episode,
        createdAt: serverTimestamp()
      });
      setGeneratedPartyCode(code);
    } catch (error) {
      console.error("Error creating party:", error);
    }
  };

  const joinParty = async () => {
    if (!user) return setShowAuthModal(true);
    if (!partyCode.trim()) return;

    try {
      const docRef = doc(db, "parties", partyCode);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Fetch the movie/show the party is watching
        const res = await fetch(`${BASE_URL}/${data.mediaType}/${data.mediaId}?api_key=${TMDB_API_KEY}`);
        const item = await res.json();
        
        setMediaType(data.mediaType);
        setActiveItem(item);
        setSeason(data.season || 1);
        setEpisode(data.episode || 1);
        setCurrentPartyCode(partyCode);
        setPartyCode(''); // clear input
      } else {
        alert("Invalid Party Code! The party may have ended.");
      }
    } catch (error) {
      console.error("Error joining party:", error);
    }
  };

  // Chat Auto-Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync Party Database listeners
  useEffect(() => {
    if (!currentPartyCode) return;

    // 1. Listen for Host playback changes
    const unsubParty = onSnapshot(doc(db, "parties", currentPartyCode), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPartyData(data);
        
        // If I am NOT the host, force my UI to sync with the database
        if (user && data.hostId !== user.uid) {
          if (data.season && data.season !== season) setSeason(data.season);
          if (data.episode && data.episode !== episode) setEpisode(data.episode);
        }
      }
    });

    // 2. Listen for Chat Messages
    const q = query(collection(db, "parties", currentPartyCode, "messages"), orderBy("createdAt", "asc"));
    const unsubChat = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => {
      unsubParty();
      unsubChat();
    };
  }, [currentPartyCode, user]);

  // If I AM the host, update the database when I change season/episode
  useEffect(() => {
    if (currentPartyCode && partyData && user && partyData.hostId === user.uid) {
       updateDoc(doc(db, "parties", currentPartyCode), {
          season: season,
          episode: episode
       }).catch(err => console.error(err));
    }
  }, [season, episode]);

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentPartyCode) return;
    
    try {
      await addDoc(collection(db, "parties", currentPartyCode, "messages"), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // --- END PARTY LOGIC ---

  const resetFilters = () => {
    setFilterGenre(''); setFilterLang(''); setFilterYear(''); setFilterRating(''); setFilterSort('popularity.desc');
  };

  const handleNavClick = (tabName, type) => {
    setCurrentTab(tabName);
    setActiveItem(null);
    setSearchQuery('');
    
    if (tabName === 'Search') {
      setIsSearchActive(true);
    } else {
      setIsSearchActive(false);
    }

    if (tabName === 'Anime') {
      setMediaType('tv');
      setFilterGenre('16'); 
      setFilterLang('ja');  
      setFilterSort('popularity.desc');
      setFilterYear('');
      setFilterRating('');
    } else if (type) {
      setMediaType(type);
      resetFilters();
    }

    if (tabName === 'Watch Later' && user) {
      fetchLibrary(user.uid);
    }
  };

  useEffect(() => {
    setSeason(1); setEpisode(1); setItemDetails(null); setIsOverviewExpanded(false); setRecommendations([]);
    if (activeItem) {
      fetch(`${BASE_URL}/${mediaType}/${activeItem.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`)
        .then(res => res.json()).then(data => setItemDetails(data));
      
      fetch(`${BASE_URL}/${mediaType}/${activeItem.id}/recommendations?api_key=${TMDB_API_KEY}`)
        .then(res => res.json()).then(data => setRecommendations(data.results || []));
    }
  }, [activeItem, mediaType]);

  useEffect(() => {
    fetch(`${BASE_URL}/genre/${mediaType}/list?api_key=${TMDB_API_KEY}`)
      .then(res => res.json())
      .then(data => setAvailableGenres(data.genres || []))
      .catch(err => console.error("Error fetching genres:", err));
  }, [mediaType]);

  useEffect(() => {
    if (currentTab === 'Home') {
      const fetchData = async () => {
        try {
          const [dayRes, weekRes, newRes] = await Promise.all([
            fetch(`${BASE_URL}/trending/${mediaType}/day?api_key=${TMDB_API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/trending/${mediaType}/week?api_key=${TMDB_API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/${mediaType}/${mediaType === 'movie' ? 'now_playing' : 'on_the_air'}?api_key=${TMDB_API_KEY}`).then(r => r.json())
          ]);
          setTrendingDay(dayRes.results || []);
          setTrendingWeek(weekRes.results || []);
          setNewest(newRes.results || []);
        } catch (err) { console.error("API Error:", err); }
      };
      fetchData();
    }
  }, [mediaType, currentTab]);

  useEffect(() => {
    if (currentTab === 'Movies' || currentTab === 'TV Shows' || currentTab === 'Anime') {
      let url = `${BASE_URL}/discover/${mediaType}?api_key=${TMDB_API_KEY}&sort_by=${filterSort}`;
      if (filterGenre) url += `&with_genres=${filterGenre}`;
      if (filterLang) url += `&with_original_language=${filterLang}`;
      if (filterRating) url += `&vote_average.gte=${filterRating}`;
      if (filterYear) {
        url += mediaType === 'movie' ? `&primary_release_year=${filterYear}` : `&first_air_date_year=${filterYear}`;
      }
      fetch(url)
        .then(res => res.json())
        .then(data => setBrowseItems(data.results || []))
        .catch(err => console.error("API Error:", err));
    }
  }, [currentTab, mediaType, filterGenre, filterLang, filterYear, filterRating, filterSort]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      fetch(`${BASE_URL}/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json()).then(data => setSearchResults(data.results || []));
    } else { setSearchResults([]); }
  }, [searchQuery, mediaType]);

  const heroItem = trendingDay[heroIndex];
  const nextHero = () => setHeroIndex((prev) => (prev + 1) % Math.min(trendingDay.length, 5));
  const prevHero = () => setHeroIndex((prev) => (prev === 0 ? Math.min(trendingDay.length, 5) - 1 : prev - 1));

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [itemDetails, setItemDetails] = useState(null);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [heroLogo, setHeroLogo] = useState(null);

  useEffect(() => {
    if (heroItem && currentTab === 'Home') {
      setHeroLogo(null);
      fetch(`${BASE_URL}/${mediaType}/${heroItem.id}/images?api_key=${TMDB_API_KEY}`)
        .then(res => res.json())
        .then(data => {
          if (data.logos && data.logos.length > 0) {
            const enLogo = data.logos.find(logo => logo.iso_639_1 === 'en');
            const targetLogo = enLogo || data.logos[0];
            setHeroLogo(`https://image.tmdb.org/t/p/w500${targetLogo.file_path}`);
          }
        })
        .catch(err => console.error("Error fetching logo:", err));
    }
  }, [heroItem, mediaType, currentTab]);

  const availableSeasons = itemDetails?.seasons?.filter(s => s.season_number > 0) || [];
  const selectedSeasonData = availableSeasons.find(s => s.season_number === season);
  const episodeCount = selectedSeasonData?.episode_count || 1;

  const renderPlaceholder = (title) => (
    <div style={{ height: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#64748b' }}>
      {Icons[title]}
      <h2 style={{ marginTop: '20px', color: '#fff' }}>{title}</h2>
      <p>This feature is coming soon to SOKOFLIX.</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#060913', color: '#fff', minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif', paddingBottom: '100px', overflowX: 'hidden' }}>
      
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100vw; margin: 0; padding: 0; background-color: #060913; }

        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .movie-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .movie-card:hover { transform: scale(1.05); z-index: 10; box-shadow: 0 10px 20px rgba(0,0,0,0.8); }
        
        select { appearance: none; background-image: url('data:image/svg+xml;utf8,<svg fill="%2394a3b8" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>'); background-repeat: no-repeat; background-position-x: calc(100% - 10px); background-position-y: center; }

        .header-nav { display: flex; align-items: center; justify-content: space-between; padding: 15px 40px; background-color: #0b101e; border-bottom: 1px solid #1e293b; position: sticky; top: 0; z-index: 100; }
        .nav-links { display: flex; gap: 30px; align-items: center; }
        .nav-item { display: flex; align-items: center; gap: 8px; color: #94a3b8; font-weight: bold; cursor: pointer; transition: color 0.2s; position: relative; padding: 10px 0; }
        .nav-item:hover { color: #fff; }
        .nav-item.active { color: #fff; }
        .nav-item.active::after { content: ''; position: absolute; bottom: -16px; left: 0; width: 100%; height: 3px; background-color: #fff; border-radius: 2px; }
        
        .header-left { display: flex; align-items: center; gap: 40px; }
        .header-right { display: flex; align-items: center; gap: 20px; }
        
        .search-btn { display: flex; align-items: center; justify-content: center; width: 45px; height: 45px; background-color: #1e293b; border-radius: 12px; cursor: pointer; color: #fff; transition: background 0.2s; }
        .search-btn:hover { background-color: #334155; }
        
        .auth-btn { display: flex; align-items: center; gap: 8px; background-color: #dc2626; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s; font-size: 0.9rem; }
        .auth-btn:hover { background-color: #b91c1c; }
        
        .user-avatar { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #2563eb; cursor: pointer; object-fit: cover; transition: border-color 0.2s; background-color: #1e293b; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-weight: bold; font-size: 1.2rem; }
        .user-avatar:hover { border-color: #60a5fa; }

        .mobile-bottom-nav { display: none; }
        .footer { background-color: #03050a; padding: 60px 40px 40px; border-top: 1px solid #1e293b; margin-top: 60px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 40px; }
        .footer-col { display: flex; flex-direction: column; gap: 15px; }
        .footer-heading { font-size: 1.1rem; font-weight: bold; color: #fff; margin-bottom: 5px; }
        .footer-link { color: #94a3b8; text-decoration: none; font-size: 0.95rem; cursor: pointer; transition: color 0.2s; }
        .footer-link:hover { color: #fff; }

        .hero-logo-img { max-width: 400px; max-height: 140px; object-fit: contain; margin-bottom: 20px; display: block; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.8)); object-position: left bottom; }

        .browse-filter-bar { display: flex; gap: 15px; flex-wrap: wrap; background-color: #0b101e; padding: 15px; border-radius: 12px; border: 1px solid #1e293b; margin-bottom: 30px; align-items: center; }
        .filter-wrapper { position: relative; display: inline-flex; align-items: center; }
        .filter-icon { position: absolute; left: 12px; pointer-events: none; display: flex; color: #94a3b8; }
        .browse-filter-select { background-color: #1e293b; color: #cbd5e1; border: 1px solid #334155; border-radius: 8px; padding: 10px 35px 10px 38px; font-size: 0.95rem; font-weight: bold; cursor: pointer; outline: none; transition: border-color 0.2s; width: 100%; }
        .browse-filter-select:hover { border-color: #64748b; }
        
        .clear-filters-btn { display: flex; align-items: center; gap: 8px; background: none; border: 1px solid #dc2626; color: #ef4444; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 0.9rem; transition: background 0.2s; }
        .clear-filters-btn:hover { background-color: rgba(220, 38, 38, 0.1); }

        .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
        
        .static-page { max-width: 800px; margin: 0 auto; padding: 60px 20px; color: #cbd5e1; line-height: 1.8; }
        .static-page h1 { color: #fff; font-size: 2.5rem; margin-bottom: 20px; }
        .static-page h2 { color: #fff; margin-top: 30px; margin-bottom: 10px; }
        .static-page p { margin-bottom: 20px; }

        .player-wrapper { display: flex; gap: 30px; align-items: flex-start; }
        
        /* FIX: Dedicated class to strictly control iframe sizing and overflow */
        .iframe-container { position: relative; width: 100%; padding-top: 56.25%; background-color: #000; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }

        @media (max-width: 900px) {
          .nav-links { display: none; }
          .header-nav { padding: 15px 20px; justify-content: space-between; }
          .header-left { gap: 15px; }
          .search-bar-container { width: 100%; padding: 0 20px; margin-top: 10px; }
          
          .media-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          
          .mobile-bottom-nav { 
            display: flex; justify-content: space-between; align-items: center; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: calc(100% - 30px); max-width: 450px; background-color: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); padding: 4px; border-radius: 40px; z-index: 1000; box-shadow: 0 20px 40px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.05); box-sizing: border-box; 
          }
          .mob-nav-item { 
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #64748b; font-size: 0.7rem; font-weight: 700; cursor: pointer; position: relative; padding: 10px 0; border-radius: 36px; transition: all 0.3s ease; flex: 1; -webkit-tap-highlight-color: transparent; 
          }
          .mob-nav-item.active { color: #93c5fd; background-color: #1e3a8a; }
          .mob-nav-item svg { width: 20px; height: 20px; transition: transform 0.2s ease; }
          .mob-nav-item.active svg { transform: translateY(1px); }
          .mob-nav-item span { transition: transform 0.2s ease; }
          .mob-nav-item.active span { transform: translateY(1px); display: inline-block; }
          
          .carousel-container { height: 85vh !important; min-height: 600px; align-items: flex-end !important; padding-bottom: 40px !important; }
          .hero-content { padding: 0 20px 30px 20px !important; text-align: left !important; width: 100%; box-sizing: border-box; }
          .carousel-btn-left { left: 15px !important; top: 35% !important; transform: translateY(-50%); }
          .carousel-btn-right { right: 15px !important; top: 35% !important; transform: translateY(-50%); }
          .hero-logo-img { max-width: 180px !important; max-height: 70px !important; margin-bottom: 12px !important; }
          .hero-title { font-size: 1.8rem !important; margin-bottom: 12px !important; }
          .hero-desc { font-size: 0.95rem !important; margin-bottom: 20px !important; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; color: #cbd5e1 !important; }
          .rating-container { margin-bottom: 12px !important; }
          .hero-buttons { flex-direction: row !important; gap: 15px !important; }
          .watch-now-btn { flex-grow: 1 !important; }
          .watchlist-btn { width: 48px !important; height: 48px !important; padding: 0 !important; background-color: #1e293b !important; border-radius: 8px !important; display: flex !important; justify-content: center !important; align-items: center !important;}
          .watchlist-text { display: none !important; }
          
          .player-meta { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          .player-meta img { width: 120px !important; }
          .mobile-hide { display: none !important; }

          /* FIX: Stripped excess mobile padding so iframe can stretch side-to-side cleanly */
          .player-container { padding: 15px 15px !important; margin-top: 10px; }
          .iframe-container { border-radius: 8px; }
          .section-padding { padding: 0 20px !important; margin-top: 60px !important; position: relative; z-index: 10; }
          
          .browse-container { padding: 40px 15px 120px 15px !important; } 
          .footer { flex-direction: column; padding: 40px 20px; }

          .browse-filter-bar { gap: 10px; }
          .filter-wrapper { flex: 1 1 auto; width: 100%; }
          .filter-wrapper.sort-filter { margin-left: 0 !important; }
          .clear-filters-btn { width: 100%; justify-content: center; }

          .player-wrapper { flex-direction: column; gap: 20px; }
          .chat-sidebar { width: 100% !important; height: 450px; margin-bottom: 20px; }
        }
      `}</style>

      {/* --- FLOATING AUTH MODAL --- */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '40px', borderRadius: '16px', width: '90%', maxWidth: '400px', position: 'relative', border: '1px solid #1e293b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <button onClick={() => setShowAuthModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            <h2 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            
            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="email" placeholder="Email Address" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '1rem', outline: 'none' }} />
              <input type="password" placeholder="Password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '1rem', outline: 'none' }} />
              <button type="submit" style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>{isSignUp ? 'Sign Up' : 'Sign In'}</button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0', color: '#64748b', fontSize: '0.9rem' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
              <span>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
            </div>

            <button onClick={handleGoogleAuth} style={{ width: '100%', backgroundColor: '#fff', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <p style={{ textAlign: 'center', marginTop: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"} 
              <span onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#60a5fa', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* --- PARTY CODE MODAL --- */}
      {generatedPartyCode && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '40px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', border: '1px solid #8b5cf6', boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)' }}>
            <h2 style={{ margin: '0 0 10px 0' }}>Party Created!</h2>
            <p style={{ color: '#cbd5e1', marginBottom: '20px' }}>Share this code with your friends to watch together.</p>
            <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', fontSize: '2rem', fontWeight: '900', letterSpacing: '4px', color: '#8b5cf6', marginBottom: '20px' }}>
              {generatedPartyCode}
            </div>
            <button onClick={() => { setCurrentPartyCode(generatedPartyCode); setGeneratedPartyCode(null); }} style={{ backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Close & Watch</button>
          </div>
        </div>
      )}

      {/* --- DESKTOP HEADER --- */}
      <header className="header-nav">
        
        <div className="header-left">
          <div onClick={() => handleNavClick('Home', 'movie')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', letterSpacing: '1px', color: '#fff', lineHeight: 1 }}>
              SOKO<span style={{color: '#ef4444'}}>FLIX</span>
            </h1>
            <div style={{ fontSize: '0.8rem', color: '#2563eb', marginTop: '2px', fontWeight: 'bold', alignSelf: 'flex-start' }}>
              by soko ecom
            </div>
          </div>

          <div className="nav-links">
            <div className={`nav-item ${currentTab === 'Home' ? 'active' : ''}`} onClick={() => handleNavClick('Home', 'movie')}>{Icons.Home} Home</div>
            <div className={`nav-item ${currentTab === 'Movies' ? 'active' : ''}`} onClick={() => handleNavClick('Movies', 'movie')}>{Icons.Movies} Movies</div>
            <div className={`nav-item ${currentTab === 'TV Shows' ? 'active' : ''}`} onClick={() => handleNavClick('TV Shows', 'tv')}>{Icons.TV} TV Shows</div>
            <div className={`nav-item ${currentTab === 'Anime' ? 'active' : ''}`} onClick={() => handleNavClick('Anime')}>{Icons.Anime} Anime</div>
            <div className={`nav-item ${currentTab === 'Watch Later' ? 'active' : ''}`} onClick={() => handleNavClick('Watch Later')}>{Icons.Library} Watch Later</div>
            <div className={`nav-item ${currentTab === 'Parties' ? 'active' : ''}`} onClick={() => handleNavClick('Parties')}>{Icons.Parties} Parties</div>
          </div>
        </div>

        <div className="header-right">
          <div className="search-btn" onClick={() => { setIsSearchActive(!isSearchActive); setCurrentTab('Search'); }}>
            {Icons.Search}
          </div>
          
          {user ? (
            user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="user-avatar" onClick={() => setCurrentTab('Account')} title="My Account" />
            ) : (
              <div className="user-avatar" onClick={() => setCurrentTab('Account')} title="My Account">
                {user.email.charAt(0).toUpperCase()}
              </div>
            )
          ) : (
            <button className="auth-btn" onClick={() => setShowAuthModal(true)}>
              Sign In
            </button>
          )}
        </div>

      </header>

      {/* SEARCH BAR REVEAL */}
      {(isSearchActive || currentTab === 'Search') && (
        <div className="search-bar-container" style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <input 
            type="text" 
            placeholder={`Search ${mediaType === 'movie' ? 'movies' : 'TV shows'}...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '15px 25px', borderRadius: '30px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', width: '100%', maxWidth: '600px', fontSize: '1.1rem', outline: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
            autoFocus
          />
        </div>
      )}

      {/* --- DYNAMIC MAIN CONTENT --- */}
      {currentTab === 'Parties' ? (
         <div className="browse-container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', minHeight: '60vh', textAlign: 'center' }}>
           <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: '900' }}>Watch Parties</h2>
           <p style={{ color: '#cbd5e1', marginBottom: '40px', fontSize: '1.1rem' }}>Watch movies and shows in sync with your friends. Chat in real-time while you stream.</p>
 
           <div style={{ backgroundColor: '#1e293b', padding: '40px 20px', borderRadius: '12px', marginBottom: '30px' }}>
             <h3 style={{ margin: '0 0 10px 0' }}>Join a Party</h3>
             <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>Enter the 6-digit code shared by your friend.</p>
             <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
               <input type="text" placeholder="Enter Code" value={partyCode} onChange={e => setPartyCode(e.target.value.toUpperCase())} maxLength={6} style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', outline: 'none', textTransform: 'uppercase', width: '150px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }} />
               <button className="auth-btn" style={{ backgroundColor: '#8b5cf6' }} onClick={joinParty}>Join</button>
             </div>
           </div>
 
           <div style={{ backgroundColor: '#1e293b', padding: '40px 20px', borderRadius: '12px' }}>
             <h3 style={{ margin: '0 0 10px 0' }}>Host a Party</h3>
             <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>To start a party, search for a movie and click the "Host Party" button on its page.</p>
             <button className="auth-btn" style={{ margin: '0 auto', backgroundColor: '#3b82f6' }} onClick={() => handleNavClick('Home', 'movie')}>Browse to Host</button>
           </div>
         </div>
       ) :
       
       currentTab === 'Account' ? (
         <div className="static-page" style={{ textAlign: 'center' }}>
           {user ? (
             <>
               {user.photoURL ? (
                 <img src={user.photoURL} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #ef4444', marginBottom: '20px', objectFit: 'cover' }} />
               ) : (
                 <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #ef4444', marginBottom: '20px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '3rem', margin: '0 auto 20px auto', fontWeight: 'bold' }}>
                   {user.email.charAt(0).toUpperCase()}
                 </div>
               )}
               <h1>Welcome back</h1>
               <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{user.email}</p>
               
               <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', margin: '40px 0', textAlign: 'left' }}>
                 <h3>Account Settings</h3>
                 <p>Notifications, playback preferences, and UI settings will be available here soon.</p>
               </div>

               <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '12px 30px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                 Sign Out
               </button>
             </>
           ) : (
             <>
               <h1>Account</h1>
               <p>Please sign in to view your account details.</p>
             </>
           )}
         </div>
       ) :

       currentTab === 'About' ? (
         <div className="static-page">
           <h1>About Us</h1>
           <p>Welcome to SOKOFLIX, your ultimate destination for free, high-quality streaming.</p>
           <p>Built proudly in South Africa, SOKOFLIX is a flagship project by the Soko Ecom team. We believe that discovering and enjoying premium entertainment—from the newest cinematic releases to your favorite timeless anime—should be a seamless, beautiful, and accessible experience for everyone.</p>
           <p>We are constantly evolving our platform to bring you the best interface, the fastest streams, and the most comprehensive library possible. Grab some popcorn, add some titles to your Watch Later list, and enjoy the show.</p>
         </div>
       ) :
       currentTab === 'Contact' ? (
         <div className="static-page">
           <h1>Contact Us</h1>
           <p>Have a question, a movie request, or found a bug? We'd love to hear from you.</p>
           <p>Email us at: <strong>support@sokoecom.com</strong></p>
           <div style={{ marginTop: '40px', padding: '30px', backgroundColor: '#1e293b', borderRadius: '12px' }}>
             <h3 style={{ margin: '0 0 15px 0' }}>Join the Community</h3>
             <p style={{ margin: 0 }}>Follow Soko Ecom on our social channels for updates, new feature drops, and behind-the-scenes looks at how SOKOFLIX is built.</p>
           </div>
         </div>
       ) :
       currentTab === 'Privacy' ? (
         <div className="static-page">
           <h1>Privacy Policy</h1>
           <p>Last updated: 2026</p>
           <h2>1. Information We Collect</h2>
           <p>When you sign up, we collect your basic profile information (email address and profile picture) to create your account and manage your Watch Later library. We do not sell or share this data with third parties.</p>
           <h2>2. Cookies and Tracking</h2>
           <p>SOKOFLIX uses local storage and basic cookies to keep you logged in and to save your UI preferences.</p>
           <h2>3. Third-Party Links</h2>
           <p>We aggregate video content from third-party servers. We do not host any media files on our own servers. Please be aware that third-party video players may use their own tracking or advertisements.</p>
         </div>
       ) :
       currentTab === 'Terms' ? (
         <div className="static-page">
           <h1>Terms of Service</h1>
           <p>By accessing SOKOFLIX, you agree to be bound by these Terms of Service.</p>
           <h2>Content Disclaimer</h2>
           <p>SOKOFLIX acts as a search engine and aggregator. All movie and TV show data is provided by the TMDB API. Video content is embedded from third-party sources. SOKOFLIX does not host, upload, or control any of the video files streamed on this platform.</p>
           <h2>User Accounts</h2>
           <p>You are responsible for maintaining the security of your account. SOKOFLIX reserves the right to terminate accounts that violate our community guidelines.</p>
         </div>
       ) :

       currentTab === 'Watch Later' ? (
         <div className="browse-container" style={{ padding: '40px 60px', maxWidth: '1600px', margin: '0 auto', minHeight: '60vh' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '30px', fontWeight: '900' }}>Watch Later</h2>
          {!user ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#1e293b', borderRadius: '12px' }}>
              <h3>Please Sign In</h3>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>You need to connect your account to save your favorite movies and shows.</p>
              <button className="auth-btn" style={{ margin: '0 auto' }} onClick={() => setShowAuthModal(true)}>Sign In</button>
            </div>
          ) : myLibrary.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              {Icons.Library}
              <h3 style={{ marginTop: '20px' }}>Your list is empty</h3>
              <p>Add movies and shows by clicking the save icon on their page.</p>
            </div>
          ) : (
            <>
              {myLibrary.filter(item => item.media_type === 'movie').length > 0 && (
                <div style={{ marginBottom: '50px' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>Saved Movies</h3>
                  <div className="media-grid">
                    {myLibrary.filter(item => item.media_type === 'movie').map(item => (
                      <MovieCard key={item.id} item={item} onClick={() => { setMediaType('movie'); setActiveItem(item); }} mediaType="movie" isGrid />
                    ))}
                  </div>
                </div>
              )}
              
              {myLibrary.filter(item => item.media_type === 'tv').length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>Saved Series & Anime</h3>
                  <div className="media-grid">
                    {myLibrary.filter(item => item.media_type === 'tv').map(item => (
                      <MovieCard key={item.id} item={item} onClick={() => { setMediaType('tv'); setActiveItem(item); }} mediaType="tv" isGrid />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
         </div>
       ) :
       
       activeItem ? (
        
        /* --- PLAYER VIEW (WITH SPLIT PARTY WRAPPER) --- */
        <div className="player-container" style={{ paddingTop: '40px', width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '40px 40px 40px 40px' }}>
          <button onClick={() => { setActiveItem(null); setCurrentPartyCode(null); }} style={{ padding: '10px 20px', marginBottom: '20px', cursor: 'pointer', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>← Back</button>
          
          <div className="player-wrapper">
            
            {/* LEFT COLUMN: THE MOVIE & META */}
            <div style={{ flex: 1, minWidth: 0 }}>
              
              <div className="iframe-container">
                <iframe src={mediaType === 'movie' ? `https://vidsrc.net/embed/movie/${activeItem.id}` : `https://vidsrc.net/embed/tv?tmdb=${activeItem.id}&season=${season}&episode=${episode}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen></iframe>
              </div>

              {mediaType === 'tv' && itemDetails && (
                <div style={{ display: 'flex', gap: '20px', padding: '20px', backgroundColor: '#1e293b', borderRadius: '12px', marginTop: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#94a3b8' }}>Season</span>
                    <select value={season} onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); }} style={{ padding: '10px 35px 10px 15px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', fontSize: '1.1rem', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                      {availableSeasons.map(s => <option key={s.id} value={s.season_number}>Season {s.season_number}</option>)}
                    </select>
                  </div>
                  <div style={{ width: '2px', backgroundColor: '#334155' }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#94a3b8' }}>Episode</span>
                    <select value={episode} onChange={(e) => setEpisode(Number(e.target.value))} style={{ padding: '10px 35px 10px 15px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', fontSize: '1.1rem', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                      {[...Array(episodeCount)].map((_, i) => <option key={i + 1} value={i + 1}>Episode {i + 1}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="player-meta" style={{ marginTop: '40px', display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                <img src={`https://image.tmdb.org/t/p/w300${activeItem.poster_path}`} alt="poster" style={{ borderRadius: '8px', width: '220px', border: '1px solid #1e293b', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }} />
                <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 style={{ fontSize: '2.5rem', margin: '0 0 8px 0', fontWeight: 'bold' }}>{getTitle(activeItem)}</h2>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      
                      {currentPartyCode ? (
                        <button onClick={() => setCurrentPartyCode(null)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                          <span className="mobile-hide" style={{ fontWeight: 'bold' }}>Leave Party</span>
                        </button>
                      ) : (
                        <button onClick={hostParty} style={{ backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}>
                          {Icons.Parties}
                          <span className="mobile-hide" style={{ fontWeight: 'bold' }}>Host Party</span>
                        </button>
                      )}

                      <button onClick={() => toggleLibrary(activeItem)} style={{ backgroundColor: checkInLibrary(activeItem.id) ? '#22c55e' : '#1e293b', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}>
                        {checkInLibrary(activeItem.id) ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        )}
                        <span className="mobile-hide" style={{ fontWeight: 'bold' }}>{checkInLibrary(activeItem.id) ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '1rem', marginBottom: '10px', marginTop: '10px' }}>
                    <span>{getYear(activeItem)}</span>
                    {itemDetails?.runtime > 0 && <><span>•</span><span>{Math.floor(itemDetails.runtime / 60)}h {itemDetails.runtime % 60}m</span></>}
                    {itemDetails?.episode_run_time?.[0] > 0 && <><span>•</span><span>{itemDetails.episode_run_time[0]}m</span></>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', marginBottom: '15px' }}>
                    <span style={{ color: '#eab308' }}>★</span>
                    <span style={{ fontWeight: 'bold' }}>{(activeItem.vote_average || 0).toFixed(1)}</span>
                    <span style={{ color: '#64748b' }}>({itemDetails?.vote_count || activeItem.vote_count})</span>
                  </div>

                  {itemDetails?.genres && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '25px' }}>
                      {itemDetails.genres.map(g => <span key={g.id} style={{ backgroundColor: '#1e293b', color: '#cbd5e1', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem' }}>{g.name}</span>)}
                    </div>
                  )}

                  <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 'bold' }}>Overview</h3>
                  <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: '1.6', maxWidth: '800px', margin: 0 }}>
                    {isOverviewExpanded || activeItem.overview.length < 120 ? activeItem.overview : `${activeItem.overview.substring(0, 120)}...`}
                  </p>
                  {activeItem.overview.length >= 120 && (
                    <button onClick={() => setIsOverviewExpanded(!isOverviewExpanded)} style={{ background: 'none', border: 'none', color: '#3b82f6', padding: 0, marginTop: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
                      {isOverviewExpanded ? 'Show Less' : 'Read More'}
                    </button>
                  )}

                  {/* CAST UI */}
                  {itemDetails?.credits?.cast && itemDetails.credits.cast.length > 0 && (
                    <div style={{ marginTop: '30px' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', fontWeight: 'bold' }}>Top Cast</h3>
                      <div className="hide-scroll" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', width: '100%' }}>
                        {itemDetails.credits.cast.slice(0, 8).map(actor => (
                          <div key={actor.id} style={{ minWidth: '90px', width: '90px', textAlign: 'center', flexShrink: 0 }}>
                            {actor.profile_path ? (
                              <img 
                                src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} 
                                alt={actor.name} 
                                style={{ width: '75px', height: '75px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155', margin: '0 auto 8px auto', display: 'block', flexShrink: 0 }} 
                              />
                            ) : (
                              <div style={{ width: '75px', height: '75px', borderRadius: '50%', backgroundColor: '#1e293b', border: '2px solid #334155', margin: '0 auto 8px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                              </div>
                            )}
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#cbd5e1', lineHeight: '1.2', marginBottom: '4px' }}>{actor.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.2' }}>{actor.character}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RECOMMENDATIONS UI */}
                  {recommendations && recommendations.length > 0 && (
                    <div style={{ marginTop: '50px' }}>
                      <MovieRow title="More Like This" items={recommendations} onClickItem={setActiveItem} mediaType={mediaType} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: REAL-TIME CHAT UI */}
            {currentPartyCode && (
              <div className="chat-sidebar" style={{ width: '350px', backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                
                {/* Chat Header */}
                <div style={{ padding: '15px 20px', backgroundColor: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e' }}></div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Live Chat</h3>
                  </div>
                  <span style={{ backgroundColor: '#8b5cf6', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>{currentPartyCode}</span>
                </div>
                
                {/* Messages Area */}
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '400px' }}>
                  
                  <div style={{ alignSelf: 'center', backgroundColor: '#1e293b', padding: '6px 16px', borderRadius: '20px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>
                    Room Created
                  </div>
                  
                  {messages.map(msg => {
                    const isMe = msg.userId === user?.uid;
                    return (
                      <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', margin: isMe ? '0 5px 0 0' : '0 0 0 5px' }}>{isMe ? 'You' : msg.userName}</span>
                        <div style={{ backgroundColor: isMe ? '#2563eb' : '#1e293b', color: isMe ? '#fff' : '#e2e8f0', padding: '10px 15px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: '0.95rem', maxWidth: '85%', lineHeight: '1.4', wordBreak: 'break-word' }}>
                          {msg.text}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Form */}
                <form onSubmit={sendChatMessage} style={{ padding: '15px', borderTop: '1px solid #1e293b', display: 'flex', gap: '10px', backgroundColor: '#0b101e' }}>
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: '12px 15px', borderRadius: '20px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', outline: 'none', fontSize: '0.95rem' }} />
                  <button type="submit" style={{ backgroundColor: '#8b5cf6', color: '#fff', border: 'none', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </form>

              </div>
            )}
          </div>
        </div>

      ) : currentTab === 'Movies' || currentTab === 'TV Shows' || currentTab === 'Anime' ? (
        
        /* --- DEDICATED BROWSE VIEW (Movies, TV, and Anime) --- */
        <div className="browse-container" style={{ padding: '40px 60px', maxWidth: '1600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: '900' }}>Browse {currentTab}</h2>
          
          <div className="browse-filter-bar">
            
            <div className="filter-wrapper">
              <span className="filter-icon">{Icons.FilterGenre}</span>
              <select className="browse-filter-select" value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
                <option value="">All Genres</option>
                {availableGenres.map(genre => (
                  <option key={genre.id} value={genre.id}>{genre.name}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-wrapper">
              <span className="filter-icon">{Icons.FilterLang}</span>
              <select className="browse-filter-select" value={filterLang} onChange={e => setFilterLang(e.target.value)}>
                <option value="">All Languages</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
              </select>
            </div>
            
            <div className="filter-wrapper">
              <span className="filter-icon">{Icons.FilterYear}</span>
              <select className="browse-filter-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-wrapper">
              <span className="filter-icon">{Icons.FilterRating}</span>
              <select className="browse-filter-select" value={filterRating} onChange={e => setFilterRating(e.target.value)}>
                <option value="">Any Rating</option>
                <option value="9">9.0+ Stars</option>
                <option value="8">8.0+ Stars</option>
                <option value="7">7.0+ Stars</option>
                <option value="6">6.0+ Stars</option>
                <option value="5">5.0+ Stars</option>
              </select>
            </div>

            {(filterGenre || filterLang || filterYear || filterRating || filterSort !== 'popularity.desc') && (
              <button className="clear-filters-btn" onClick={resetFilters}>
                {Icons.FilterClear} Clear
              </button>
            )}
            
            <div className="filter-wrapper sort-filter" style={{ marginLeft: 'auto' }}>
              <span className="filter-icon">{Icons.FilterSort}</span>
              <select className="browse-filter-select" value={filterSort} onChange={e => setFilterSort(e.target.value)}>
                <option value="popularity.desc">Popularity (High to Low)</option>
                <option value="popularity.asc">Popularity (Low to High)</option>
                <option value="vote_average.desc">Top Rated</option>
                <option value="primary_release_date.desc">Newest Releases</option>
              </select>
            </div>

          </div>

          <div className="media-grid">
            {browseItems.length > 0 ? browseItems.filter(i => i.poster_path).map(item => (
              <MovieCard key={item.id} item={item} onClick={() => setActiveItem(item)} mediaType={mediaType} isGrid />
            )) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <h3>No results found matching your filters.</h3>
              </div>
            )}
          </div>
        </div>

      ) : (
        /* --- HOME CATALOG VIEW --- */
        <div>
          {searchQuery.length > 2 ? (
            <div className="section-padding" style={{ padding: '40px' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '30px' }}>Search Results</h2>
              <div className="media-grid">
                {searchResults.map(item => <MovieCard key={item.id} item={item} onClick={() => setActiveItem(item)} mediaType={mediaType} isGrid />)}
              </div>
            </div>
          ) : (
            <>
              {heroItem && (
                <div className="carousel-container" style={{ position: 'relative', height: '85vh', width: '100%', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `url(https://image.tmdb.org/t/p/original${heroItem.backdrop_path})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 1 }}></div>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(90deg, #060913 0%, rgba(6,9,19,0.8) 40%, transparent 100%)', zIndex: 2 }}></div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%', background: 'linear-gradient(0deg, #060913 0%, transparent 100%)', zIndex: 2 }}></div>

                  <button className="carousel-btn-left" onClick={prevHero} style={{ position: 'absolute', left: '40px', zIndex: 4, width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#000', color: '#fff', border: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>❮</button>
                  <button className="carousel-btn-right" onClick={nextHero} style={{ position: 'absolute', right: '40px', zIndex: 4, width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#000', color: '#fff', border: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>❯</button>

                  <div className="hero-content" style={{ position: 'relative', zIndex: 3, padding: '0 80px', maxWidth: '800px' }}>
                    
                    {heroLogo ? (
                      <img className="hero-logo-img" src={heroLogo} alt={getTitle(heroItem)} />
                    ) : (
                      <h2 className="hero-title" style={{ fontFamily: 'Impact, sans-serif', fontSize: '4.5rem', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 10px 0', textShadow: '0 4px 8px rgba(0,0,0,0.8)' }}>
                        {getTitle(heroItem)}
                      </h2>
                    )}

                    <div className="rating-container" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', fontWeight: 'bold' }}>
                      <span style={{ backgroundColor: '#eab308', color: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>{Math.round(heroItem.vote_average * 10) / 10} ★</span>
                      <span style={{ fontSize: '1.1rem', color: '#cbd5e1' }}>{getYear(heroItem)}</span>
                    </div>
                    <p className="hero-desc" style={{ fontSize: '1.1rem', color: '#e2e8f0', lineHeight: '1.5', marginBottom: '30px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{heroItem.overview}</p>
                    <div className="hero-buttons" style={{ display: 'flex', gap: '15px' }}>
                      <button className="watch-now-btn" onClick={() => setActiveItem(heroItem)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '12px 30px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>Watch Now</button>
                      
                      <button className="watchlist-btn" onClick={() => toggleLibrary(heroItem)} style={{ backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '12px 25px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {checkInLibrary(heroItem?.id) ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        )}
                        <span className="watchlist-text">Watchlist</span>
                      </button>

                    </div>
                  </div>
                </div>
              )}

              <div className="section-padding">
                <MovieRow title="Trending Today" items={trendingDay} onClickItem={setActiveItem} mediaType={mediaType} isLive />
                <MovieRow title="Trending This Week" items={trendingWeek} onClickItem={setActiveItem} mediaType={mediaType} />
                <MovieRow title={mediaType === 'movie' ? "Newest in Theaters" : "On The Air"} items={newest} onClickItem={setActiveItem} mediaType={mediaType} />
              </div>
            </>
          )}
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="footer">
        <div className="footer-col" style={{ maxWidth: '400px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', letterSpacing: '0.5px', color: '#fff' }}>SOKO<span style={{color: '#ef4444'}}>FLIX</span></h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6' }}>Your ultimate destination for discovering movies and TV shows. Stream, explore, and enjoy endless entertainment.</p>
        </div>
        
        <div className="footer-col">
          <span className="footer-heading">Browse</span>
          <span className="footer-link" onClick={() => handleNavClick('Movies', 'movie')}>Movies</span>
          <span className="footer-link" onClick={() => handleNavClick('TV Shows', 'tv')}>TV Shows</span>
          <span className="footer-link" onClick={() => handleNavClick('Anime')}>Anime</span>
          <span className="footer-link" onClick={() => handleNavClick('Watch Later')}>Watch Later</span>
        </div>

        <div className="footer-col">
          <span className="footer-heading">Information</span>
          <span className="footer-link" onClick={() => handleNavClick('Privacy')}>Privacy Policy</span>
          <span className="footer-link" onClick={() => handleNavClick('Terms')}>Terms of Service</span>
          <span className="footer-link" onClick={() => handleNavClick('Contact')}>Contact Us</span>
          <span className="footer-link" onClick={() => handleNavClick('About')}>About SOKOFLIX</span>
        </div>
      </footer>

      {/* --- REWIRED MOBILE BOTTOM NAV --- */}
      <nav className="mobile-bottom-nav">
        <div className={`mob-nav-item ${currentTab === 'Home' ? 'active' : ''}`} onClick={() => handleNavClick('Home', 'movie')}>
          {Icons.Home} <span>Home</span>
        </div>
        <div className={`mob-nav-item ${currentTab === 'Movies' ? 'active' : ''}`} onClick={() => handleNavClick('Movies', 'movie')}>
          {Icons.Movies} <span>Movies</span>
        </div>
        <div className={`mob-nav-item ${currentTab === 'TV Shows' ? 'active' : ''}`} onClick={() => handleNavClick('TV Shows', 'tv')}>
          {Icons.TV} <span>TV</span>
        </div>
        <div className={`mob-nav-item ${currentTab === 'Anime' ? 'active' : ''}`} onClick={() => handleNavClick('Anime')}>
          {Icons.Anime} <span>Anime</span>
        </div>
        <div className={`mob-nav-item ${currentTab === 'Watch Later' ? 'active' : ''}`} onClick={() => handleNavClick('Watch Later')}>
          {Icons.Library} <span>Later</span>
        </div>
        <div className={`mob-nav-item ${currentTab === 'Parties' ? 'active' : ''}`} onClick={() => handleNavClick('Parties')}>
          {Icons.Parties} <span>Parties</span>
        </div>
      </nav>

    </div>
  );
}

// --- REUSABLE COMPONENTS ---
function MovieRow({ title, items, onClickItem, mediaType, isLive }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{title}</h3>
        {isLive && <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ef4444' }}>Live</span>}
      </div>
      <div className="hide-scroll" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px' }}>
        {items.filter(i => i.poster_path).map(item => (
          <MovieCard key={item.id} item={item} onClick={() => onClickItem(item)} mediaType={mediaType} />
        ))}
      </div>
    </div>
  );
}

function MovieCard({ item, onClick, mediaType, isGrid }) {
  const ratingScore = Math.round(item.vote_average * 10);
  return (
    <div className="movie-card" onClick={onClick} style={{ minWidth: isGrid ? '0' : '160px', width: isGrid ? '100%' : '160px', position: 'relative', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#1e293b' }}>
      <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={getTitle(item)} style={{ width: '100%', height: isGrid ? 'auto' : '240px', aspectRatio: isGrid ? '2/3' : 'auto', objectFit: 'cover', display: 'block' }} />
      <div className="mobile-hide" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%', background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, transparent 100%)' }}></div>
      <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#3b82f6', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '900' }}>✦ NEW</div>
      <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: getRatingColor(item.vote_average), color: '#fff', padding: '3px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '900' }}>★ {ratingScore}%</div>
      <div className="mobile-hide" style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 'bold' }}>
          <span>{getYear(item)}</span>
          <span style={{ textTransform: 'capitalize' }}>{mediaType}</span>
        </div>
      </div>
    </div>
  );
}
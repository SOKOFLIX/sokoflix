import { useState, useEffect } from 'react';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, query, deleteDoc, doc } from 'firebase/firestore';

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

  // Firebase Auth & Library State
  const [user, setUser] = useState(null);
  const [myLibrary, setMyLibrary] = useState([]);
  const [isInLibrary, setIsInLibrary] = useState(false);

  // Monitor User Login Status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchLibrary(currentUser.uid);
      else setMyLibrary([]);
    });
    return () => unsubscribe();
  }, []);

  // Fetch user's saved movies from Firestore
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

  // Check if active item is already in library
  useEffect(() => {
    if (activeItem && user) {
      const found = myLibrary.find(item => item.id === activeItem.id);
      setIsInLibrary(!!found);
    } else {
      setIsInLibrary(false);
    }
  }, [activeItem, myLibrary, user]);

  const handleAuth = async () => {
    if (user) {
      await signOut(auth);
    } else {
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Google Sign In Error:", error);
      }
    }
  };

  const toggleLibrary = async () => {
    if (!user) {
      alert("Please sign in with Google to save to your library!");
      return;
    }
    try {
      if (isInLibrary) {
        const itemToRemove = myLibrary.find(item => item.id === activeItem.id);
        await deleteDoc(doc(db, "users", user.uid, "library", itemToRemove.docId));
      } else {
        const itemData = {
          id: activeItem.id,
          title: getTitle(activeItem),
          poster_path: activeItem.poster_path,
          vote_average: activeItem.vote_average,
          release_date: activeItem.release_date || activeItem.first_air_date || '',
          media_type: mediaType
        };
        await addDoc(collection(db, "users", user.uid, "library"), itemData);
      }
      fetchLibrary(user.uid);
    } catch (error) {
      console.error("Error updating library:", error);
    }
  };

  const resetFilters = () => {
    setFilterGenre(''); setFilterLang(''); setFilterYear(''); setFilterRating(''); setFilterSort('popularity.desc');
  };

  const handleNavClick = (tabName, type) => {
    setCurrentTab(tabName);
    setActiveItem(null);
    setSearchQuery('');
    if (type) {
      setMediaType(type);
      resetFilters();
    }
    if (tabName === 'Search') setIsSearchActive(true);
    else setIsSearchActive(false);

    if (tabName === 'My Library' && user) {
      fetchLibrary(user.uid);
    }
  };

  useEffect(() => {
    setSeason(1); setEpisode(1); setItemDetails(null); setIsOverviewExpanded(false);
    if (activeItem) {
      fetch(`${BASE_URL}/${mediaType}/${activeItem.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`)
        .then(res => res.json()).then(data => setItemDetails(data));
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
    if (currentTab === 'Movies' || currentTab === 'TV Shows') {
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
        
        .header-left { display: flex; align-items: center; gap: 30px; }
        .search-btn { display: flex; align-items: center; justify-content: center; width: 45px; height: 45px; background-color: #1e293b; border-radius: 12px; cursor: pointer; color: #fff; }
        
        .auth-btn { display: flex; align-items: center; gap: 8px; background-color: #dc2626; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s; font-size: 0.9rem; }
        .auth-btn:hover { background-color: #b91c1c; }
        .user-avatar { width: 38px; height: 38px; border-radius: 50%; border: 2px solid #ef4444; cursor: pointer; object-fit: cover; }

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

        @media (max-width: 900px) {
          .nav-links { display: none; }
          .header-left { gap: 15px; }
          .header-nav { padding: 15px 20px; }
          .search-bar-container { width: 100%; padding: 0 20px; margin-top: 10px; }
          
          .media-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          
          .mobile-bottom-nav { 
            display: flex; justify-content: space-between; align-items: center; position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); width: calc(100% - 40px); max-width: 450px; background-color: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); padding: 8px 6px; border-radius: 40px; z-index: 1000; box-shadow: 0 20px 40px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.05); box-sizing: border-box; 
          }
          .mob-nav-item { 
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: #64748b; font-size: 0.75rem; font-weight: 700; cursor: pointer; position: relative; padding: 12px 0 10px 0; border-radius: 30px; transition: all 0.3s ease; flex: 1; -webkit-tap-highlight-color: transparent; 
          }
          .mob-nav-item.active { color: #93c5fd; background-color: #1e3a8a; }
          .mob-nav-item.active::before { content: ''; position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; background-color: #93c5fd; border-radius: 50%; }
          .mob-nav-item svg { width: 22px; height: 22px; transition: transform 0.2s ease; }
          .mob-nav-item.active svg { transform: translateY(2px); }
          .mob-nav-item span { transition: transform 0.2s ease; }
          .mob-nav-item.active span { transform: translateY(2px); display: inline-block; }
          
          .carousel-container { height: 75vh !important; align-items: flex-end !important; }
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

          .player-container { padding: 20px 20px !important; }
          .section-padding { padding: 0 20px !important; margin-top: 20px !important; }
          
          .browse-container { padding: 40px 15px 120px 15px !important; } 
          .footer { flex-direction: column; padding: 40px 20px; }

          .browse-filter-bar { gap: 10px; }
          .filter-wrapper { flex: 1 1 auto; width: 100%; }
          .filter-wrapper.sort-filter { margin-left: 0 !important; }
          .clear-filters-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      {/* --- DESKTOP HEADER --- */}
      <header className="header-nav">
        <div className="header-left">
          <div className="search-btn" onClick={() => { setIsSearchActive(!isSearchActive); setCurrentTab('Search'); }}>
            {Icons.Search}
          </div>
          
          {user ? (
            <img src={user.photoURL} alt="Profile" className="user-avatar" onClick={handleAuth} title="Sign Out" />
          ) : (
            <button className="auth-btn" onClick={handleAuth}>
              Sign In
            </button>
          )}
        </div>

        <div onClick={() => handleNavClick('Home', 'movie')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', letterSpacing: '1px', color: '#fff', lineHeight: 1 }}>
            SOKO<span style={{color: '#ef4444'}}>FLIX</span>
          </h1>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px', fontWeight: 'bold' }}>
            by <span style={{ color: '#60a5fa' }}>soko ecom</span>
          </div>
        </div>

        <div className="nav-links">
          <div className={`nav-item ${currentTab === 'Home' ? 'active' : ''}`} onClick={() => handleNavClick('Home', 'movie')}>{Icons.Home} Home</div>
          <div className={`nav-item ${currentTab === 'Movies' ? 'active' : ''}`} onClick={() => handleNavClick('Movies', 'movie')}>{Icons.Movies} Movies</div>
          <div className={`nav-item ${currentTab === 'TV Shows' ? 'active' : ''}`} onClick={() => handleNavClick('TV Shows', 'tv')}>{Icons.TV} TV Shows</div>
          <div className={`nav-item ${currentTab === 'Anime' ? 'active' : ''}`} onClick={() => handleNavClick('Anime')}>{Icons.Anime} Anime</div>
          <div className={`nav-item ${currentTab === 'Parties' ? 'active' : ''}`} onClick={() => handleNavClick('Parties')}>{Icons.Parties} Parties</div>
          <div className={`nav-item ${currentTab === 'My Library' ? 'active' : ''}`} onClick={() => handleNavClick('My Library')}>{Icons.Library} My Library</div>
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
      {currentTab === 'Anime' ? renderPlaceholder('Anime') :
       currentTab === 'Parties' ? renderPlaceholder('Watch Parties') :
       
       currentTab === 'My Library' ? (
         <div className="browse-container" style={{ padding: '40px 60px', maxWidth: '1600px', margin: '0 auto', minHeight: '60vh' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '30px', fontWeight: '900' }}>My Library</h2>
          {!user ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#1e293b', borderRadius: '12px' }}>
              <h3>Please Sign In</h3>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>You need to connect your Google account to save your favorite movies and shows.</p>
              <button className="auth-btn" style={{ margin: '0 auto' }} onClick={handleAuth}>Sign In with Google</button>
            </div>
          ) : myLibrary.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              {Icons.Library}
              <h3 style={{ marginTop: '20px' }}>Your library is empty</h3>
              <p>Add movies and shows by clicking the save icon on their page.</p>
            </div>
          ) : (
            <div className="media-grid">
              {myLibrary.map(item => (
                <MovieCard key={item.id} item={item} onClick={() => { setMediaType(item.media_type || 'movie'); setActiveItem(item); }} mediaType={item.media_type || 'movie'} isGrid />
              ))}
            </div>
          )}
         </div>
       ) :
       
       activeItem ? (
        
        /* --- PLAYER VIEW --- */
        <div className="player-container" style={{ paddingTop: '40px', width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '40px 40px 40px 40px' }}>
          <button onClick={() => setActiveItem(null)} style={{ padding: '10px 20px', marginBottom: '20px', cursor: 'pointer', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>← Back</button>
          
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
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
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 style={{ fontSize: '2.5rem', margin: '0 0 8px 0', fontWeight: 'bold' }}>{getTitle(activeItem)}</h2>
                
                <button onClick={toggleLibrary} style={{ backgroundColor: isInLibrary ? '#22c55e' : '#1e293b', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}>
                  {isInLibrary ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  )}
                  <span className="mobile-hide" style={{ fontWeight: 'bold' }}>{isInLibrary ? 'Saved' : 'Save'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '1rem', marginBottom: '10px' }}>
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

              {/* CAST UI - FIXED WITH FLEX-SHRINK: 0 */}
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

            </div>
          </div>
        </div>

      ) : currentTab === 'Movies' || currentTab === 'TV Shows' ? (
        
        /* --- DEDICATED BROWSE VIEW --- */
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
                    </div>
                  </div>
                </div>
              )}

              <div className="section-padding" style={{ padding: '0 40px', marginTop: '-40px', position: 'relative', zIndex: 10 }}>
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
          <span className="footer-link" onClick={() => handleNavClick('My Library')}>My Library</span>
          <span className="footer-link" onClick={() => handleNavClick('Search')}>Search</span>
        </div>

        <div className="footer-col">
          <span className="footer-heading">Information</span>
          <span className="footer-link">Privacy Policy</span>
          <span className="footer-link">Terms of Service</span>
          <span className="footer-link">Contact Us</span>
          <span className="footer-link">About</span>
        </div>
      </footer>

      {/* --- MOBILE BOTTOM NAV --- */}
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
        <div className={`mob-nav-item ${currentTab === 'My Library' ? 'active' : ''}`} onClick={() => handleNavClick('My Library')}>
          {Icons.Library} <span>Library</span>
        </div>
        <div className={`mob-nav-item ${currentTab === 'Search' ? 'active' : ''}`} onClick={() => handleNavClick('Search')}>
          {Icons.Search} <span>Search</span>
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
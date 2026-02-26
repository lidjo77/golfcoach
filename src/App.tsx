import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Camera, Activity, History, ChevronRight, AlertCircle, CheckCircle2, Loader2, Target, Gauge, Wind, MoveUpRight, RotateCcw, BarChart3, LayoutDashboard, Settings2, ScanLine, MessageSquare, Send, Volume2, VolumeX, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeShotImage, ShotData, askCoach } from './services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

type AppStatus = 'idle' | 'initializing' | 'waiting' | 'analyzing' | 'detected' | 'error';
type Tab = 'analysis' | 'trends';

interface Message {
  role: 'user' | 'coach';
  text: string;
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [status, setStatus] = useState<AppStatus>('initializing');
  const [activeTab, setActiveTab] = useState<Tab>('analysis');
  const [lastShot, setLastShot] = useState<ShotData | null>(null);
  const [history, setHistory] = useState<ShotData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAutoCaptureEnabled, setIsAutoCaptureEnabled] = useState(false);
  const [showCalibration, setShowCalibration] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  
  // Security
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const REQUIRED_PIN = "1234"; // Standard PIN, can be changed
  
  // Sessions & Clubs
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [currentClub, setCurrentClub] = useState('Driver');
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice & Audio State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((frequency: number, duration: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  // Voice Feedback Function
  const speak = useCallback((text: string) => {
    if (!isVoiceEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'sv-SE';
    window.speechSynthesis.speak(utterance);
  }, [isVoiceEnabled]);

  // Inactivity Timeout (15 minutes)
  useEffect(() => {
    if (!isAutoCaptureEnabled) return;

    const timeout = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      if (inactiveTime > 15 * 60 * 1000) { // 15 minutes
        setIsAutoCaptureEnabled(false);
        speak("Monitoring avstängd på grund av inaktivitet.");
      }
    }, 60000); // Check every minute

    return () => clearInterval(timeout);
  }, [isAutoCaptureEnabled, lastActivity, speak]);

  // Update activity on interaction
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    return () => {
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, []);

  // Initialize Camera
  useEffect(() => {
    async function checkApiKey() {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    }
    checkApiKey();

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('waiting');
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Could not access camera. Please ensure permissions are granted.");
        setStatus('error');
      }
    }
    setupCamera();
  }, []);

  // Fetch Sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    } catch (err) {
      console.error("Sessions fetch error:", err);
    }
  }, [currentSessionId]);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    if (!currentSessionId) return;
    try {
      const res = await fetch(`/api/shots?session_id=${currentSessionId}`);
      const data = await res.json();
      setHistory(data);
      if (data.length > 0 && !lastShot) {
        setLastShot(data[0]);
      }
    } catch (err) {
      console.error("History fetch error:", err);
    }
  }, [currentSessionId, lastShot]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCreateSession = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSessionName })
      });
      const data = await res.json();
      setCurrentSessionId(data.id);
      setNewSessionName('');
      setIsNewSessionModalOpen(false);
      fetchSessions();
    } catch (err) {
      console.error("Create session error:", err);
    }
  };

  // Smart Change Detection Logic
  const checkImageDifference = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !prevCanvasRef.current) return false;
    
    const video = videoRef.current;
    const currentCanvas = canvasRef.current;
    const prevCanvas = prevCanvasRef.current;
    
    const ctx = currentCanvas.getContext('2d', { willReadFrequently: true });
    const prevCtx = prevCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || !prevCtx) return false;

    const compareWidth = 160;
    const compareHeight = 90;
    
    if (prevCanvas.width !== compareWidth) {
      prevCanvas.width = compareWidth;
      prevCanvas.height = compareHeight;
    }

    ctx.drawImage(video, 0, 0, compareWidth, compareHeight);
    const currentData = ctx.getImageData(0, 0, compareWidth, compareHeight).data;
    const prevData = prevCtx.getImageData(0, 0, compareWidth, compareHeight).data;

    let diff = 0;
    for (let i = 0; i < currentData.length; i += 4) {
      const currentBrightness = currentData[i] + currentData[i+1] + currentData[i+2];
      const prevBrightness = prevData[i] + prevData[i+1] + prevData[i+2];
      diff += Math.abs(currentBrightness - prevBrightness);
    }

    prevCtx.drawImage(currentCanvas, 0, 0);

    const threshold = compareWidth * compareHeight * 15; 
    return diff > threshold;
  }, []);

  const handleSelectApiKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setIsQuotaExceeded(false);
    }
  };

  // Capture and Analyze
  const captureAndAnalyze = useCallback(async (force = false) => {
    if (!videoRef.current || !canvasRef.current || status === 'analyzing') return;

    if (!force && !checkImageDifference()) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    
    setStatus('analyzing');
    playSound(880, 0.1); // Detection sound

    try {
      const result = await analyzeShotImage(base64Image, currentClub);

      if (result && result.shot_detected) {
        setLastShot(result);
        setStatus('detected');
        playSound(1320, 0.2); // Success sound
        
        if (isVoiceEnabled) {
          const voiceText = `Snyggt slag med ${currentClub}! Bärvidd ${result.carry_distance} meter. ${result.improvement}`;
          speak(voiceText);
        }

        await fetch('/api/shots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...result, session_id: currentSessionId, club: currentClub })
        });
        fetchHistory();

        setTimeout(() => setStatus('waiting'), 3000);
      } else {
        setStatus('waiting');
      }
    } catch (err: any) {
      console.error("Analysis error:", err);
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        setIsQuotaExceeded(true);
        setIsAutoCaptureEnabled(false);
        speak("Dina gratis-krediter är slut. Vänligen anslut din egen API-nyckel.");
      }
      setStatus('waiting');
    }
  }, [status, fetchHistory, checkImageDifference, isVoiceEnabled, speak, currentSessionId, currentClub, playSound]);

  // Auto-capture interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoCaptureEnabled && status === 'waiting') {
      interval = setInterval(() => {
        captureAndAnalyze();
      }, 5000); 
    }
    return () => clearInterval(interval);
  }, [isAutoCaptureEnabled, status, captureAndAnalyze]);

  // Chat Logic
  const handleSendMessage = async () => {
    if (!input.trim() || isAsking) return;
    
    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsAsking(true);

    try {
      const coachResponse = await askCoach(input, history.slice(0, 5), currentClub);
      setMessages(prev => [...prev, { role: 'coach', text: coachResponse }]);
    } catch (err: any) {
      console.error("Coach error:", err);
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        setIsQuotaExceeded(true);
        setMessages(prev => [...prev, { role: 'coach', text: "Dina gratis-krediter är slut. Vänligen anslut din egen betalda API-nyckel för att fortsätta chatta." }]);
      } else {
        setMessages(prev => [...prev, { role: 'coach', text: "Ledsen, jag fick ett tekniskt fel. Försök igen om en stund." }]);
      }
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chartData = useMemo(() => {
    return [...history].reverse().map((shot, index) => ({
      name: `Shot ${index + 1}`,
      ballSpeed: shot.ball_speed,
      carry: shot.carry_distance,
      rating: shot.rating
    }));
  }, [history]);

  const MetricCard = ({ icon: Icon, label, value, unit, color }: any) => (
    <div className="glass rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
        <Icon size={12} className={color} />
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-white">{value ?? '--'}</span>
        <span className="text-zinc-500 text-[10px]">{unit}</span>
      </div>
    </div>
  );

  const clubs = ['Driver', '3-Wood', '5-Wood', 'Hybrid', '4-Iron', '5-Iron', '6-Iron', '7-Iron', '8-Iron', '9-Iron', 'PW', 'GW', 'SW', 'LW'];

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === REQUIRED_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 rounded-3xl w-full max-w-sm flex flex-col gap-6 border border-white/5"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Target size={32} className="text-emerald-500" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-black uppercase tracking-tighter text-white">AI Golf Vision</h1>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">Ange din PIN-kod</p>
            </div>
          </div>

          <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              maxLength={4}
              className={`bg-zinc-900 border ${pinError ? 'border-red-500' : 'border-white/10'} rounded-2xl px-4 py-4 text-center text-2xl tracking-[1em] text-white focus:outline-none focus:border-emerald-500 transition-all`}
              autoFocus
            />
            {pinError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">Felaktig kod, försök igen</p>}
            <button
              type="submit"
              className="bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/20"
            >
              Lås upp
            </button>
          </form>
          
          <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest">
            Skyddad prototyp v1.4
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-950 overflow-hidden">
      {/* Left Column: Camera Preview */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden border-r border-white/5">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover opacity-80"
        />
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={prevCanvasRef} className="hidden" />
        
        {/* LIVE Indicator */}
        <AnimatePresence>
          {isAutoCaptureEnabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-24 left-6 z-10 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full border border-red-400 shadow-lg shadow-red-900/20"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-tighter">LIVE MONITORING</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calibration Guide */}
        <AnimatePresence>
          {showCalibration && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              <div className="w-[80%] h-[60%] border-2 border-dashed border-emerald-500/40 rounded-3xl relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/30">
                  Align Simulator Screen Here
                </div>
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-right-4 border-emerald-500 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-right-4 border-emerald-500 rounded-br-xl" />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine size={48} className="text-emerald-500/20" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay UI */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <div className="glass rounded-full px-4 py-2 flex items-center gap-2 pointer-events-auto">
                <div className={`w-2 h-2 rounded-full ${status === 'waiting' ? 'bg-emerald-500 status-pulse' : status === 'analyzing' ? 'bg-amber-500' : 'bg-zinc-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {status === 'initializing' && 'Initializing...'}
                  {status === 'waiting' && 'Monitoring...'}
                  {status === 'analyzing' && 'Analyzing...'}
                  {status === 'detected' && 'Shot Detected!'}
                  {status === 'error' && 'Error'}
                </span>
              </div>
              <div className="glass rounded-full px-3 py-1 text-[9px] font-mono text-zinc-400 uppercase tracking-widest pointer-events-auto">
                Change Detection Active
              </div>
            </div>
            
            <div className="flex gap-2 pointer-events-auto">
              {!hasApiKey && (
                <button 
                  onClick={handleSelectApiKey}
                  className="bg-amber-500 text-black rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-colors shadow-lg"
                >
                  Anslut Betald API
                </button>
              )}
              <select 
                value={currentClub}
                onChange={(e) => setCurrentClub(e.target.value)}
                className="glass rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white focus:outline-none appearance-none cursor-pointer"
              >
                {clubs.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
              </select>
              <button 
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`glass rounded-full p-2 transition-colors ${isVoiceEnabled ? 'text-emerald-400' : 'text-zinc-400'}`}
                title="Toggle Voice Feedback"
              >
                {isVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button 
                onClick={() => setShowCalibration(!showCalibration)}
                className={`glass rounded-full p-2 transition-colors ${showCalibration ? 'text-emerald-400' : 'text-zinc-400'}`}
                title="Toggle Guide"
              >
                <Settings2 size={18} />
              </button>
              <button 
                onClick={() => setIsAutoCaptureEnabled(!isAutoCaptureEnabled)}
                className={`rounded-full px-6 py-2 flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                  isAutoCaptureEnabled 
                    ? 'bg-red-600 text-white border border-red-400 hover:bg-red-700' 
                    : 'bg-emerald-600 text-white border border-emerald-400 hover:bg-emerald-700'
                }`}
              >
                <Activity size={16} className={isAutoCaptureEnabled ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {isAutoCaptureEnabled ? 'STOP MONITORING' : 'START MONITORING'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              Vision Engine v1.4 // Pro
            </div>
            <div className="flex gap-4 pointer-events-auto">
              <button 
                onClick={() => setIsChatOpen(true)}
                className="glass rounded-full p-4 hover:bg-white/10 transition-all active:scale-95"
              >
                <MessageSquare size={24} className="text-white" />
              </button>
              <button 
                onClick={() => captureAndAnalyze(true)}
                disabled={status === 'analyzing'}
                className="glass rounded-full p-4 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
              >
                <Target size={24} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8 text-center">
            <div className="max-w-md flex flex-col items-center gap-4">
              <AlertCircle size={48} className="text-red-500" />
              <h2 className="text-xl font-bold">Camera Access Required</h2>
              <p className="text-zinc-400">{error}</p>
              <button onClick={() => window.location.reload()} className="glass px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white/10">
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {isQuotaExceeded && (
          <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-8 text-center">
            <div className="max-w-md flex flex-col items-center gap-6 glass p-8 rounded-3xl border border-amber-500/30">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} className="text-amber-500" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Gratis-krediter slut</h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Du har förbrukat dina gratis-krediter för Gemini API. För att fortsätta använda appen behöver du ansluta din egen betalda API-nyckel.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={handleSelectApiKey}
                  className="w-full bg-amber-500 text-black font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-amber-400 transition-all active:scale-95 shadow-xl shadow-amber-500/20"
                >
                  Anslut Betald API-nyckel
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-zinc-500 uppercase tracking-widest hover:text-zinc-300 underline underline-offset-4"
                >
                  Läs mer om fakturering
                </a>
                <button 
                  onClick={() => setIsQuotaExceeded(false)}
                  className="text-[10px] text-zinc-600 uppercase tracking-widest hover:text-zinc-400 mt-2"
                >
                  Stäng (Fortsätt utan AI)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Analysis & Trends */}
      <div className="w-full lg:w-[480px] flex flex-col bg-zinc-900/50 overflow-y-auto relative">
        {/* Session Selector */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <select 
            value={currentSessionId || ''}
            onChange={(e) => setCurrentSessionId(Number(e.target.value))}
            className="flex-1 bg-transparent text-xs font-bold uppercase tracking-widest text-zinc-400 focus:outline-none"
          >
            {sessions.map(s => <option key={s.id} value={s.id} className="bg-zinc-900">{s.name}</option>)}
          </select>
          <button 
            onClick={() => setIsNewSessionModalOpen(true)}
            className="glass rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400"
          >
            Ny Session
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 p-2">
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === 'analysis' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <LayoutDashboard size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Analysis</span>
          </button>
          <button 
            onClick={() => setActiveTab('trends')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === 'trends' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <BarChart3 size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Trends</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {activeTab === 'analysis' ? (
              <motion.div
                key="analysis-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-6"
              >
                {lastShot ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <MetricCard icon={Gauge} label="Club" value={lastShot.club_speed} unit="mph" color="text-blue-400" />
                      <MetricCard icon={Activity} label="Ball" value={lastShot.ball_speed} unit="mph" color="text-emerald-400" />
                      <MetricCard icon={Target} label="Smash" value={lastShot.smash_factor} unit="" color="text-amber-400" />
                      <MetricCard icon={MoveUpRight} label="Launch" value={lastShot.launch_angle} unit="°" color="text-purple-400" />
                      <MetricCard icon={RotateCcw} label="Spin" value={lastShot.spin_rate} unit="rpm" color="text-rose-400" />
                      <MetricCard icon={Wind} label="Carry" value={lastShot.carry_distance} unit="yds" color="text-cyan-400" />
                    </div>

                    <div className="glass rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Rating</span>
                          <span className="text-3xl font-black text-emerald-400">{lastShot.rating}<span className="text-sm text-zinc-600">/10</span></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">AI Insights</span>
                      </div>
                      <div className="flex flex-col gap-4">
                        <div>
                          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Analysis</h3>
                          <p className="text-zinc-200 text-sm leading-relaxed">{lastShot.analysis}</p>
                        </div>
                        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                          <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Pro Suggestion</h3>
                          <p className="text-emerald-100 text-sm leading-relaxed">{lastShot.improvement}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500 text-sm">Waiting for first shot data...</p>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recent Shots</h3>
                  <div className="flex flex-col gap-2">
                    {history.slice(0, 5).map((shot: any) => (
                      <div key={shot.id} onClick={() => setLastShot(shot)} className="glass rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors font-bold">
                            {shot.rating}
                          </div>
                          <div>
                            <div className="text-sm font-bold">{shot.carry_distance} yds Carry ({shot.club})</div>
                            <div className="text-[10px] text-zinc-500 font-mono uppercase">{new Date(shot.timestamp).toLocaleTimeString()}</div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="trends-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="glass rounded-3xl p-6 flex flex-col gap-6">
                  <div>
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Ball Speed Trend (mph)</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="name" hide />
                          <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            itemStyle={{ color: '#10b981' }}
                          />
                          <Area type="monotone" dataKey="ballSpeed" stroke="#10b981" fillOpacity={1} fill="url(#colorSpeed)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Carry Distance Trend (yds)</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="name" hide />
                          <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            itemStyle={{ color: '#06b6d4' }}
                          />
                          <Line type="monotone" dataKey="carry" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4, fill: '#06b6d4' }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass rounded-2xl p-4 text-center">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Avg Rating</div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {(history.reduce((acc, s) => acc + s.rating, 0) / (history.length || 1)).toFixed(1)}
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-4 text-center">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Shots</div>
                    <div className="text-2xl font-bold text-white">{history.length}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Overlay */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute inset-0 z-50 bg-zinc-950 flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={20} className="text-emerald-400" />
                  <h2 className="text-sm font-bold uppercase tracking-widest">Fråga Coachen</h2>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {messages.length === 0 && (
                  <div className="text-center py-10 text-zinc-500">
                    <p className="text-sm">Ställ en fråga om dina senaste slag!</p>
                    <p className="text-[10px] uppercase tracking-widest mt-2">T.ex. "Varför slicear jag?"</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 p-3 rounded-2xl">
                      <Loader2 size={16} className="animate-spin text-zinc-500" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Skriv din fråga..."
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isAsking || !input.trim()}
                  className="bg-emerald-500 text-white p-2 rounded-xl disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Session Modal */}
        <AnimatePresence>
          {isNewSessionModalOpen && (
            <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center p-6">
              <div className="glass rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
                <h2 className="text-lg font-bold uppercase tracking-widest text-white">Ny Session</h2>
                <input 
                  type="text" 
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Sessionsnamn (t.ex. Driver-pass)"
                  className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsNewSessionModalOpen(false)}
                    className="flex-1 glass rounded-xl py-2 text-xs font-bold uppercase tracking-widest text-zinc-500"
                  >
                    Avbryt
                  </button>
                  <button 
                    onClick={handleCreateSession}
                    className="flex-1 bg-emerald-500 rounded-xl py-2 text-xs font-bold uppercase tracking-widest text-white"
                  >
                    Starta
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AICoach } from './components/AICoach';
import { generateWorkoutPlan } from './services/geminiService';

// --- Data & Types ---

type ExerciseDef = {
    id: string;
    name: string;
    muscle: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    type: 'strength' | 'cardio';
    goals: string[]; // Strength, Hypertrophy, etc.
};

const EXERCISE_DB: ExerciseDef[] = [
    { id: 'sq', name: 'Barbell Squat', muscle: 'Legs', difficulty: 'Intermediate', type: 'strength', goals: ['Strength', 'Hypertrophy'] },
    { id: 'bp', name: 'Bench Press', muscle: 'Chest', difficulty: 'Intermediate', type: 'strength', goals: ['Strength', 'Hypertrophy'] },
    { id: 'dl', name: 'Deadlift', muscle: 'Back', difficulty: 'Advanced', type: 'strength', goals: ['Strength'] },
    { id: 'ohp', name: 'Overhead Press', muscle: 'Shoulders', difficulty: 'Intermediate', type: 'strength', goals: ['Strength'] },
    { id: 'pull', name: 'Pull Ups', muscle: 'Back', difficulty: 'Beginner', type: 'strength', goals: ['Hypertrophy', 'Strength'] },
    { id: 'db_curl', name: 'Dumbbell Curl', muscle: 'Biceps', difficulty: 'Beginner', type: 'strength', goals: ['Hypertrophy'] },
    { id: 'tri_ext', name: 'Tricep Extension', muscle: 'Triceps', difficulty: 'Beginner', type: 'strength', goals: ['Hypertrophy'] },
    { id: 'leg_press', name: 'Leg Press', muscle: 'Legs', difficulty: 'Beginner', type: 'strength', goals: ['Hypertrophy'] },
    { id: 'lat_raise', name: 'Lateral Raise', muscle: 'Shoulders', difficulty: 'Beginner', type: 'strength', goals: ['Hypertrophy'] },
    { id: 'run', name: 'Treadmill Run', muscle: 'Cardio', difficulty: 'Beginner', type: 'cardio', goals: ['Endurance', 'Fat Loss'] },
    { id: 'row', name: 'Rowing Machine', muscle: 'Full Body', difficulty: 'Intermediate', type: 'cardio', goals: ['Endurance', 'Fat Loss'] },
    { id: 'burpees', name: 'Burpees', muscle: 'Full Body', difficulty: 'Advanced', type: 'cardio', goals: ['Fat Loss', 'Endurance'] },
    { id: 'plank', name: 'Plank', muscle: 'Core', difficulty: 'Beginner', type: 'strength', goals: ['Endurance', 'Strength'] },
];

type SetLog = {
    id: string;
    weight: number;
    reps: number;
    duration: number; // in seconds
    timestamp: number;
};

type ActiveExercise = ExerciseDef & {
    sets: SetLog[];
};

// --- Helpers ---

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// --- Shared UI Components ---

const Navigation = () => {
    const location = useLocation();
    
    // Hide nav on Auth/Onboarding for cleaner UX, or keep minimal
    if (['/', '/onboarding'].includes(location.pathname)) return null;

    const navItems = [
        { path: "/tracker", label: "Tracker", icon: "fitness_center" },
        { path: "/analytics", label: "Stats", icon: "monitoring" },
        { path: "/leaderboard", label: "Rank", icon: "trophy" },
        { path: "/community", label: "Social", icon: "groups" }
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            {navItems.map(item => (
                <Link 
                    key={item.path} 
                    to={item.path}
                    className={`flex flex-col items-center gap-1 transition-all duration-300 group ${location.pathname === item.path ? 'text-primary scale-110' : 'text-gray-500 hover:text-white'}`}
                >
                    <span className={`material-symbols-outlined text-2xl ${location.pathname === item.path ? 'fill-1' : ''}`}>{item.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 absolute -top-8 transition-opacity bg-black px-2 py-1 rounded border border-white/10">{item.label}</span>
                </Link>
            ))}
        </div>
    );
};

const Logo = ({ size = "text-xl", iconSize = "text-xl" }) => (
    <div className="flex items-center gap-3 text-white">
        <div className="flex items-center justify-center size-8 rounded-lg bg-surface-glass border border-border-glass text-primary shadow-neon">
            <span className={`material-symbols-outlined ${iconSize}`}>bolt</span>
        </div>
        <h2 className={`text-white ${size} font-extrabold tracking-tight font-display`}>Stitch</h2>
    </div>
);

const UserAvatar = ({ src, alt = "User", size = "size-10" }: { src: string, alt?: string, size?: string }) => (
    <div className={`${size} rounded-full bg-cover bg-center border border-white/10 ring-2 ring-black`} 
         style={{ backgroundImage: `url("${src}")` }}>
    </div>
);

// --- Screens ---

const AuthScreen = () => {
    const navigate = useNavigate();
    return (
        <div className="bg-black text-white font-display overflow-x-hidden relative min-h-screen flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-[0.15] pointer-events-none"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

            <header className="absolute top-0 w-full flex items-center justify-between px-8 py-6 z-10">
                <Logo />
            </header>

            <div className="relative w-full max-w-[1000px] flex flex-col md:flex-row bg-surface-dark border border-gray-800 rounded-xl overflow-hidden shadow-2xl z-10 animate-fade-in-up">
                <div className="hidden md:flex md:w-5/12 relative flex-col justify-end p-10 bg-black">
                    <div className="absolute inset-0 z-0">
                        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" className="w-full h-full object-cover opacity-60 grayscale mix-blend-luminosity hover:grayscale-0 hover:mix-blend-normal transition-all duration-700" alt="Gym"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center justify-center size-12 rounded-lg bg-primary/10 border border-primary/20 text-primary mb-2">
                            <span className="material-symbols-outlined">trophy</span>
                        </div>
                        <h2 className="text-3xl font-bold leading-tight">Dominate your performance.</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">Join the elite. Track stats, improve form with AI, and compete globally.</p>
                    </div>
                </div>

                <div className="w-full md:w-7/12 p-8 md:p-12 bg-surface-dark relative">
                    <div className="max-w-md mx-auto">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white mb-2">Initialize System</h1>
                            <p className="text-gray-400 text-sm">Enter credentials to access the mainframe.</p>
                        </div>
                        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); navigate('/onboarding'); }}>
                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Gamertag</label>
                                <input className="w-full bg-black/50 border border-gray-800 text-white text-sm rounded-lg focus:ring-1 focus:ring-primary focus:border-primary block p-3 placeholder-gray-600 outline-none transition-all" placeholder="Enter ID..." type="text"/>
                            </div>
                            <button className="w-full relative group overflow-hidden rounded-lg bg-primary px-5 py-3.5 transition-all duration-300 hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.98] shadow-neon">
                                <span className="relative z-10 flex items-center justify-center gap-2 text-background-dark font-bold text-sm tracking-widest uppercase">
                                    Login
                                    <span className="material-symbols-outlined text-[18px] font-bold">arrow_forward</span>
                                </span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OnboardingScreen = () => {
    const navigate = useNavigate();
    const [selectedGoal, setSelectedGoal] = useState('Hypertrophy');
    const [expLevel, setExpLevel] = useState(50);
    const [isLoading, setIsLoading] = useState(false);

    const goals = [
        { id: 'Strength', icon: 'fitness_center', desc: 'Max power & load.' },
        { id: 'Hypertrophy', icon: 'accessibility_new', desc: 'Volume & definition.' },
        { id: 'Endurance', icon: 'directions_run', desc: 'Cardio capacity.' },
        { id: 'Fat Loss', icon: 'local_fire_department', desc: 'Burn & tone.' },
    ];

    const handleInitialize = async () => {
        setIsLoading(true);
        // Persist local preferences
        localStorage.setItem('userGoal', selectedGoal);
        localStorage.setItem('userExp', expLevel.toString());

        try {
            // Generate AI Recommendations
            const plan = await generateWorkoutPlan(selectedGoal, expLevel);
            localStorage.setItem('aiPlan', plan);
            navigate('/tracker');
        } catch (e) {
            console.error(e);
            navigate('/tracker'); // Fallback
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-dark text-white overflow-x-hidden antialiased">
            <header className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
                <Logo />
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/tracker')} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Skip</button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 w-full max-w-6xl mx-auto relative">
                {isLoading && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
                         <div className="size-16 rounded-full border-4 border-white/10 border-t-primary animate-spin mb-4"></div>
                         <h2 className="text-xl font-bold animate-pulse text-primary">Generating Protocol...</h2>
                         <p className="text-sm text-gray-500 mt-2 font-mono">Analyzing {selectedGoal} metrics</p>
                    </div>
                )}

                <div className="w-full max-w-4xl mb-10 text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-3">Define Protocol</h1>
                    <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl">Select your primary directive for the AI engine.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mb-12">
                    {goals.map((goal) => (
                        <button 
                            key={goal.id}
                            onClick={() => setSelectedGoal(goal.id)}
                            className={`group glass-panel rounded-2xl p-6 aspect-square flex flex-col items-start justify-between transition-all duration-300 relative text-left ${selectedGoal === goal.id ? 'bg-primary/5 border-primary shadow-[0_0_20px_rgba(70,236,19,0.1)]' : ''}`}
                        >
                            <div className={`size-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${selectedGoal === goal.id ? 'bg-primary/20' : 'bg-white/5'}`}>
                                <span className={`material-symbols-outlined text-3xl font-light ${selectedGoal === goal.id ? 'text-primary' : 'text-white'}`}>{goal.icon}</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{goal.id}</h3>
                                <p className="text-sm text-gray-400 leading-snug">{goal.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="w-full max-w-4xl mb-12 px-2 space-y-4 relative">
                    <div className="flex justify-between items-end">
                        <label className="text-white text-lg font-bold">Experience Level</label>
                        <span className="text-primary font-bold text-lg">{expLevel < 25 ? "Beginner" : expLevel < 75 ? "Intermediate" : "Elite"}</span>
                    </div>
                    {/* Fixed Slider Interaction: Added z-50, relative, and increased height for better touch target */}
                    <div className="relative w-full h-10 flex items-center justify-center">
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={expLevel} 
                            onChange={(e) => setExpLevel(parseInt(e.target.value))}
                            className="w-full h-6 bg-transparent rounded-full appearance-none cursor-pointer relative z-50 touch-action-none"
                            style={{
                                WebkitAppearance: 'none',
                            }}
                        />
                        {/* Custom Track visual */}
                        <div className="absolute top-1/2 left-0 w-full h-2 bg-white/10 rounded-full -translate-y-1/2 z-0 overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${expLevel}%` }}></div>
                        </div>
                        {/* Custom Thumb visual locator */}
                        <div 
                             className="absolute top-1/2 w-4 h-4 bg-primary rounded-full border-2 border-black shadow-[0_0_10px_rgba(70,236,19,0.8)] pointer-events-none z-10 -translate-y-1/2 -translate-x-1/2"
                             style={{ left: `${expLevel}%` }}
                        ></div>
                    </div>
                </div>

                <div className="w-full max-w-4xl flex justify-end">
                    <button onClick={handleInitialize} className="rounded-full bg-primary py-4 px-12 text-background-dark font-bold text-base tracking-wide transition-all hover:shadow-[0_0_30px_-5px_rgba(70,236,19,0.4)] hover:brightness-110">
                        Initialize
                    </button>
                </div>
            </main>
        </div>
    );
};

const TrackerScreen = () => {
    const navigate = useNavigate();
    
    // Core State
    const [routine, setRoutine] = useState<ActiveExercise[]>([]);
    const [goal, setGoal] = useState<string>('Hypertrophy');
    const [plan, setPlan] = useState<string | null>(null);

    // UI State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
    const [historyModalExercise, setHistoryModalExercise] = useState<ActiveExercise | null>(null);

    // Active Logging State
    const [inputWeight, setInputWeight] = useState<number>(0);
    const [inputReps, setInputReps] = useState<number>(0);
    
    // Timer State for Active Set
    const [timerStart, setTimerStart] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<number | null>(null);

    // Editing State (in Modal)
    const [editingSetId, setEditingSetId] = useState<string | null>(null);
    const [editWeight, setEditWeight] = useState(0);
    const [editReps, setEditReps] = useState(0);

    // Initialization
    useEffect(() => {
        const storedPlan = localStorage.getItem('aiPlan');
        const storedGoal = localStorage.getItem('userGoal') || 'Hypertrophy';
        const storedExp = parseInt(localStorage.getItem('userExp') || '50');
        
        if (storedPlan) setPlan(storedPlan);
        setGoal(storedGoal);

        // Generate recommended routine based on goal/level logic
        const levelStr = storedExp < 25 ? 'Beginner' : storedExp < 75 ? 'Intermediate' : 'Advanced';
        
        const recommended = EXERCISE_DB.filter(ex => 
            (ex.goals.includes(storedGoal) || ex.muscle === 'Full Body') &&
            (levelStr === 'Advanced' ? true : ex.difficulty === levelStr || ex.difficulty === 'Beginner')
        ).slice(0, 5); 

        setRoutine(recommended.map(ex => ({ ...ex, sets: [] })));

    }, []);

    // Timer Logic
    useEffect(() => {
        if (timerStart !== null) {
            timerRef.current = window.setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - timerStart) / 1000));
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timerStart]);

    const toggleTimer = () => {
        if (timerStart === null) {
            setTimerStart(Date.now());
            setElapsedTime(0);
        } else {
            // Stop and Reset happens on logSet usually, but if just stopping:
            setTimerStart(null);
        }
    };

    const toggleExpand = (id: string) => {
        if (expandedExerciseId === id) {
            setExpandedExerciseId(null);
        } else {
            setExpandedExerciseId(id);
            // Default values
            setInputWeight(50);
            setInputReps(10);
            setTimerStart(null);
            setElapsedTime(0);
        }
    };

    const addExerciseToRoutine = (exercise: ExerciseDef) => {
        if (routine.find(r => r.id === exercise.id)) {
            alert("Already in routine!");
            return;
        }
        setRoutine(prev => [...prev, { ...exercise, sets: [] }]);
        setIsSearchOpen(false);
        setSearchQuery('');
    };

    const logSet = (exerciseId: string, type: 'strength' | 'cardio') => {
        const newSet: SetLog = {
            id: Date.now().toString(),
            weight: type === 'strength' ? inputWeight : 0,
            reps: type === 'strength' ? inputReps : 0,
            duration: elapsedTime, // Capture timer
            timestamp: Date.now()
        };

        setRoutine(prev => prev.map(ex => {
            if (ex.id === exerciseId) {
                return {
                    ...ex,
                    sets: [...ex.sets, newSet]
                };
            }
            return ex;
        }));

        // Reset Timer
        setTimerStart(null);
        setElapsedTime(0);
    };

    // History Actions
    const openHistory = (e: React.MouseEvent, exercise: ActiveExercise) => {
        e.stopPropagation();
        setHistoryModalExercise(exercise);
        setEditingSetId(null);
    };

    const deleteSet = (setId: string) => {
        if (!historyModalExercise) return;
        if (window.confirm("Are you sure you want to delete this set?")) {
            // Update local modal state
            const updatedSets = historyModalExercise.sets.filter(s => s.id !== setId);
            setHistoryModalExercise({ ...historyModalExercise, sets: updatedSets });
            
            // Update global routine state
            setRoutine(prev => prev.map(ex => {
                if (ex.id === historyModalExercise.id) {
                    return { ...ex, sets: updatedSets };
                }
                return ex;
            }));
        }
    };

    const startEditingSet = (set: SetLog) => {
        setEditingSetId(set.id);
        setEditWeight(set.weight);
        setEditReps(set.reps);
    };

    const saveEditedSet = (setId: string) => {
        if (!historyModalExercise) return;
        
        const updatedSets = historyModalExercise.sets.map(s => {
            if (s.id === setId) {
                return { ...s, weight: editWeight, reps: editReps };
            }
            return s;
        });

        setHistoryModalExercise({ ...historyModalExercise, sets: updatedSets });
        
        setRoutine(prev => prev.map(ex => {
            if (ex.id === historyModalExercise.id) {
                return { ...ex, sets: updatedSets };
            }
            return ex;
        }));
        
        setEditingSetId(null);
    };

    const handleFinishWorkout = () => {
        const totalVolume = routine.reduce((total, ex) => {
            return total + ex.sets.reduce((sub, set) => sub + (set.weight * set.reps), 0);
        }, 0);

        if (totalVolume === 0 && routine.every(ex => ex.type === 'strength')) {
            alert("Log some sets first!");
            return;
        }
        
        alert(`Workout Complete!\nTotal Volume: ${totalVolume}kg\nRoutine Saved.`);
        navigate('/analytics');
    };

    const searchResults = useMemo(() => {
        if (!searchQuery) return EXERCISE_DB;
        return EXERCISE_DB.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery]);

    return (
        <div className="bg-[#0A0E14] text-white font-display min-h-screen pb-24 relative">
             
             {/* Exercise Search Modal */}
             {isSearchOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col animate-fade-in-up">
                    <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-[#131a24]">
                        <button onClick={() => setIsSearchOpen(false)} className="size-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <input 
                            autoFocus
                            placeholder="Search exercises..." 
                            className="flex-1 bg-transparent border-none text-xl font-bold focus:ring-0 placeholder-gray-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {searchResults.map(ex => (
                            <button 
                                key={ex.id}
                                onClick={() => addExerciseToRoutine(ex)}
                                className="w-full text-left p-4 rounded-xl bg-surface-dark border border-white/5 hover:border-primary/50 flex justify-between items-center group transition-all"
                            >
                                <div>
                                    <h4 className="font-bold text-white group-hover:text-primary transition-colors">{ex.name}</h4>
                                    <p className="text-xs text-gray-500 capitalize">{ex.type} • {ex.muscle}</p>
                                </div>
                                <span className="material-symbols-outlined text-gray-600 group-hover:text-primary">add_circle</span>
                            </button>
                        ))}
                    </div>
                </div>
             )}

             {/* History Modal */}
             {historyModalExercise && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up" onClick={() => setHistoryModalExercise(null)}>
                    <div className="bg-[#131a24] border border-cyan-accent/30 w-full max-w-md rounded-2xl shadow-[0_0_50px_rgba(0,209,255,0.15)] overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#131a24]">
                            <div>
                                <h3 className="text-xl font-bold text-white">{historyModalExercise.name}</h3>
                                <p className="text-xs text-cyan-accent font-mono uppercase tracking-wider mt-1">Set History</p>
                            </div>
                            <button onClick={() => setHistoryModalExercise(null)} className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#0A0E14]">
                            {historyModalExercise.sets.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No history yet.</p>
                            ) : (
                                historyModalExercise.sets.map((set, i) => (
                                    <div key={set.id} className="bg-surface-dark border border-white/5 rounded-xl p-4 flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-gray-500 font-bold uppercase">Set {i + 1}</span>
                                                <span className="text-[10px] text-gray-600">{new Date(set.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            
                                            {editingSetId === set.id ? (
                                                <div className="flex items-center gap-2 mt-2">
                                                    {historyModalExercise.type === 'strength' && (
                                                        <>
                                                            <input type="number" value={editWeight} onChange={e => setEditWeight(parseFloat(e.target.value))} className="w-20 bg-black border border-white/20 rounded px-2 py-1 text-sm text-white" />
                                                            <span className="text-xs text-gray-500">kg</span>
                                                            <input type="number" value={editReps} onChange={e => setEditReps(parseFloat(e.target.value))} className="w-16 bg-black border border-white/20 rounded px-2 py-1 text-sm text-white" />
                                                            <span className="text-xs text-gray-500">reps</span>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex gap-4 font-mono">
                                                    {historyModalExercise.type === 'strength' ? (
                                                        <>
                                                            <span className="font-bold text-white">{set.weight}<span className="text-[10px] text-gray-500 ml-0.5">KG</span></span>
                                                            <span className="font-bold text-white">{set.reps}<span className="text-[10px] text-gray-500 ml-0.5">REPS</span></span>
                                                        </>
                                                    ) : (
                                                        <span className="font-bold text-cyan-accent">Cardio</span>
                                                    )}
                                                    <span className="font-bold text-white">{formatTime(set.duration)}<span className="text-[10px] text-gray-500 ml-0.5">TIME</span></span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            {editingSetId === set.id ? (
                                                <button onClick={() => saveEditedSet(set.id)} className="text-primary hover:text-white p-2">
                                                    <span className="material-symbols-outlined text-lg">save</span>
                                                </button>
                                            ) : (
                                                <>
                                                    {historyModalExercise.type === 'strength' && (
                                                        <button onClick={() => startEditingSet(set)} className="text-gray-500 hover:text-white p-2">
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                        </button>
                                                    )}
                                                    <button onClick={() => deleteSet(set.id)} className="text-gray-500 hover:text-red-500 p-2">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <header className="sticky top-0 z-30 bg-[#0A0E14]/90 backdrop-blur-md border-b border-border-dark px-6 py-4 flex items-center justify-between">
                <Logo iconSize="24px" />
                <div className="flex items-center gap-4">
                    <UserAvatar src="https://picsum.photos/100" />
                </div>
            </header>
            
            <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
                {plan && (
                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-cyan-accent/10 to-transparent border border-cyan-accent/20">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-cyan-accent text-sm">smart_toy</span>
                            <h4 className="text-xs font-bold text-cyan-accent uppercase tracking-widest">Coach's Protocol</h4>
                         </div>
                         <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">{plan}</p>
                    </div>
                )}

                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase tracking-widest border border-primary/20">{goal}</span>
                            <span className="text-muted-text text-sm">Automated Routine</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                            Today's Session
                        </h2>
                    </div>
                    <button 
                        onClick={handleFinishWorkout}
                        className="flex items-center gap-2 bg-primary hover:bg-[#3bd10f] text-background-dark px-6 py-3 rounded-full font-bold transition-all shadow-[0_0_15px_rgba(70,236,19,0.3)]"
                    >
                        <span className="material-symbols-outlined text-[20px]">check</span>
                        <span>Finish</span>
                    </button>
                </div>

                {/* Exercises List */}
                <div className="space-y-4">
                    {routine.length === 0 && (
                        <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl text-gray-500">
                            No exercises loaded. Add one below.
                        </div>
                    )}

                    {routine.map((exercise) => (
                        <div key={exercise.id} className="bg-surface-dark border border-white/10 rounded-2xl overflow-hidden transition-all duration-300">
                            {/* Exercise Header */}
                            <div 
                                onClick={() => toggleExpand(exercise.id)}
                                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 ${expandedExerciseId === exercise.id ? 'bg-white/5 border-b border-white/5' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-lg bg-card-dark flex items-center justify-center border border-white/5 text-gray-400">
                                        <span className="material-symbols-outlined">{exercise.type === 'cardio' ? 'directions_run' : 'fitness_center'}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-white">{exercise.name}</h3>
                                            <button 
                                                onClick={(e) => openHistory(e, exercise)} 
                                                className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-[10px] uppercase text-cyan-accent border border-white/5 transition-colors"
                                            >
                                                History
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500">{exercise.sets.length} {exercise.type === 'cardio' ? 'sessions' : 'sets'} completed</p>
                                    </div>
                                </div>
                                <span className={`material-symbols-outlined text-gray-500 transition-transform ${expandedExerciseId === exercise.id ? 'rotate-180' : ''}`}>expand_more</span>
                            </div>

                            {/* Expanded Logging Area */}
                            {expandedExerciseId === exercise.id && (
                                <div className="p-4 bg-black/20 animate-fade-in-up">
                                    {/* Past Sets Summary */}
                                    {exercise.sets.length > 0 && (
                                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                                            {exercise.sets.map((set, idx) => (
                                                <div key={idx} className="flex flex-col min-w-[80px] p-2 bg-green-900/10 border border-green-500/20 rounded-lg">
                                                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Set {idx + 1}</span>
                                                    {exercise.type === 'strength' && (
                                                        <span className="font-mono text-xs text-gray-300">{set.weight}kg x {set.reps}</span>
                                                    )}
                                                    <span className="font-mono text-[10px] text-gray-400">{formatTime(set.duration)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Active Controls */}
                                    <div className="flex flex-col gap-4">
                                        {exercise.type === 'strength' ? (
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Weight (kg)</label>
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-[#131a24] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:border-primary focus:ring-0"
                                                        value={inputWeight}
                                                        onChange={(e) => setInputWeight(parseFloat(e.target.value))}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Reps</label>
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-[#131a24] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:border-primary focus:ring-0"
                                                        value={inputReps}
                                                        onChange={(e) => setInputReps(parseFloat(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-center py-2">
                                                <div className="text-4xl font-mono font-bold text-white tracking-widest tabular-nums">
                                                    {formatTime(elapsedTime)}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                                            <div className="flex-1 flex items-center gap-4">
                                                <button 
                                                    onClick={toggleTimer}
                                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${timerStart ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
                                                >
                                                    <span className="material-symbols-outlined">{timerStart ? 'stop' : 'play_arrow'}</span>
                                                    {timerStart ? 'Stop Timer' : 'Start Timer'}
                                                </button>
                                                {/* Display current timer next to Start button as requested for sets */}
                                                {exercise.type === 'strength' && (
                                                    <div className="font-mono text-xl text-gray-400 w-20 text-right">
                                                        {formatTime(elapsedTime)}
                                                    </div>
                                                )}
                                            </div>

                                            <button 
                                                onClick={(e) => { e.stopPropagation(); logSet(exercise.id, exercise.type); }}
                                                className="size-12 bg-cyan-accent text-black rounded-xl flex items-center justify-center hover:bg-white transition-colors shadow-[0_0_15px_rgba(0,209,255,0.3)]"
                                            >
                                                <span className="material-symbols-outlined">check</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                {/* Floating Add Button */}
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:translate-x-[200px] z-30">
                     <button 
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-2 bg-card-dark border border-white/20 text-white px-5 py-3 rounded-full shadow-lg hover:bg-white/10 hover:scale-105 transition-all"
                     >
                        <span className="material-symbols-outlined text-primary">add_circle</span>
                        <span className="font-bold text-sm">Add Exercise</span>
                     </button>
                </div>
            </main>
        </div>
    );
};

const AnalyticsScreen = () => {
    return (
        <div className="bg-background-dark text-white min-h-screen pb-24 font-display">
            <header className="sticky top-0 z-30 bg-[#0A0E14]/90 backdrop-blur-md border-b border-border-dark px-6 py-4 flex items-center justify-between">
                <Logo />
                <UserAvatar src="https://picsum.photos/101" />
            </header>

            <main className="max-w-[1440px] mx-auto p-6 lg:p-12 flex flex-col gap-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">Analytics</h1>
                        <p className="text-gray-400 font-medium">Weekly Performance Review</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-card-dark/50 px-4 py-2 rounded-full border border-white/5">
                        <span className="material-symbols-outlined text-base">calendar_today</span>
                        <span>Current Cycle</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-cyan-accent/10 rounded-2xl w-fit text-cyan-accent"><span className="material-symbols-outlined">monitoring</span></div>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">+5%</span>
                            </div>
                            <div><p className="text-gray-400 text-sm font-medium mb-1">Est. 1RM (Bench)</p><h3 className="text-3xl font-bold text-white tracking-tight">125 <span className="text-lg text-gray-500 font-normal">kg</span></h3></div>
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-white/10 rounded-2xl w-fit text-white"><span className="material-symbols-outlined">layers</span></div>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">+12 sets</span>
                            </div>
                            <div><p className="text-gray-400 text-sm font-medium mb-1">Total Sets</p><h3 className="text-3xl font-bold text-white tracking-tight">42</h3></div>
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col gap-4">
                             <div className="flex justify-between items-start">
                                <div className="p-3 bg-primary/10 rounded-2xl w-fit text-primary"><span className="material-symbols-outlined">target</span></div>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">Goal Progress</p>
                                <h3 className="text-3xl font-bold text-white tracking-tight">85%</h3>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1 overflow-hidden"><div className="bg-primary h-1.5 rounded-full shadow-neon" style={{width: '85%'}}></div></div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col h-96 justify-between relative overflow-hidden">
                    <h3 className="text-xl font-bold text-white relative z-10">Volume Load</h3>
                    {/* Simplified Chart Visual using CSS/SVG */}
                    <div className="absolute inset-x-0 bottom-0 h-64 opacity-50">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                             <path d="M0 100 L0 50 L20 40 L40 60 L60 30 L80 45 L100 20 L100 100 Z" fill="url(#grad1)" />
                             <defs>
                                <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style={{stopColor:'#00D1FF', stopOpacity:0.5}} />
                                <stop offset="100%" style={{stopColor:'#00D1FF', stopOpacity:0}} />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
            </main>
        </div>
    );
};

const LeaderboardScreen = () => {
    return (
        <div className="bg-black text-white min-h-screen pb-24 font-display">
            <header className="px-8 py-6 flex justify-between items-end border-b border-white/5 bg-black/95 backdrop-blur-sm sticky top-0 z-30">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Leaderboard</h2>
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="material-symbols-outlined text-[18px] text-primary">public</span>
                        <span className="text-sm font-medium">Global Ranking</span>
                    </div>
                </div>
                <Logo />
            </header>
            
            <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-end justify-center gap-4 mb-12 mt-8">
                     {/* 2nd */}
                    <div className="w-1/3 max-w-[160px] flex flex-col items-center">
                        <UserAvatar src="https://picsum.photos/102" size="size-16" />
                        <div className="mt-3 text-center">
                            <div className="font-bold text-white">Jane D.</div>
                            <div className="text-primary font-mono font-bold text-xl">9,420</div>
                        </div>
                        <div className="w-full h-32 bg-gray-800/50 mt-2 rounded-t-lg border-t-4 border-gray-400 relative">
                             <div className="absolute top-2 w-full text-center text-4xl font-black text-white/10">2</div>
                        </div>
                    </div>
                     {/* 1st */}
                    <div className="w-1/3 max-w-[180px] flex flex-col items-center -mt-8">
                         <span className="material-symbols-outlined text-yellow-400 text-3xl mb-2 animate-bounce">workspace_premium</span>
                        <UserAvatar src="https://picsum.photos/103" size="size-24" />
                         <div className="mt-3 text-center">
                            <div className="font-bold text-white text-xl">Alex B.</div>
                            <div className="text-primary font-mono font-bold text-2xl">9,850</div>
                        </div>
                        <div className="w-full h-44 bg-gray-800/50 mt-2 rounded-t-lg border-t-4 border-yellow-500 relative shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                             <div className="absolute top-2 w-full text-center text-5xl font-black text-white/10">1</div>
                        </div>
                    </div>
                     {/* 3rd */}
                    <div className="w-1/3 max-w-[160px] flex flex-col items-center">
                        <UserAvatar src="https://picsum.photos/104" size="size-16" />
                         <div className="mt-3 text-center">
                            <div className="font-bold text-white">Mike K.</div>
                            <div className="text-primary font-mono font-bold text-xl">9,100</div>
                        </div>
                        <div className="w-full h-24 bg-gray-800/50 mt-2 rounded-t-lg border-t-4 border-orange-700 relative">
                             <div className="absolute top-2 w-full text-center text-4xl font-black text-white/10">3</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {[4, 5, 6, 7].map((rank) => (
                        <div key={rank} className="flex items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-colors">
                            <div className="w-12 text-center text-gray-500 font-mono font-bold text-lg">{rank < 10 ? `0${rank}` : rank}</div>
                            <UserAvatar src={`https://picsum.photos/10${rank+5}`} />
                            <div className="ml-4 flex-1 font-bold text-gray-300">User_{rank}82</div>
                            <div className="font-mono text-primary font-bold">8,{900 - (rank*50)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CommunityScreen = () => {
    return (
        <div className="bg-black text-white min-h-screen pb-24 font-display">
             <div className="bg-primary/10 w-full px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium border-b border-primary/20">
                <span className="text-gray-300">🏆 Weekly Challenge: <span className="text-white font-bold">100km volume</span></span>
                <button className="text-primary hover:underline font-bold uppercase text-xs tracking-wide">Join</button>
            </div>
            <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <Logo />
                <UserAvatar src="https://picsum.photos/101" />
            </header>

            <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card-dark p-4 rounded-xl border border-primary/20 flex gap-4 items-center">
                        <UserAvatar src="https://picsum.photos/101" />
                        <input className="flex-1 bg-zinc-900 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-primary/50 placeholder-gray-500 text-white" placeholder="Share your PR..." type="text"/>
                        <button className="bg-primary hover:bg-white text-black rounded-full size-8 flex items-center justify-center"><span className="material-symbols-outlined text-sm">add</span></button>
                    </div>

                    <article className="bg-card-dark rounded-xl overflow-hidden border border-primary/30 shadow-neon">
                        <div className="p-5 flex gap-4">
                            <UserAvatar src="https://picsum.photos/108" size="size-12" />
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h4 className="text-white font-bold">AlexFit</h4>
                                    <p className="text-gray-400 text-xs">2h ago</p>
                                </div>
                                <p className="text-gray-300 text-sm mt-2 mb-2">New personal best! Felt amazing today. 💪</p>
                                <h3 className="text-primary font-extrabold text-2xl tracking-tight uppercase">Squat 120kg</h3>
                                <div className="mt-4 rounded-lg overflow-hidden h-64 w-full bg-gray-800">
                                    <img src="https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1469&auto=format&fit=crop" className="w-full h-full object-cover" alt="Squat"/>
                                </div>
                            </div>
                        </div>
                    </article>
                 </div>
                 
                 <div className="hidden lg:block space-y-6">
                    <div className="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-xl border border-primary/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-primary text-xs font-bold uppercase mb-1 tracking-widest">Stitch Premium</p>
                            <h3 className="text-xl font-bold text-white mb-2">Unlock Limits</h3>
                            <button className="bg-white text-black text-xs font-extrabold px-6 py-2 rounded-full hover:bg-primary mt-4 transition-colors">Try Free</button>
                        </div>
                        <div className="absolute -right-6 -bottom-6 opacity-10 text-primary"><span className="material-symbols-outlined text-[120px]">bolt</span></div>
                    </div>
                 </div>
            </main>
        </div>
    );
};

const App = () => {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<AuthScreen />} />
                <Route path="/onboarding" element={<OnboardingScreen />} />
                <Route path="/tracker" element={<TrackerScreen />} />
                <Route path="/analytics" element={<AnalyticsScreen />} />
                <Route path="/leaderboard" element={<LeaderboardScreen />} />
                <Route path="/community" element={<CommunityScreen />} />
            </Routes>
            <AICoach />
            <Navigation />
        </HashRouter>
    );
};

export default App;
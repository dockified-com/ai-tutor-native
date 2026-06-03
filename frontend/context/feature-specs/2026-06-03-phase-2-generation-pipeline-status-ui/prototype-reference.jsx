/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, ChevronRight, Settings, Menu, ArrowUp,
  Sparkles, Check, X, Layout, Globe, BookOpen, User, 
  ThumbsDown, ChevronDown, CheckCircle2, TerminalSquare, Code2, 
  PieChart, FileText, X as XIcon, AudioLines, Hand, Flame
} from 'lucide-react';

const MOCK_COURSE_TITLE = "Advanced Python Patterns";
const MOCK_LESSON_TITLE = "Introduction to Decorators";

const BLOCKS = [
  {
    id: 'b1',
    type: 'markdown',
    content: { text: "Hey there, welcome to Advanced Python Patterns! 👋 I'm your AI Tutor, and I'm thrilled to have you here.\n\nHere's why decorators matter: they allow you to elegantly modify the behavior of functions or classes without permanently altering their source code. They are the backbone of modern Python frameworks like Flask, FastAPI, and Django." }
  },
  {
    id: 'b2',
    type: 'markdown',
    content: { text: "Whether you're building authentication middleware, logging performance, or managing database sessions, decorators are the skill you'll reach for daily." }
  },
  {
    id: 'b3',
    type: 'markdown',
    content: { text: "In python, we use the `@` symbol as syntactic sugar to apply a decorator. Let's try writing a simple one." }
  },
  {
    id: 'b4',
    type: 'code',
    content: {
      instruction: "Write a decorator function called `logger` that wraps a function, and prints 'Running...' before executing the original function.",
      language: "python",
      starter_code: "def logger(func):\n    def wrapper(*args, **kwargs):\n        # Your code here: print 'Running...'\n        \n        return func(*args, **kwargs)\n    return wrapper\n\n@logger\ndef say_hello():\n    print('Hello!')\n\nsay_hello()",
      expected_output: "Running...\nHello!",
      hint_seed_prompt: "Look at the space inside the `wrapper` function. What `print` statement can you add before calling `func`?"
    }
  },
  {
    id: 'b5',
    type: 'concept_check',
    content: {
      question: "Does the `@logger` syntax permanently modify the source code of the `say_hello` function?",
      options: ["Yes", "No"],
      correct: "No",
      explanation_correct: "Right! Decorators wrap the original function dynamically at runtime.",
      explanation_wrong: "Actually, decorators don't change the original source code. They wrap the function dynamically at runtime."
    }
  }
];

export default function AINativeTutor() {
  const [revealedIndex, setRevealedIndex] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState(BLOCKS[0].id);
  const [activeWorkspaceBlockId, setActiveWorkspaceBlockId] = useState(null);
  
  // Sidebar state
  const [activeSidebar, setActiveSidebar] = useState(null); // 'progress', 'notes', null

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);

  // Ask Anything footer state
  const [askInput, setAskInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Code Block State
  const [codeValues, setCodeValues] = useState(
    BLOCKS.filter(b => b.type === 'code').reduce((acc, b) => ({ ...acc, [b.id]: b.content.starter_code }), {})
  );
  const [terminalOutputs, setTerminalOutputs] = useState({});
  const [codeAttempts, setCodeAttempts] = useState({});
  const [hints, setHints] = useState({});
  const [conceptAnswers, setConceptAnswers] = useState({});
  const [roasts, setRoasts] = useState({}); // New state for "Roast My Code"
  
  const feedEndRef = useRef(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [revealedIndex, chatHistory]);

  useEffect(() => {
    const activeBlock = BLOCKS.find(b => b.id === activeBlockId);
    if (activeBlock && (activeBlock.type === 'code' || activeBlock.type === 'mermaid')) {
      setActiveWorkspaceBlockId(activeBlock.id);
    }
  }, [activeBlockId]);

  const handleContinue = () => {
    if (revealedIndex < BLOCKS.length - 1) {
      const nextIndex = revealedIndex + 1;
      setRevealedIndex(nextIndex);
      setActiveBlockId(BLOCKS[nextIndex].id);
    }
  };

  const isContinueEnabled = () => {
    const currentBlock = BLOCKS[revealedIndex];
    if (currentBlock.type === 'concept_check') return !!conceptAnswers[currentBlock.id];
    if (currentBlock.type === 'code') return terminalOutputs[currentBlock.id]?.verdict === 'passed';
    return true;
  };

  const handleAskQuestion = (e) => {
    e.preventDefault();
    if (!askInput.trim()) return;
    
    const newChat = [...chatHistory, { role: 'user', text: askInput }];
    setChatHistory(newChat);
    setAskInput('');
    
    // Feature 1: Inside Joke / Hobby Context Injection
    setTimeout(() => {
      setChatHistory([...newChat, { role: 'ai', text: 'Great question! Think of decorators like playing Sage in Valorant. You aren\'t permanently changing your Duelist (the original function), you\'re just casting a temporary buff on them before they run in. It keeps the core logic clean!' }]);
    }, 600);
  };

  const handleRoastCode = (blockId) => {
    setRoasts(prev => ({ ...prev, [blockId]: { status: 'loading', text: 'Analyzing your spaghetti code...' } }));
    
    setTimeout(() => {
      // Feature 2: Roast My Code Output
      const roastText = "Oh, so we're just ignoring type hints in 2026? Bold move. It works, but it looks like you copy-pasted this from a 2018 StackOverflow thread. 3/10 for style, 10/10 for passing the tests. Now go refactor it before my digital eyes bleed. 💀";
      setRoasts(prev => ({ ...prev, [blockId]: { status: 'done', text: '' } }));
      
      let i = 0;
      const interval = setInterval(() => {
        setRoasts(prev => ({ ...prev, [blockId]: { status: 'done', text: roastText.substring(0, i + 1) } }));
        i++;
        if (i >= roastText.length) clearInterval(interval);
      }, 20);
    }, 800);
  };

  const handleRunCode = (blockId) => {
    const attempts = codeAttempts[blockId] || 0;
    setTerminalOutputs(prev => ({ ...prev, [blockId]: { status: 'running', text: 'Executing...' } }));
    
    setTimeout(() => {
      if (attempts === 0) {
        setTerminalOutputs(prev => ({ 
          ...prev, 
          [blockId]: { verdict: 'failed', text: 'Output:\nHello!\n\nExpected:\nRunning...\nHello!' } 
        }));
        setCodeAttempts(prev => ({ ...prev, [blockId]: attempts + 1 }));
        simulateStreamingHint(blockId, BLOCKS.find(b => b.id === blockId).content.hint_seed_prompt);
      } else {
        setTerminalOutputs(prev => ({ 
          ...prev, 
          [blockId]: { verdict: 'passed', text: 'Output:\nRunning...\nHello!\n\nAll tests passed!' } 
        }));
      }
    }, 600);
  };

  const simulateStreamingHint = (blockId, hintSeed) => {
    setHints(prev => ({ ...prev, [blockId]: '' }));
    const hintText = "I noticed your output is missing the 'Running...' string. " + hintSeed;
    let i = 0;
    const interval = setInterval(() => {
      setHints(prev => ({ ...prev, [blockId]: prev[blockId] + hintText.charAt(i) }));
      i++;
      if (i >= hintText.length) clearInterval(interval);
    }, 20);
  };

  const renderBlockInFeed = (block, index) => {
    const isActive = block.id === activeBlockId;
    const isRevealed = index <= revealedIndex;
    if (!isRevealed) return null;

    const opacityClass = isActive ? "opacity-100" : "opacity-60 hover:opacity-100 transition-opacity";

    return (
      <div key={block.id} className={`mb-6 ${opacityClass}`} onClick={() => setActiveBlockId(block.id)}>
        
        {/* Markdown Content - Clean, no borders */}
        {block.type === 'markdown' && (
          <div className="text-slate-800 leading-relaxed text-[15px] whitespace-pre-wrap font-serif">
            {block.content.text}
          </div>
        )}

        {/* Interactive Block Divider/Prompt */}
        {block.type === 'code' && (
          <div className="text-slate-800 font-medium leading-relaxed font-serif">
            {block.content.instruction}
          </div>
        )}

        {/* Concept Check */}
        {block.type === 'concept_check' && (
          <div className="space-y-4">
            <div className="font-medium text-slate-800 font-serif">
              {block.content.question}
            </div>
            <div className="flex gap-3">
              {block.content.options.map(opt => {
                const isSelected = conceptAnswers[block.id] === opt;
                const hasAnswered = !!conceptAnswers[block.id];
                const isCorrect = opt === block.content.correct;
                
                let btnClass = "px-6 py-2 rounded border text-sm font-medium transition-colors ";
                if (!hasAnswered) {
                  btnClass += "bg-white border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700";
                } else if (isSelected) {
                  btnClass += isCorrect 
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-red-50 border-red-300 text-red-800";
                } else {
                  btnClass += "bg-white border-slate-200 text-slate-400 opacity-50";
                }

                return (
                  <button 
                    key={opt} disabled={hasAnswered}
                    onClick={(e) => { e.stopPropagation(); setConceptAnswers({ ...conceptAnswers, [block.id]: opt }); }}
                    className={btnClass}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {conceptAnswers[block.id] && (
              <div className="text-[15px] text-slate-600 mt-2 font-serif italic">
                {conceptAnswers[block.id] === block.content.correct ? block.content.explanation_correct : block.content.explanation_wrong}
              </div>
            )}
          </div>
        )}

        {/* Socratic Hint inline */}
        {hints[block.id] && (
          <div className="mt-4 p-4 bg-emerald-50/50 border-l-2 border-emerald-400 text-sm text-slate-700 leading-relaxed font-serif">
            {hints[block.id]}
          </div>
        )}
      </div>
    );
  };

  const renderWorkspace = () => {
    const wsBlock = BLOCKS.find(b => b.id === activeWorkspaceBlockId);

    if (!wsBlock) {
      // DataCamp-style Welcome Placeholder
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border-l border-slate-100">
          <div className="animate-bounce mb-6">
            <Hand size={64} className="text-amber-400 drop-shadow-sm" fill="#fbbf24" strokeWidth={1} />
          </div>
          <h1 className="text-4xl font-light text-slate-600 tracking-tight">Welcome to the Course!</h1>
        </div>
      );
    }

    if (wsBlock.type === 'code') {
      const output = terminalOutputs[wsBlock.id];
      const roast = roasts[wsBlock.id];

      return (
        <div className="flex-1 flex flex-col h-full bg-white border-l border-slate-200">
          {/* Header */}
          <div className="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50/50 text-sm text-slate-600">
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 font-medium">
                 <Code2 size={16} className="text-slate-400"/> Example 1
               </div>
               {/* Feature 3: Struggle Heatmap */}
               <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                 <Flame size={12} className="animate-pulse" /> 2 friends got stuck here
               </div>
             </div>
             <button 
               onClick={() => handleRunCode(wsBlock.id)}
               className="text-xs font-semibold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1.5"
             >
               Run <span className="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">CTRL + ↵</span>
             </button>
          </div>

          {/* Editor Area */}
          <div className="flex-1 relative flex bg-white">
            <div className="w-12 border-r border-slate-100 flex flex-col text-right pr-3 pt-4 select-none font-mono text-xs text-slate-300">
              {[...Array(15)].map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <textarea 
              className="flex-1 text-slate-800 p-4 font-mono text-[14px] leading-relaxed focus:outline-none resize-none bg-transparent"
              value={codeValues[wsBlock.id]}
              onChange={(e) => setCodeValues({ ...codeValues, [wsBlock.id]: e.target.value })}
              spellCheck="false"
            />
          </div>
          
          {/* Output Terminal */}
          <div className="h-[40%] border-t border-slate-200 bg-white flex flex-col">
            <div className="h-10 flex items-center justify-between px-4 text-xs font-medium text-slate-500 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <TerminalSquare size={14} /> Output
              </div>
            </div>
            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto text-slate-700 whitespace-pre-wrap relative bg-slate-50">
              {!output && <span className="text-slate-400 italic">Run your code to see the output here...</span>}
              {output?.status === 'running' && <span className="text-slate-500">Running...</span>}
              {output?.verdict && (
                <div>
                  <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${output.verdict === 'passed' ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'}`}>
                    {output.verdict === 'passed' ? <CheckCircle2 size={16} /> : <X size={16} />} 
                    <span className="font-semibold">{output.verdict === 'passed' ? 'Tests Passed' : 'Tests Failed'}</span>
                  </div>
                  <div className="whitespace-pre-wrap mb-4">{output.text}</div>
                  
                  {/* Feature 2: Roast Button Trigger */}
                  {output.verdict === 'passed' && !roast && (
                    <button 
                      onClick={() => handleRoastCode(wsBlock.id)}
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors border border-slate-200 shadow-sm"
                    >
                      🎭 Roast My Code
                    </button>
                  )}
                  
                  {/* Feature 2: Roast Display */}
                  {roast && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2 text-orange-800 font-semibold mb-2 text-xs uppercase tracking-wider">
                        🎭 Senior Dev AI 
                        {roast.status === 'loading' && <span className="animate-pulse normal-case text-orange-600 font-normal">is typing...</span>}
                      </div>
                      <div className="text-orange-900 leading-relaxed font-sans text-[13px]">
                        {roast.text}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-screen w-full bg-white flex flex-col font-sans text-slate-800 overflow-hidden selection:bg-emerald-100">
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Chat Feed */}
        <section className="w-[450px] min-w-[400px] flex flex-col relative z-10 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
          
          {/* Top Breadcrumb Header */}
          <header className="h-14 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
                <Layout size={14} className="text-white" />
              </div>
              <div className="font-medium text-slate-500 tracking-tight flex items-center gap-1.5">
                <span className="hover:text-slate-800 cursor-pointer">{MOCK_COURSE_TITLE}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-800">{MOCK_LESSON_TITLE}</span>
              </div>
            </div>
            
            <button className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1.5 rounded text-xs font-medium hover:bg-emerald-100 transition-colors">
              <AudioLines size={14} /> <ChevronDown size={14} />
            </button>
          </header>

          {/* Scrollable Feed Area */}
          <div className="flex-1 overflow-y-auto px-8 py-8 scroll-smooth pb-32">
            {BLOCKS.map((block, index) => renderBlockInFeed(block, index))}
            
            {/* Minimal Continue Button */}
            {revealedIndex < BLOCKS.length - 1 && (
              <div className="pt-2 flex items-center gap-4 fade-in-up">
                <button
                  onClick={handleContinue}
                  disabled={!isContinueEnabled()}
                  className={`flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isContinueEnabled() 
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                      : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Continue <span className="bg-white/60 px-1.5 rounded font-mono text-xs">{revealedIndex + 1}</span>
                </button>
                <div className="flex gap-3 text-slate-400">
                  <Play size={16} className="cursor-pointer hover:text-emerald-600 transition-colors" />
                  <ThumbsDown size={16} className="cursor-pointer hover:text-red-500 transition-colors" />
                </div>
              </div>
            )}

            {/* Render Chat History in Feed */}
            {chatHistory.length > 0 && (
              <div className="mt-8 space-y-4 pt-6 border-t border-slate-100 fade-in-up">
                {chatHistory.map((chat, i) => (
                  <div key={i} className={`flex w-full ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-[14px] leading-relaxed font-sans ${
                      chat.role === 'user' 
                        ? 'bg-slate-800 text-white rounded-br-sm shadow-sm' 
                        : 'bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-bl-sm shadow-sm flex gap-3 items-start'
                    }`}>
                      {chat.role === 'ai' && <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
                      <div>{chat.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div ref={feedEndRef} />
          </div>

          {/* Ask Anything Footer */}
          <div className="p-6 bg-white border-t border-slate-50 shrink-0 z-20">
             <form onSubmit={handleAskQuestion} className="relative bg-slate-50 rounded-xl flex items-center border border-slate-200 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-50 transition-all shadow-sm">
               <input 
                 type="text" 
                 value={askInput}
                 onChange={(e) => setAskInput(e.target.value)}
                 placeholder="Ask or Comment ..."
                 className="w-full bg-transparent text-sm p-3.5 pr-10 focus:outline-none placeholder-slate-400 font-sans"
               />
               <button 
                 type="submit" 
                 disabled={!askInput.trim()}
                 className={`absolute right-3 p-1 rounded-md transition-colors ${askInput.trim() ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300'}`}
               >
                 <ArrowUp size={18} strokeWidth={2.5} />
               </button>
             </form>
          </div>
        </section>

        {/* Right Pane: Dynamic Workspace */}
        <section className="flex-1 bg-slate-50 flex flex-col relative z-0">
          {renderWorkspace()}
        </section>

        {/* Expandable Drawers (Progress / Notes) */}
        {activeSidebar && (
          <section className="w-[320px] bg-white border-l border-slate-100 shadow-sm flex flex-col relative z-20 animate-slide-left">
            <div className="h-14 border-b border-slate-100 flex items-center justify-between px-5 bg-white shrink-0">
              <span className="text-sm font-semibold text-slate-800 capitalize">
                {activeSidebar === 'progress' ? 'Course Progress' : 'Notes'}
              </span>
              <button onClick={() => setActiveSidebar(null)} className="text-slate-400 hover:text-slate-700">
                <XIcon size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-white p-5">
              {activeSidebar === 'progress' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <span className="font-semibold text-slate-800">{MOCK_COURSE_TITLE}</span>
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-xs font-bold">14%</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 tracking-wider mb-3 mt-4">MODULE 1</div>
                    {/* Mock Progress Tree */}
                    <div className="flex items-start gap-3 py-2 text-emerald-600 bg-emerald-50/50 -mx-3 px-3 rounded-lg cursor-pointer">
                      <div className="w-4 h-4 rounded-full border-4 border-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Summary Values</div>
                        <div className="text-xs mt-1 text-slate-500 font-normal">
                          <ul className="space-y-2 mt-2 ml-1">
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Setup</li>
                            <li className="flex items-center gap-2 text-emerald-600/50"><div className="w-1.5 h-1.5 rounded-full border border-emerald-500"/> MIN, MAX, AVG</li>
                            <li className="flex items-center gap-2 text-emerald-600/50"><div className="w-1.5 h-1.5 rounded-full border border-emerald-500"/> Summary</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-2 text-slate-500 cursor-pointer hover:text-slate-800">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                      <span className="text-sm">Data Transformation</span>
                    </div>
                    <div className="flex items-center gap-3 py-2 text-slate-500 cursor-pointer hover:text-slate-800">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                      <span className="text-sm">Data Filtering</span>
                    </div>
                  </div>
                </div>
              )}

              {activeSidebar === 'notes' && (
                <div className="space-y-4">
                  <div className="flex bg-slate-50 p-1 rounded-lg">
                    <button className="flex-1 py-1.5 bg-white rounded shadow-sm text-sm font-medium text-slate-800">Instructor Notes</button>
                    <button className="flex-1 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">My Notes</button>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed font-serif mt-4">
                    <h4 className="font-bold text-slate-800 mb-2 font-sans">Decorators Basics</h4>
                    <ul className="list-disc pl-4 space-y-2">
                      <li>A <strong>decorator</strong> modifies a function without changing its source code.</li>
                      <li>Uses the <code className="bg-slate-100 px-1 rounded text-emerald-600">@</code> symbol syntax.</li>
                      <li>Often used for logging, auth, and timing operations.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Far Right Nav Rail */}
        <section className="w-14 bg-white border-l border-slate-100 flex flex-col items-center py-4 justify-between shrink-0 z-30">
          <div className="flex flex-col gap-6 w-full">
            <button 
              onClick={() => setActiveSidebar(activeSidebar === 'progress' ? null : 'progress')}
              className={`flex flex-col items-center gap-1.5 w-full hover:bg-slate-50 py-2 transition-colors ${activeSidebar === 'progress' ? 'text-emerald-600' : 'text-slate-400'}`}
            >
              <div className="relative">
                <PieChart size={20} className={activeSidebar === 'progress' ? 'text-emerald-500' : ''} />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white"></div>
              </div>
              <span className="text-[10px] font-medium tracking-wide">14%</span>
            </button>

            <button 
              onClick={() => setActiveSidebar(activeSidebar === 'notes' ? null : 'notes')}
              className={`flex flex-col items-center gap-1.5 w-full hover:bg-slate-50 py-2 transition-colors ${activeSidebar === 'notes' ? 'text-emerald-600' : 'text-slate-400'}`}
            >
              <FileText size={20} className={activeSidebar === 'notes' ? 'text-emerald-500' : ''} />
              <span className="text-[10px] font-medium tracking-wide">Notes</span>
            </button>
          </div>

          <div className="flex flex-col gap-6 w-full">
            <button className="flex justify-center text-slate-400 hover:text-slate-600 transition-colors w-full py-2 hover:bg-slate-50">
              <Globe size={18} />
            </button>
            <button className="flex justify-center text-slate-400 hover:text-slate-600 transition-colors w-full py-2 hover:bg-slate-50">
              <Settings size={18} />
            </button>
          </div>
        </section>

      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

        @keyframes slideLeft {
          from { margin-right: -320px; opacity: 0; }
          to { margin-right: 0; opacity: 1; }
        }
        .animate-slide-left { animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* Custom scrollbars */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.15); }
      `}} />
    </div>
  );
}

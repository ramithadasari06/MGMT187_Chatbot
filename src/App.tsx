import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  GraduationCap, 
  FileText, 
  Info, 
  ChevronRight,
  Sparkles,
  RefreshCw,
  LayoutDashboard,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import { SYSTEM_PROMPT } from './constants';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your AI Course Assistant for MGMT 18700. How can I help you study or navigate the course today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'modules' | 'timeline' | 'project' | 'logistics'>('chat');
  const [tutorMode, setTutorMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (retryMessage?: string) => {
    if ((!input.trim() && !retryMessage) || isLoading) return;

    const userMessage = retryMessage || input.trim();
    let newMessages = messages;
    
    if (retryMessage) {
      // Remove the last assistant message (the error) if retrying
      if (messages[messages.length - 1].role === 'assistant') {
        newMessages = messages.slice(0, -1);
      }
    } else {
      newMessages = [...messages, { role: 'user', content: userMessage } as Message];
      setMessages(newMessages);
      setInput('');
    }
    
    setIsLoading(true);

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured. Please add it to the Secrets panel.");
      }

      const systemInstruction = tutorMode 
        ? SYSTEM_PROMPT + "\n\nACT IN TUTOR MODE: Focus on practice questions, explanations, and study strategies." 
        : SYSTEM_PROMPT;

      // Limit history to last 15 messages to save tokens and avoid quota issues
      const historyLimit = 15;
      const recentMessages = newMessages.slice(-historyLimit);

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: systemInstruction,
        },
        contents: [
          ...recentMessages.filter((m, idx) => !(idx === 0 && m.role === 'assistant' && newMessages.length > historyLimit)).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }]
          })),
          { role: "user", parts: [{ text: userMessage }] }
        ]
      });

      if (!result.text) throw new Error("No response from AI");

      setMessages([...newMessages, { role: 'assistant', content: result.text }]);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      let errorMessage = "I'm sorry, I encountered an error. ";
      
      const errorString = typeof error === 'string' ? error : (error.message || JSON.stringify(error));

      if (errorString.includes("API key not valid")) {
        errorMessage += "The API key appears to be invalid. Please check your configuration.";
      } else if (errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429")) {
        errorMessage += "The AI service is currently at its limit (Quota Exceeded). Please wait a moment before trying again, or check your API usage limits.";
      } else if (errorString.includes("Rpc failed") || errorString.includes("xhr error") || errorString.includes("code: 500")) {
        errorMessage += "There was a temporary connection issue with the AI service (RPC/XHR error). This is usually a transient server-side issue. Please wait a few seconds and try your request again.";
      } else {
        errorMessage += error.message || "Please try again later.";
      }

      setMessages([...newMessages, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const modules = [
    { id: 1, title: "History of AI", topics: ["Kernighan", "Turing", "ELIZA", "Deep Blue"] },
    { id: 2, title: "Data Foundations", topics: ["Titanic Dataset", "Structured Data", "Missing Data"] },
    { id: 3, title: "ML Applications", topics: ["Collaborative Filtering", "Classification", "Regression"] },
    { id: 4, title: "NLP & Language Models", topics: ["Transformers", "Embeddings", "RAG"] },
    { id: 5, title: "Digital Transformation", topics: ["Industry 4.0", "Change Management"] },
    { id: 6, title: "Risks & Limitations", topics: ["Bias", "Ethics", "Security"] },
  ];

  return (
    <div className="flex h-screen bg-[#F5F5F5] font-sans text-[#0065cc]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5E5E5] flex flex-col">
        <div className="p-6 border-bottom border-[#E5E5E5]">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#0065cc] p-1.5 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">AI Assistant</h1>
          </div>
          <p className="text-xs text-[#9E9E9E] font-medium uppercase tracking-wider">MGMT 18700</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
              activeTab === 'chat' ? "bg-[#0065cc] text-white shadow-lg" : "hover:bg-[#F0F0F0] text-[#4A4A4A]"
            )}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Chat Tutor</span>
          </button>
          <button 
            onClick={() => setActiveTab('modules')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
              activeTab === 'modules' ? "bg-[#0065cc] text-white shadow-lg" : "hover:bg-[#F0F0F0] text-[#4A4A4A]"
            )}
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Course Modules</span>
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
              activeTab === 'timeline' ? "bg-[#0065cc] text-white shadow-lg" : "hover:bg-[#F0F0F0] text-[#4A4A4A]"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Semester Timeline</span>
          </button>
          <button 
            onClick={() => setActiveTab('project')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
              activeTab === 'project' ? "bg-[#0065cc] text-white shadow-lg" : "hover:bg-[#F0F0F0] text-[#4A4A4A]"
            )}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Final Project</span>
          </button>
          <button 
            onClick={() => setActiveTab('logistics')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
              activeTab === 'logistics' ? "bg-[#0065cc] text-white shadow-lg" : "hover:bg-[#F0F0F0] text-[#4A4A4A]"
            )}
          >
            <Info className="w-5 h-5" />
            <span className="font-medium">Logistics</span>
          </button>
        </nav>

        <div className="p-4 border-t border-[#E5E5E5]">
          <div className="bg-[#F9F9F9] p-4 rounded-2xl border border-[#E5E5E5]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold">Tutor Mode</span>
              </div>
              <button 
                onClick={() => setTutorMode(!tutorMode)}
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative",
                  tutorMode ? "bg-amber-500" : "bg-[#D1D1D1]"
                )}
              >
                <motion.div 
                  animate={{ x: tutorMode ? 20 : 2 }}
                  className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full"
                />
              </button>
            </div>
            <p className="text-[11px] text-[#9E9E9E] leading-relaxed">
              Enables practice questions and personalized study guidance.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-[#0065cc]">
              {activeTab === 'chat' && "Intelligent Tutoring"}
              {activeTab === 'modules' && "Course Curriculum"}
              {activeTab === 'timeline' && "Semester Timeline"}
              {activeTab === 'project' && "AI Chatbot Project"}
              {activeTab === 'logistics' && "Course Information"}
            </h2>
            {tutorMode && activeTab === 'chat' && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-wider">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[#9E9E9E]">
            <HelpCircle className="w-5 h-5 cursor-pointer hover:text-[#0065cc] transition-colors" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto space-y-6 pb-24"
              >
                {messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : ""
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      msg.role === 'assistant' ? "bg-[#0065cc] text-white" : "bg-white border border-[#E5E5E5]"
                    )}>
                      {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-2xl shadow-sm relative group",
                      msg.role === 'assistant' ? "bg-white text-[#0065cc]" : "bg-[#0065cc] text-white"
                    )}>
                      <div className={cn(
                        "prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:mb-2 prose-headings:mt-4",
                        msg.role === 'user' ? "prose-invert" : ""
                      )}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkBreaks, remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {msg.role === 'assistant' && msg.content.includes("temporary connection issue") && (
                        <button 
                          onClick={() => {
                            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content;
                            if (lastUserMsg) handleSend(lastUserMsg);
                          }}
                          className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry Request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#0065cc] text-white flex items-center justify-center animate-pulse">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-1 items-center">
                      <div className="w-1.5 h-1.5 bg-[#D1D1D1] rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[#D1D1D1] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-[#D1D1D1] rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </motion.div>
            )}

            {activeTab === 'modules' && (
              <motion.div 
                key="modules"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {modules.map((m) => (
                  <div key={m.id} className="bg-white p-6 rounded-3xl border border-[#E5E5E5] hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Module 0{m.id}</span>
                      <ChevronRight className="w-4 h-4 text-[#D1D1D1] group-hover:text-[#0065cc] transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">{m.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {m.topics.map((t, i) => (
                        <span key={i} className="px-3 py-1 bg-[#F5F5F5] text-[#4A4A4A] text-xs rounded-full font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'timeline' && (
              <motion.div 
                key="timeline"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-4"
              >
                {[
                  { w: "1", d: "01/12", t: "Course Intro: What is AI?", l: "Lab 1: Hello World" },
                  { w: "2", d: "01/19", t: "History of AI, Different Types", l: "MLK Holiday - No Labs" },
                  { w: "3", d: "01/26", t: "Data Foundations: Structured/Unstructured", l: "Lab 2: EDA", due: "Lab 1 Due 01/30" },
                  { w: "4", d: "02/02", t: "Data Pipeline: Preprocessing", l: "Lab 3: Preprocessing", due: "Lab 2 Due 02/06" },
                  { w: "5", d: "02/09", t: "Data Pipeline: Data Engineering", l: "Lab 3: Preprocessing" },
                  { w: "6", d: "02/16", t: "Machine Learning, Types of ML", l: "Lab 4: Data Engineering", due: "Lab 3 Due 02/20" },
                  { w: "7", d: "02/23", t: "Applications for Supervised ML", l: "Lab 4: Data Engineering" },
                  { w: "8", d: "03/02", t: "Applications for Unsupervised ML", l: "Midterm Review", due: "Lab 4 Due 03/06" },
                  { w: "9", d: "03/09", t: "Applications for Reinforcement Learning", l: "Midterm Exam (20%)", due: "Midterm Exam" },
                  { w: "SB", d: "03/16", t: "Spring Break", l: "No Class" },
                  { w: "10", d: "03/23", t: "Intro to NLP", l: "Lab 5: AI-assisted market research" },
                  { w: "11", d: "03/30", t: "Applications for LLMs", l: "Lab 6: Chatbot Design", due: "Lab 5 Due 04/03" },
                  { w: "12", d: "04/06", t: "Communications and Change Management", l: "Lab 7: Chatbot Design" },
                  { w: "13", d: "04/13", t: "Industry 4.0, Business Processes", l: "Chatbot Demo (20%)", due: "Chatbot Demo" },
                  { w: "14", d: "04/20", t: "Risks and Limitations", l: "Chatbot Demo" },
                  { w: "15", d: "04/27", t: "Final Exam Review", l: "Final Exam (20%)", due: "Final Exam" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className="w-16 pt-1 flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest block">Week {item.w}</span>
                      <span className="text-xs text-[#4A4A4A]">{item.d}</span>
                    </div>
                    <div className="flex-1 bg-white p-4 rounded-2xl border border-[#E5E5E5] group-hover:border-[#0065cc] transition-colors shadow-sm text-left">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-sm mb-1">{item.t}</h4>
                          <p className="text-xs text-[#4A4A4A] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            {item.l}
                          </p>
                        </div>
                        {item.due && (
                          <span className="px-2 py-1 bg-red-50 text-red-600 text-[9px] font-bold rounded uppercase tracking-tighter border border-red-100">
                            {item.due}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'project' && (
              <motion.div 
                key="project"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="bg-[#0065cc] text-white p-10 rounded-[40px] relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-3xl font-bold mb-4">AI Chatbot Project</h3>
                    <p className="text-gray-400 max-w-xl leading-relaxed">
                      Build, evaluate, and critically assess AI chatbot systems using Dify.ai. 
                      Develop an intelligent assistant for MGMT 18700.
                    </p>
                  </div>
                  <Sparkles className="absolute -right-10 -top-10 w-64 h-64 text-white/5" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-3xl border border-[#E5E5E5]">
                    <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5" />
                      Grading Breakdown
                    </h4>
                    <div className="space-y-4">
                      {[
                        { label: "Chatbot Development", weight: "50%", due: "Week 12" },
                        { label: "Peer Project Assessment", weight: "30%", due: "Week 15" },
                        { label: "Peer Performance Eval", weight: "10%", due: "Week 15" },
                        { label: "Team Contribution", weight: "10%", due: "Week 15" },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5]">
                          <div>
                            <p className="text-sm font-bold">{item.label}</p>
                            <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wider">Due {item.due}</p>
                          </div>
                          <span className="text-lg font-black text-[#0065cc]">{item.weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-[#E5E5E5]">
                    <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      Performance Levels
                    </h4>
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Basic Level (Good)</p>
                        <p className="text-sm text-[#4A4A4A] leading-relaxed">
                          Accurately answer questions on logistics, content, assignments, and policies.
                        </p>
                      </div>
                      <div className="h-px bg-[#E5E5E5]" />
                      <div>
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">Advanced Level (Excellent)</p>
                        <p className="text-sm text-[#4A4A4A] leading-relaxed">
                          AI Tutor features: practice questions, personalized explanations, study strategies, and adaptive responses.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-[#E5E5E5]">
                  <h4 className="font-bold text-lg mb-6">Technical Requirements</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      "Public link (no authentication required)",
                      "Response time under 10 seconds",
                      "Handle conversational follow-ups",
                      "Graceful error handling for out-of-scope",
                    ].map((req, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="mt-1 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        </div>
                        <p className="text-sm text-[#4A4A4A]">{req}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-[#E5E5E5]">
                  <h4 className="font-bold text-lg mb-6">Presentation Logistics</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <p className="text-sm text-blue-800 font-medium">
                        Presentations take place in Weeks 13/14 during recitations. 
                        10-minute presentation + 5-minute Q&A.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest text-[#9E9E9E] mb-3">Requirements</h5>
                        <ul className="text-sm text-[#4A4A4A] space-y-2 list-disc pl-4">
                          <li>Overview of design (2 min)</li>
                          <li>Basic demo (3 min)</li>
                          <li>Advanced features demo (3 min)</li>
                          <li>Challenges & solutions (2 min)</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest text-[#9E9E9E] mb-3">Submissions</h5>
                        <ul className="text-sm text-[#4A4A4A] space-y-2 list-disc pl-4">
                          <li>Accessible Chatbot Link</li>
                          <li>Peer Assessment Report</li>
                          <li>Self-Assessment Report</li>
                          <li>Team Contribution Form</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'logistics' && (
              <motion.div 
                key="logistics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-[#E5E5E5]">
                    <GraduationCap className="w-8 h-8 mb-4 text-[#0065cc]" />
                    <h4 className="font-bold mb-2">Instructor</h4>
                    <p className="text-sm text-[#4A4A4A]">Dr. Cecilia Ying</p>
                    <p className="text-xs text-[#9E9E9E]">KRAN 534</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-[#E5E5E5]">
                    <RefreshCw className="w-8 h-8 mb-4 text-[#0065cc]" />
                    <h4 className="font-bold mb-2">Office Hours</h4>
                    <p className="text-sm text-[#4A4A4A]">Friday 2:30 PM</p>
                    <p className="text-xs text-[#9E9E9E]">3:30 PM (or by appt)</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-[#E5E5E5]">
                    <FileText className="w-8 h-8 mb-4 text-[#0065cc]" />
                    <h4 className="font-bold mb-2">Grading</h4>
                    <p className="text-sm text-[#4A4A4A]">Labs: 30%</p>
                    <p className="text-xs text-[#9E9E9E]">Exams: 40% Total</p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-[#E5E5E5]">
                  <h3 className="text-xl font-bold mb-6">Course Schedule</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-[#9E9E9E]">Lectures</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5]">
                          <p className="text-xs font-bold text-[#0065cc]">Section 1 (34749)</p>
                          <p className="text-sm text-[#4A4A4A]">Friday 1:30 PM – 2:20 PM</p>
                          <p className="text-xs text-[#9E9E9E]">ME 1061</p>
                        </div>
                        <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5]">
                          <p className="text-xs font-bold text-[#0065cc]">Section 6 (34911)</p>
                          <p className="text-sm text-[#4A4A4A]">Wed 12:30 PM – 1:20 PM</p>
                          <p className="text-xs text-[#9E9E9E]">WTHR 172</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-[#9E9E9E]">Recitations</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { s: "2", t: "Fri 9:30 AM", l: "KRAN 250", ta: "Hari, Akshat" },
                          { s: "3", t: "Fri 11:30 AM", l: "RAWLS 4082", ta: "Baishali, Akshat" },
                          { s: "4", t: "Wed 1:30 PM", l: "RAWLS 4082", ta: "Ruchira, Baishali" },
                          { s: "5", t: "Fri 10:30 AM", l: "KRAN 250", ta: "Hari" },
                          { s: "7", t: "Mon 10:30 AM", l: "KRAN 250", ta: "Orion, Shriya" },
                          { s: "8", t: "Mon 1:30 PM", l: "RAWLS 4082", ta: "Ruchira, Baishali" },
                          { s: "9", t: "Mon 9:30 AM", l: "KRAN 250", ta: "Orion" },
                          { s: "10", t: "Mon 11:30 AM", l: "KRAN 250", ta: "Orion, Shriya" },
                        ].map((r, i) => (
                          <div key={i} className="p-2.5 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5]">
                            <p className="text-[10px] font-bold text-[#0065cc]">Sec {r.s}</p>
                            <p className="text-[11px] text-[#4A4A4A]">{r.t}</p>
                            <p className="text-[10px] text-[#9E9E9E]">{r.l}</p>
                            <p className="text-[9px] text-[#9E9E9E] italic mt-1">TA: {r.ta}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-[#E5E5E5]">
                  <h3 className="text-xl font-bold mb-6">How to Get Help</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[#0065cc] font-bold text-xs">1</div>
                        <p className="text-sm text-[#4A4A4A]">Try googling it.</p>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[#0065cc] font-bold text-xs">2</div>
                        <p className="text-sm text-[#4A4A4A]">Check in with your lab buddy/classmates.</p>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[#0065cc] font-bold text-xs">3</div>
                        <p className="text-sm text-[#4A4A4A]">Post your questions on the Brightspace discussion board.</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[#0065cc] font-bold text-xs">4</div>
                        <p className="text-sm text-[#4A4A4A]">Check with your TA during recitation.</p>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[#0065cc] font-bold text-xs">5</div>
                        <p className="text-sm text-[#4A4A4A]">Come to office hours (Friday 2:30 PM – 3:30 PM).</p>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[#0065cc] font-bold text-xs">6</div>
                        <p className="text-sm text-[#4A4A4A]">Send an email to MGMT187@purdue.edu.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-[#E5E5E5]">
                  <h3 className="text-xl font-bold mb-6">Course Policies</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-sm mb-2 uppercase tracking-wider text-[#9E9E9E]">Regrade Policy</h4>
                      <p className="text-sm text-[#4A4A4A] leading-relaxed">
                        There is a 72-hour cool-down period after grades are released. After this, you must submit a detailed explanation justifying how your work meets the rubric.
                      </p>
                    </div>
                    <div className="h-px bg-[#E5E5E5]" />
                    <div>
                      <h4 className="font-bold text-sm mb-2 uppercase tracking-wider text-[#9E9E9E]">AI Guidelines</h4>
                      <p className="text-sm text-[#4A4A4A] leading-relaxed">
                        The use of AI tools is not only permitted but strongly encouraged. Focus on cultivating critical thinking to evaluate AI outputs.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        {activeTab === 'chat' && (
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#F5F5F5] via-[#F5F5F5] to-transparent">
            <div className="max-w-3xl mx-auto relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={tutorMode ? "Ask for practice questions or study help..." : "Ask about course content or logistics..."}
                className="w-full bg-white border border-[#E5E5E5] rounded-2xl py-4 pl-6 pr-14 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0065cc]/10 focus:border-[#0065cc] transition-all"
              />
              <button 
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#0065cc] text-white rounded-xl hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-center mt-3 text-[#9E9E9E] font-medium uppercase tracking-widest">
              AI Course Assistant • MGMT 18700
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

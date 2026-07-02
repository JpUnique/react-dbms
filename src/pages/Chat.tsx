import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { chatService, ChatSession, ChatMessage, ChunkSource } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Plus, Trash2, Send, Loader2, Bot, User,
  FileText, ChevronDown, ChevronUp, Sparkles, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Source citations ──────────────────────────────────────────────────────────

const SourceCard: React.FC<{ source: ChunkSource; index: number }> = ({ source, index }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border bg-muted/30 text-xs overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
          {index + 1}
        </Badge>
        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate font-medium">{source.document_title}</span>
        <span className="text-muted-foreground shrink-0">
          {Math.round(source.similarity * 100)}% match
        </span>
        {open ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t bg-muted/20">
          <p className="text-muted-foreground leading-relaxed line-clamp-6">{source.content}</p>
          <Link
            to={`/documents/${source.document_id}`}
            className="inline-flex items-center gap-1 mt-2 text-primary hover:underline font-medium"
          >
            <FileText className="h-3 w-3" /> View document
          </Link>
        </div>
      )}
    </div>
  );
};

// ── Individual message bubble ─────────────────────────────────────────────────

const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  const sources: ChunkSource[] = msg.sources ?? [];

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white'
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn('flex flex-col gap-2 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* Bubble */}
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-card border shadow-sm rounded-tl-sm'
        )}>
          {msg.content}
        </div>

        {/* Sources */}
        {!isUser && sources.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-[11px] text-muted-foreground font-medium px-1 uppercase tracking-wide">
              Sources used
            </p>
            {sources.map((s, i) => (
              <SourceCard key={s.chunk_id} source={s} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Streaming "thinking" placeholder ─────────────────────────────────────────

const ThinkingBubble: React.FC = () => (
  <div className="flex gap-3">
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
      <Bot className="h-4 w-4 text-white" />
    </div>
    <div className="bg-card border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Searching documents and thinking…</span>
    </div>
  </div>
);

// ── Session list item ─────────────────────────────────────────────────────────

const SessionItem: React.FC<{
  session: ChatSession;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ session, active, onSelect, onDelete }) => (
  <div
    className={cn(
      'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
      active ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
    )}
    onClick={onSelect}
  >
    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
    <span className="flex-1 text-xs truncate font-medium">{session.title}</span>
    <button
      type="button"
      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all"
      onClick={e => { e.stopPropagation(); onDelete(); }}
      aria-label="Delete session"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  </div>
);

// ── Main Chat page ────────────────────────────────────────────────────────────

const Chat: React.FC = () => {
  const [sessions, setSessions]         = useState<ChatSession[]>([]);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [input, setInput]               = useState('');
  const [isAsking, setIsAsking]         = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions on mount
  useEffect(() => {
    chatService.listSessions()
      .then(setSessions)
      .catch(() => setError('Failed to load chat history.'))
      .finally(() => setLoadingSessions(false));
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setLoadingMessages(true);
    chatService.getSession(activeId)
      .then(({ messages: msgs }) => setMessages(msgs))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoadingMessages(false));
  }, [activeId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAsking]);

  // Auto-grow textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const selectSession = useCallback((id: string) => setActiveId(id), []);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await chatService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
    } catch {
      toast.error('Failed to delete session');
    }
  }, [activeId]);

  const newChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setInput('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isAsking) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsAsking(true);
    setError(null);

    // Optimistically show user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: activeId ?? '',
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const result = await chatService.ask(question, activeId ?? undefined);

      // Update session id if this was a new chat
      if (!activeId) {
        setActiveId(result.session_id);
        // Refresh sessions list to show new session
        const updated = await chatService.listSessions();
        setSessions(updated);
      }

      // Add assistant reply with sources
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        session_id: result.session_id,
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      // Remove the optimistic user message on failure
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setInput(question); // restore input
    } finally {
      setIsAsking(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [input, isAsking, activeId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ── Sessions sidebar ── */}
        <aside className="w-56 shrink-0 border-r flex flex-col bg-muted/20">
          <div className="p-3 border-b">
            <Button size="sm" className="w-full gap-2" onClick={newChat}>
              <Plus className="h-3.5 w-3.5" /> New Chat
            </Button>
          </div>

          <ScrollArea className="flex-1 p-2">
            {loadingSessions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-2">
                No conversations yet. Ask your first question!
              </p>
            ) : (
              <div className="space-y-0.5">
                {sessions.map(s => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    active={s.id === activeId}
                    onSelect={() => selectSession(s.id)}
                    onDelete={() => deleteSession(s.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="border-b px-6 py-3 flex items-center gap-3 bg-card/60 backdrop-blur-sm shrink-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Document AI</h1>
              <p className="text-xs text-muted-foreground">Ask questions about your documents</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-6">
            {loadingMessages ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {isAsking && <ThinkingBubble />}
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-4 bg-card/60 backdrop-blur-sm shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-end gap-2 rounded-xl border bg-background shadow-sm px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground leading-relaxed max-h-40"
                  placeholder="Ask anything about your documents… (Enter to send, Shift+Enter for newline)"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isAsking}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={sendMessage}
                  disabled={!input.trim() || isAsking}
                  aria-label="Send message"
                >
                  {isAsking
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                AI answers are grounded in your uploaded documents. Always verify important information.
              </p>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

// ── Empty state shown before first message ────────────────────────────────────

const SUGGESTIONS = [
  'Summarize the key points from my documents',
  'What risks are mentioned across all reports?',
  'Compare the plans uploaded this week',
  'What are the main findings in the latest report?',
];

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full py-16 gap-6 max-w-lg mx-auto text-center">
    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg">
      <Sparkles className="h-8 w-8 text-white" />
    </div>
    <div>
      <h2 className="text-lg font-semibold">Ask your documents anything</h2>
      <p className="text-sm text-muted-foreground mt-1">
        I'll search through your uploaded documents and give you answers with source citations.
      </p>
    </div>
    <div className="grid grid-cols-1 gap-2 w-full">
      {SUGGESTIONS.map(s => (
        <div key={s} className="px-4 py-3 rounded-lg border bg-muted/30 text-sm text-left text-muted-foreground hover:bg-muted/60 cursor-default transition-colors">
          "{s}"
        </div>
      ))}
    </div>
  </div>
);

export default Chat;

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Bot, BriefcaseBusiness,
  Check, CheckCheck, ChevronDown, CircleHelp, Clock3, Command, Download, Eye,
  FileClock, Gauge, Inbox, LayoutDashboard, LoaderCircle, LockKeyhole,
  LogOut, Menu, MessageSquareText, MoreHorizontal, Plus, Search, Send, Settings2,
  ShieldCheck, Sparkles, Target, Users, X, Zap,
} from 'lucide-react';

type User = { id: string; name: string; email: string; role: string };
type Lead = {
  id: string; name?: string; email?: string; phone?: string; company?: string;
  source?: string; status?: string; qualificationScore?: number; tags?: string[];
  assignedTo?: string; productInterest?: string; nextAction?: string; optedOut?: boolean;
};
type RecordItem = Record<string, unknown> & { id?: string; _id?: string; status?: string; name?: string; title?: string };
type Metrics = {
  leadsCreated: number; qualifiedLeads: number; followupsPending: number;
  followupsCompleted: number; conversationsHandled: number; conversionRate: number;
  byStatus?: Record<string, number>; bySource?: Record<string, number>;
};
type Section = 'Overview' | 'Lead intelligence' | 'Follow-ups' | 'Conversations' | 'Approvals' | 'AI memory' | 'Analytics' | 'Activity log' | 'Settings';

const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Lead intelligence', icon: Target },
  { label: 'Follow-ups', icon: Clock3 },
  { label: 'Conversations', icon: MessageSquareText },
  { label: 'Approvals', icon: ShieldCheck },
  { label: 'AI memory', icon: Sparkles },
  { label: 'Analytics', icon: Gauge },
  { label: 'Activity log', icon: FileClock },
  { label: 'Settings', icon: Settings2 },
];

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload as T;
}

const readable = (value: unknown) => typeof value === 'string' ? value.replaceAll('_', ' ') : '';
const cap = (value: unknown) => readable(value).replace(/\b\w/g, (char) => char.toUpperCase());

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [section, setSection] = useState<Section>('Overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [approvals, setApprovals] = useState<RecordItem[]>([]);
  const [followups, setFollowups] = useState<RecordItem[]>([]);
  const [memory, setMemory] = useState<RecordItem[]>([]);
  const [activity, setActivity] = useState<RecordItem[]>([]);
  const [agentStatus, setAgentStatus] = useState('checking');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [qualification, setQualification] = useState<{ lead: string; result: RecordItem } | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError('');
    const canReview = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
    const results = await Promise.allSettled([
      api<{ leads: Lead[] }>('/api/leads'),
      api<{ metrics: Metrics }>('/api/analytics?days=30'),
      api<{ approvals: RecordItem[] }>('/api/ai/approvals'),
      api<{ followups: RecordItem[] }>('/api/followups'),
      canReview ? api<{ memory: RecordItem[] }>('/api/ai/memory') : Promise.resolve({ memory: [] }),
      canReview ? api<{ activity: RecordItem[] }>('/api/ai/activity') : Promise.resolve({ activity: [] }),
      api<{ agent: { status: string } }>('/api/ai/status'),
    ]);
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') setError((failure.reason as Error).message);
    const value = <T,>(index: number): T | undefined => results[index].status === 'fulfilled' ? results[index].value as T : undefined;
    setLeads(value<{ leads: Lead[] }>(0)?.leads || []);
    setMetrics(value<{ metrics: Metrics }>(1)?.metrics || null);
    setApprovals(value<{ approvals: RecordItem[] }>(2)?.approvals || []);
    setFollowups(value<{ followups: RecordItem[] }>(3)?.followups || []);
    setMemory(value<{ memory: RecordItem[] }>(4)?.memory || []);
    setActivity(value<{ activity: RecordItem[] }>(5)?.activity || []);
    setAgentStatus(value<{ agent: { status: string } }>(6)?.agent.status || 'unavailable');
  }, [user]);

  useEffect(() => {
    api<{ user: User }>('/api/auth/session').then((data) => setUser(data.user)).catch(() => setUser(null)).finally(() => setAuthLoading(false));
  }, []);
  useEffect(() => { if (user) void refresh(); }, [user, refresh]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      const result = await api<{ user: User }>('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email: loginEmail, password: loginPassword }) });
      setUser(result.user);
      window.history.replaceState({}, '', '/ai-agent');
    } catch (err) {
      setLoginError((err as Error).message);
    } finally { setLoginBusy(false); }
  };

  const logout = async () => {
    try { await api('/api/auth/session', { method: 'DELETE' }); } catch (err) { setError((err as Error).message); }
    setUser(null);
    window.history.replaceState({}, '', '/admin/login');
  };

  const runPrompt = async (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    setBusy(true); setAnswer(''); setError('');
    try {
      const result = await api<{ answer: string; result?: unknown }>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: prompt }) });
      setAnswer(result.answer || JSON.stringify(result.result || {}, null, 2));
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const decideApproval = async (item: RecordItem, decision: 'approved' | 'rejected' | 'edited', message?: string) => {
    try {
      await api(`/api/ai/approvals/${item.id || item._id}`, { method: 'PATCH', body: JSON.stringify({ decision, ...(message ? { message } : {}) }) });
      setNotice(decision === 'edited' ? 'Draft updated and returned to the approval queue.' : `Approval ${decision}. No message was sent.`);
      await refresh();
    } catch (err) { setError((err as Error).message); }
  };

  const qualifyLead = async (lead: Lead) => {
    try {
      const result = await api<{ result: RecordItem }>(`/api/leads/${lead.id}/qualification`, { method: 'POST', body: JSON.stringify({}) });
      setQualification({ lead: lead.name || 'Selected lead', result: result.result });
      await refresh();
    } catch (err) { setError((err as Error).message); }
  };

  const saveLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(form);
    if (editingLead) data.optedOut = form.has('optedOut');
    try {
      await api(editingLead?.id ? `/api/leads/${editingLead.id}` : '/api/leads', { method: editingLead?.id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
      setShowLeadForm(false); setEditingLead(null); setNotice(editingLead ? 'Lead updated.' : 'Lead saved.'); await refresh();
    } catch (err) { setError((err as Error).message); }
  };

  const scheduleFollowup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api('/api/followups', { method: 'POST', body: JSON.stringify({ ...data, dueAt: new Date(String(data.dueAt)).toISOString() }) });
      setShowFollowupForm(false); setNotice('Follow-up scheduled.'); await refresh();
    } catch (err) { setError((err as Error).message); }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api('/api/ai/settings', { method: 'PATCH', body: JSON.stringify({ paused: data.paused === 'on', automation: { enabled: data.automation === 'on', workflows: [] } }) });
      setNotice('Agent settings saved.'); await refresh();
    } catch (err) { setError((err as Error).message); }
  };

  if (authLoading) return <div className="boot-screen"><LoaderCircle className="spin" /><span>Securing workspace</span></div>;
  if (!user) return <main className="login-screen">
    <div className="login-visual"><div className="grid-glow" /><div className="login-brand"><span className="brand-mark"><Activity size={22} /></span><span>PLAYBEAT<span className="brand-light"> DIGITAL</span></span></div>
      <div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" /><div className="login-signal"><Activity size={152} strokeWidth={0.8} /></div>
      <div className="login-copy"><div className="eyebrow"><span className="live-dot" /> LEAD INTELLIGENCE PLATFORM</div><h1>Every lead.<br /><span>In focus.</span></h1><p>One secure command center for better conversations, sharper follow-ups and decisions that stay human.</p></div>
      <div className="visual-foot"><span>PLAYBEAT LEAD PULSE</span><span>01 — INTELLIGENCE / 03</span></div>
    </div>
    <section className="login-panel"><div className="login-card"><div className="mobile-brand"><span className="brand-mark"><Activity size={20} /></span> PLAYBEAT DIGITAL</div><div className="eyebrow muted">SECURE ACCESS</div><h2>Welcome back</h2><p className="subtle">Sign in to your Lead Pulse workspace.</p>
      <form onSubmit={login} className="login-form"><label htmlFor="email">Work email</label><div className="input-wrap"><span>@</span><input id="email" type="email" autoComplete="username" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@company.com" required /></div>
      <label htmlFor="password">Password</label><div className="input-wrap"><LockKeyhole size={16} /><input id="password" type="password" autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter your password" required /></div>
      {loginError && <div className="alert-inline">{loginError}</div>}<button className="primary-button login-submit" disabled={loginBusy}>{loginBusy ? <LoaderCircle className="spin" size={17} /> : <>Sign in securely <ArrowRight size={17} /></>}</button></form>
      <div className="login-security"><ShieldCheck size={15} /><span>Protected workspace</span><i /> <span>Encrypted session</span></div><div className="login-help"><CircleHelp size={14} /> Need access? Contact your workspace administrator.</div></div>
      <div className="login-copyright">© {new Date().getFullYear()} PLAYBEAT DIGITAL <span>·</span> LEAD PULSE</div></section>
  </main>;

  const filteredLeads = leads.filter((lead) => `${lead.name || ''} ${lead.email || ''} ${lead.company || ''} ${lead.phone || ''}`.toLowerCase().includes(search.toLowerCase()));
  const nav = <><div className="side-brand"><span className="brand-mark"><Activity size={19} /></span><span>PLAYBEAT<span className="brand-light"> DIGITAL</span><small>LEAD PULSE</small></span><button className="sidebar-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
    <div className="workspace-label">WORKSPACE <ChevronDown size={13} /></div>
    <nav>{navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setSection(label); setMobileOpen(false); }} className={`nav-link ${section === label ? 'selected' : ''}`}><Icon size={17} /><span>{label}</span>{label === 'Approvals' && approvals.length > 0 && <b className="nav-count">{approvals.length}</b>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="agent-mini"><div className={`status-orb ${agentStatus}`}><Bot size={17} /></div><div><b>Lead Pulse AI</b><span><i className={`live-dot ${agentStatus}`} /> {cap(agentStatus)}</span></div><button onClick={() => setSection('Settings')} aria-label="Agent settings"><MoreHorizontal size={17} /></button></div>
      <div className="profile-row"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="profile-info"><b>{user.name}</b><span>{cap(user.role)}</span></div><button aria-label="Sign out" onClick={logout}><LogOut size={16} /></button></div></div></>;

  return <div className="app-shell"><aside className={`sidebar ${mobileOpen ? 'opened' : ''}`}>{nav}</aside>{mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <main className="main-area"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="breadcrumb">Workspace <span>/</span> <b>{section}</b></div><div className="topbar-actions"><div className="global-search"><Search size={16} /><input placeholder="Search leads, conversations..." value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>⌘ K</kbd></div><button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /><i /></button><div className="top-divider" /><button className="help-button" aria-label="Help"><CircleHelp size={17} /></button></div></header>
      <div className="content-area"><div className="page-heading"><div><div className="eyebrow muted">PLAYBEAT LEAD PULSE <span className="heading-dot">/</span> WORKSPACE</div><h1>{section === 'Overview' ? 'Command center' : section}</h1><p>{section === 'Overview' ? 'Your leads, priorities and AI activity — at a glance.' : descriptions[section]}</p></div><div className="heading-actions">{section === 'Lead intelligence' && <><button className="secondary-button" onClick={() => document.getElementById('csv-upload')?.click()}><Download size={16} /> Import CSV</button><input id="csv-upload" type="file" accept=".csv,text/csv" hidden onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { await api('/api/leads/import', { method: 'POST', body: JSON.stringify({ csv: await file.text() }) }); setNotice('CSV import complete.'); await refresh(); } catch (err) { setError((err as Error).message); } }} /><button className="primary-button" onClick={() => setShowLeadForm(true)}><Plus size={16} /> Add lead</button></>}</div></div>
        {error && <div className="notice error-notice"><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}
        {notice && <div className="notice success-notice"><Check size={16} />{notice}<button onClick={() => setNotice('')}><X size={16} /></button></div>}
        {section === 'Overview' && <Overview metrics={metrics} leads={leads} approvals={approvals} followups={followups} status={agentStatus} prompt={prompt} setPrompt={setPrompt} answer={answer} busy={busy} runPrompt={runPrompt} setSection={setSection} />}
        {section === 'Lead intelligence' && <LeadView leads={filteredLeads} search={search} setSearch={setSearch} openForm={() => setShowLeadForm(true)} onEdit={(lead) => { setEditingLead(lead); setShowLeadForm(true); }} onQualify={qualifyLead} qualification={qualification} setQualification={setQualification} />}
        {section === 'Follow-ups' && <FollowupView items={followups} onAdd={() => setShowFollowupForm(true)} onComplete={async (item) => { try { await api(`/api/followups/${item.id || item._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'complete' }) }); setNotice('Follow-up completed.'); await refresh(); } catch (err) { setError((err as Error).message); } }} />}
        {section === 'Conversations' && <ConversationView leads={leads} />}
        {section === 'Approvals' && <ApprovalView items={approvals} onDecision={decideApproval} />}
        {section === 'AI memory' && <MemoryView items={memory} />}
        {section === 'Analytics' && <AnalyticsView metrics={metrics} />}
        {section === 'Activity log' && <ActivityView items={activity} />}
        {section === 'Settings' && <SettingsView user={user} save={saveSettings} />}
      </div><footer className="app-footer"><span>PLAYBEAT LEAD PULSE <i /> SECURE WORKSPACE</span><span>AI suggestions are not facts. Human review required for outbound actions.</span></footer>
    </main>
    {showLeadForm && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) { setShowLeadForm(false); setEditingLead(null); } }}><form className="lead-modal" onSubmit={saveLead}><div className="modal-heading"><div><span className="eyebrow muted">LEAD INTELLIGENCE</span><h2>{editingLead ? 'Edit lead' : 'Add a lead'}</h2></div><button type="button" className="icon-button" onClick={() => { setShowLeadForm(false); setEditingLead(null); }}><X size={18} /></button></div><div className="form-grid"><label>Full name<input name="name" required maxLength={160} defaultValue={editingLead?.name || ''} /></label><label>Email<input name="email" type="email" defaultValue={editingLead?.email || ''} /></label><label>Phone<input name="phone" type="tel" defaultValue={editingLead?.phone || ''} /></label><label>Company<input name="company" defaultValue={editingLead?.company || ''} /></label><label>Source<input name="source" placeholder="Website, referral..." defaultValue={editingLead?.source || ''} /></label><label>Product interest<input name="productInterest" defaultValue={editingLead?.productInterest || ''} /></label>{editingLead && <><label>Status<select name="status" defaultValue={editingLead.status || 'new'}>{['new','first_contact','no_response','interested','qualified','proposal_sent','negotiation','won','lost','reengagement'].map((status) => <option key={status} value={status}>{cap(status)}</option>)}</select></label><label>Next action<input name="nextAction" defaultValue={editingLead.nextAction || ''} /></label><label className="form-check-label">Opted out of contact<input name="optedOut" type="checkbox" value="true" defaultChecked={editingLead.optedOut === true} /></label></>}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setShowLeadForm(false); setEditingLead(null); }}>Cancel</button><button className="primary-button"><Plus size={16} /> {editingLead ? 'Save changes' : 'Save lead'}</button></div></form></div>}
    {showFollowupForm && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowFollowupForm(false); }}><form className="lead-modal" onSubmit={scheduleFollowup}><div className="modal-heading"><div><span className="eyebrow muted">FOLLOW-UP ENGINE</span><h2>Schedule a follow-up</h2></div><button type="button" className="icon-button" onClick={() => setShowFollowupForm(false)}><X size={18} /></button></div><div className="form-grid"><label>Lead<select name="leadId" required defaultValue=""><option value="" disabled>Select a lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name || lead.email || lead.id}</option>)}</select></label><label>Due date and time<input type="datetime-local" name="dueAt" required min={new Date().toISOString().slice(0, 16)} /></label><label className="wide-field">Task title<input name="title" required maxLength={200} placeholder="e.g. Follow up on product enquiry" /></label><label className="wide-field">Notes (optional)<textarea name="notes" rows={3} maxLength={2000} /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowFollowupForm(false)}>Cancel</button><button className="primary-button"><Clock3 size={15} /> Schedule</button></div></form></div>}
  </div>;
}

const descriptions: Record<Section, string> = {
  Overview: 'Your leads, priorities and AI activity — at a glance.',
  'Lead intelligence': 'Review verified lead data, qualification context and next steps.',
  'Follow-ups': 'Work the follow-up queue with clear ownership and timing.',
  Conversations: 'Customer context and communication drafts in one place.',
  Approvals: 'Review AI-drafted actions before any customer communication.',
  'AI memory': 'Inspect and manage the structured information retained for leads.',
  Analytics: 'Measure funnel movement and team follow-through from recorded data.',
  'Activity log': 'A traceable record of CRM and AI-assisted actions.',
  Settings: 'Manage AI behavior and workspace access settings.',
};

function MetricCard({ label, value, meta, icon: Icon, trend }: { label: string; value: string | number; meta: string; icon: typeof Users; trend?: 'up' | 'down' }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-meta">{trend && <span className={`trend ${trend}`}><ArrowUpRight size={13} /></span>}{meta}</div></article>;
}

function Overview({ metrics, leads, approvals, followups, status, prompt, setPrompt, answer, busy, runPrompt, setSection }: {
  metrics: Metrics | null; leads: Lead[]; approvals: RecordItem[]; followups: RecordItem[]; status: string;
  prompt: string; setPrompt: (value: string) => void; answer: string; busy: boolean;
  runPrompt: (event: FormEvent) => void; setSection: (section: Section) => void;
}) {
  const count = metrics?.leadsCreated ?? leads.length;
  const showData = metrics !== null;
  return <><div className="agent-banner"><div className="agent-banner-icon"><Bot size={23} /></div><div className="agent-banner-copy"><div><span className="eyebrow">AI COMMAND CENTER</span><span className={`status-pill ${status}`}><i className="live-dot" /> {cap(status)}</span></div><h2>Your intelligence, in motion.</h2><p>{status === 'online' ? 'AI service is connected. CRM actions remain under human control.' : status === 'paused' ? 'The AI agent is paused. Your CRM remains available.' : 'AI service is unavailable. Manual CRM workflows are ready.'}</p></div><div className="banner-stats"><div><b>{leads.length}</b><span>Leads visible</span></div><div><b>{approvals.length}</b><span>Awaiting review</span></div><div><b>{followups.length}</b><span>Follow-ups</span></div></div></div>
    {!showData && <div className="notice error-notice"><span>Live metrics unavailable. Check database and service configuration; no sample CRM data is displayed.</span></div>}
    <div className="metrics-grid"><MetricCard label="Leads created · 30d" value={count} meta="Recorded in CRM" icon={Users} /><MetricCard label="Qualified leads" value={metrics?.qualifiedLeads ?? '—'} meta="Rule-based classification" icon={Target} /><MetricCard label="Follow-ups pending" value={metrics?.followupsPending ?? '—'} meta="Require attention" icon={Clock3} /><MetricCard label="Conversion rate" value={metrics ? `${metrics.conversionRate}%` : '—'} meta="Won / created leads" icon={Zap} /></div>
    <div className="workspace-grid"><section className="panel command-panel"><div className="panel-heading"><div><span className="eyebrow muted">AI ASSISTANT</span><h3>Ask your lead intelligence</h3></div><span className="panel-badge"><Sparkles size={13} /> STRUCTURED TOOLS</span></div><p className="panel-description">Ask about recorded CRM data. AI suggestions never modify records or send messages.</p><form className="command-form" onSubmit={runPrompt}><textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask about your leads, activity, or follow-up priorities..." maxLength={4000} /><div className="command-bottom"><span><Command size={13} /> Try: “Show today's new leads”</span><button className="primary-button" disabled={busy || !prompt.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : <>Ask AI <Send size={15} /></>}</button></div></form>{answer && <div className="ai-answer"><span><Sparkles size={14} /> RESPONSE</span><p>{answer}</p></div>}<div className="suggested-prompts">{['Which leads need follow-up?', 'Show qualified leads', 'Summarize recent activity'].map((text) => <button key={text} onClick={() => setPrompt(text)}>{text}<ArrowRight size={13} /></button>)}</div></section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow muted">PRIORITIES</span><h3>Needs your attention</h3></div><button className="text-link" onClick={() => setSection('Approvals')}>View queue <ArrowRight size={14} /></button></div><div className="priority-list"><button onClick={() => setSection('Approvals')}><span className="priority-icon amber"><ShieldCheck size={16} /></span><span><b>Pending approvals</b><small>Outbound drafts waiting for human review</small></span><strong>{approvals.length}</strong></button><button onClick={() => setSection('Follow-ups')}><span className="priority-icon blue"><Clock3 size={16} /></span><span><b>Follow-ups due</b><small>Scheduled tasks to review</small></span><strong>{followups.filter((item) => item.status === 'pending').length}</strong></button><button onClick={() => setSection('Lead intelligence')}><span className="priority-icon green"><Inbox size={16} /></span><span><b>Unassigned leads</b><small>Recorded leads without an owner</small></span><strong>{leads.filter((lead) => !lead.assignedTo).length}</strong></button></div></section></div>
    <div className="lower-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow muted">LEAD INTELLIGENCE</span><h3>Recently updated</h3></div><button className="text-link" onClick={() => setSection('Lead intelligence')}>All leads <ArrowRight size={14} /></button></div><LeadTable leads={leads.slice(0, 5)} compact /></section>
      <section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow muted">SYSTEM</span><h3>Agent status</h3></div><Activity size={17} className="subtle-icon" /></div><div className="status-detail"><span className={`status-orb large ${status}`}><Bot size={20} /></span><div><b>PlayBeat Lead Pulse AI</b><span className="subtle-text">Service: {cap(status)}</span></div></div><div className="detail-row"><span>AI suggestions</span><span>{status === 'online' ? 'Available' : 'Unavailable'}</span></div><div className="detail-row"><span>Outbound automation</span><span className="pill-muted">Human approval</span></div><div className="detail-row"><span>Conversations handled</span><span>{metrics?.conversationsHandled ?? '—'}</span></div></section></div>
  </>;
}

function LeadTable({ leads, compact = false, onQualify, onEdit }: { leads: Lead[]; compact?: boolean; onQualify?: (lead: Lead) => void; onEdit?: (lead: Lead) => void }) {
  if (!leads.length) return <div className="empty-state"><span className="empty-icon"><Users size={19} /></span><b>No lead records yet</b><span>When CRM records exist, they will appear here. No sample leads are shown.</span></div>;
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>LEAD</th><th>COMPANY</th><th>STATUS</th><th>SCORE</th>{!compact && <th>SOURCE</th>}<th>NEXT ACTION</th>{(onQualify || onEdit) && <th>ACTION</th>}</tr></thead><tbody>{leads.map((lead, index) => <tr key={lead.id || lead.email || index}><td><div className="lead-cell"><span className={`avatar avatar-${index % 5}`}>{(lead.name || '?').slice(0, 1).toUpperCase()}</span><span><b>{lead.name || 'Name not provided'}</b><small>{lead.email || lead.phone || 'Contact not provided'}</small></span></div></td><td>{lead.company || '—'}</td><td><span className={`lead-status ${readable(lead.status)}`}>{cap(lead.status || 'new')}</span></td><td>{typeof lead.qualificationScore === 'number' ? `${lead.qualificationScore}%` : '—'}</td>{!compact && <td>{lead.source || '—'}</td>}<td>{lead.nextAction || 'Review lead'}</td>{(onQualify || onEdit) && <td><div className="row-actions">{onQualify && <button className="text-link" disabled={!lead.id} onClick={() => onQualify(lead)}><Target size={13} /> Qualify</button>}{onEdit && <button className="text-link" disabled={!lead.id} onClick={() => onEdit(lead)}>Edit</button>}</div></td>}</tr>)}</tbody></table></div>;
}

function LeadView({ leads, search, setSearch, openForm, onEdit, onQualify, qualification, setQualification }: { leads: Lead[]; search: string; setSearch: (value: string) => void; openForm: () => void; onEdit: (lead: Lead) => void; onQualify: (lead: Lead) => void; qualification: { lead: string; result: RecordItem } | null; setQualification: (result: { lead: string; result: RecordItem } | null) => void }) {
  const exportCsv = () => {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [['Name', 'Email', 'Phone', 'Company', 'Source', 'Status', 'Score', 'Next action'], ...leads.map((lead) => [lead.name, lead.email, lead.phone, lead.company, lead.source, lead.status, lead.qualificationScore, lead.nextAction])];
    const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'playbeat-leads.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  return <>{qualification && <section className="panel qualification-panel"><div className="panel-heading"><div><span className="eyebrow muted">RULE-BASED SUGGESTION · {qualification.lead}</span><h3>{cap(qualification.result.status)} · {String(qualification.result.score)}% score</h3></div><button className="icon-button" onClick={() => setQualification(null)}><X size={16} /></button></div><div className="qualification-columns"><div><b>Supporting signals</b>{(Array.isArray(qualification.result.reasons) ? qualification.result.reasons : []).map((reason, i) => <span key={i}><Check size={13} /> {String(reason)}</span>)}</div><div><b>Missing information</b>{(Array.isArray(qualification.result.missingInformation) ? qualification.result.missingInformation : []).map((missing, i) => <span key={i}><ArrowDownRight size={13} /> {String(missing)}</span>)}<p>{String(qualification.result.recommendedNextAction || '')}</p></div></div><small>{String(qualification.result.disclaimer || 'Suggestion only; not a guaranteed prediction.')}</small></section>}<section className="panel"><div className="table-tools"><div className="table-search"><Search size={15} /><input placeholder="Filter leads..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><button className="secondary-button" onClick={exportCsv}><Download size={15} /> Export</button><button className="primary-button" onClick={openForm}><Plus size={16} /> Add lead</button></div><LeadTable leads={leads} onQualify={onQualify} onEdit={onEdit} /><div className="table-foot">Showing {leads.length} recorded lead{leads.length === 1 ? '' : 's'} <span>Personal data is only shown to authorized workspace users.</span></div></section></>;
}

function ApprovalView({ items, onDecision }: { items: RecordItem[]; onDecision: (item: RecordItem, decision: 'approved' | 'rejected' | 'edited', message?: string) => void }) {
  if (!items.length) return <EmptyPanel icon={ShieldCheck} title="You're all caught up" text="AI-generated outbound drafts will appear here for review before any send action." />;
  return <div className="approval-list">{items.map((item, i) => <ApprovalCard key={item.id || item._id || i} item={item} onDecision={onDecision} />)}</div>;
}

function ApprovalCard({ item, onDecision }: { item: RecordItem; onDecision: (item: RecordItem, decision: 'approved' | 'rejected' | 'edited', message?: string) => void }) {
  const [message, setMessage] = useState(String(item.message || item.content || ''));
  return <article className="panel approval-card"><div className="approval-top"><div><span className="eyebrow muted">{cap(item.channel || 'message')} DRAFT</span><h3>{String(item.subject || item.title || 'Customer communication')}</h3></div><span className="risk-pill">{cap(item.riskLevel || 'review')}</span></div><div className="approval-recipient"><span className="avatar">{String(item.recipientName || '?').slice(0, 1)}</span><span><b>{String(item.recipientName || item.recipient || 'Recipient not provided')}</b><small>{String(item.channel || 'Channel not recorded')}</small></span></div><label className="draft-label">Draft text<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={10000} rows={4} /></label><div className="review-context"><b>Context</b><span>{String(item.reasoning || item.context || 'No additional reasoning recorded.')}</span></div><div className="approval-actions"><button className="secondary-button" onClick={() => onDecision(item, 'rejected')}><X size={15} /> Reject</button><button className="secondary-button" onClick={() => onDecision(item, 'edited', message)}><Check size={15} /> Save edit</button><button className="primary-button" onClick={() => onDecision(item, 'approved')}><Check size={15} /> Approve draft</button><small>Approval does not send this message.</small></div></article>;
}

function FollowupView({ items, onAdd, onComplete }: { items: RecordItem[]; onAdd: () => void; onComplete: (item: RecordItem) => void }) {
  return <section className="panel"><div className="table-tools"><span className="subtle-text">Tasks scheduled for leads assigned to your role</span><button className="primary-button" onClick={onAdd}><Plus size={15} /> Schedule follow-up</button></div>{!items.length ? <div className="empty-state"><span className="empty-icon"><Clock3 size={19} /></span><b>No follow-ups are scheduled</b><span>Schedule a follow-up for a lead to create a clear priority queue.</span></div> : <div className="followup-list">{items.map((item, i) => <div className="followup-row" key={item.id || item._id || i}><span className="followup-date"><b>{item.scheduledAt ? new Date(String(item.scheduledAt)).toLocaleDateString() : '—'}</b><small>{item.scheduledAt ? new Date(String(item.scheduledAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time not set'}</small></span><span className="followup-content"><b>{String(item.title || item.nextAction || 'Lead follow-up')}</b><small>{String(item.leadName || item.channel || item.description || 'Review customer context')}</small></span><span className={`lead-status ${readable(item.status)}`}>{cap(item.status || 'pending')}</span>{item.status === 'pending' && <button className="text-link" onClick={() => onComplete(item)}><Check size={14} /> Complete</button>}</div>)}</div>}</section>;
}

function ConversationView({ leads }: { leads: Lead[] }) {
  return <section className="panel"><div className="panel-heading"><div><span className="eyebrow muted">OMNICHANNEL TIMELINE</span><h3>Recorded lead conversations</h3></div><span className="panel-badge"><MessageSquareText size={13} /> {leads.length} LEADS</span></div><p className="panel-description">Conversation messages are loaded through each authorized lead record. Drafts require human approval; no communication channel is currently assumed to be connected.</p><LeadTable leads={leads.slice(0, 15)} /></section>;
}

function MemoryView({ items }: { items: RecordItem[] }) {
  if (!items.length) return <EmptyPanel icon={Sparkles} title="No structured AI memory" text="Only explicit memory records are shown. The agent does not invent missing customer preferences or retain free-form hidden memory." />;
  return <div className="memory-grid">{items.map((item, i) => <article className="panel memory-card" key={item.id || item._id || i}><div className="memory-card-head"><span className="priority-icon blue"><Sparkles size={16} /></span><span className="pill-muted">{cap(item.type || 'note')}</span></div><p>{String(item.content || item.summary || 'Memory content unavailable.')}</p><div className="memory-foot"><span>Lead: {String(item.leadName || item.leadId || 'Not specified')}</span><span>{item.updatedAt ? new Date(String(item.updatedAt)).toLocaleDateString() : 'Date not recorded'}</span></div></article>)}</div>;
}

function AnalyticsView({ metrics }: { metrics: Metrics | null }) {
  return <><div className="metrics-grid analytics-metrics"><MetricCard label="Leads · last 30d" value={metrics?.leadsCreated ?? '—'} meta="Recorded" icon={Users} /><MetricCard label="Qualified" value={metrics?.qualifiedLeads ?? '—'} meta="Rule-based" icon={Target} /><MetricCard label="Completed follow-ups" value={metrics?.followupsCompleted ?? '—'} meta="Recorded as complete" icon={CheckCheck} /><MetricCard label="Conversion" value={metrics ? `${metrics.conversionRate}%` : '—'} meta="Won / created leads" icon={ArrowUpRight} /></div><div className="workspace-grid"><Distribution title="Lead funnel" values={metrics?.byStatus || {}} /><Distribution title="Lead sources" values={metrics?.bySource || {}} /></div><div className="notice"><Eye size={15} /> Analytics reflect recorded records for the selected 30-day period. No predictive outcomes are represented as facts.</div></>;
}

function Distribution({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return <section className="panel"><div className="panel-heading"><div><span className="eyebrow muted">LAST 30 DAYS</span><h3>{title}</h3></div></div>{entries.length ? <div className="distribution-list">{entries.map(([name, value]) => <div key={name}><div className="distribution-label"><span>{cap(name)}</span><b>{value}</b></div><div className="bar-track"><i style={{ width: `${Math.max(4, value / max * 100)}%` }} /></div></div>)}</div> : <div className="empty-inline">No records in this period.</div>}</section>;
}

function ActivityView({ items }: { items: RecordItem[] }) {
  if (!items.length) return <EmptyPanel icon={FileClock} title="No recent activity" text="Audit records will appear here as users work in the CRM." />;
  return <section className="panel"><div className="activity-list">{items.map((item, i) => <div className="activity-row" key={item.id || item._id || i}><span className="activity-dot" /><div><b>{cap(item.action || item.tool || 'Activity')}</b><small>{String(item.actorEmail || item.actorRole || 'System')} · {String(item.entity || 'record')}{item.entityId ? ` · ${String(item.entityId)}` : ''}</small></div><time>{item.createdAt ? new Date(String(item.createdAt)).toLocaleString() : 'Timestamp not recorded'}</time></div>)}</div></section>;
}

function SettingsView({ user, save }: { user: User; save: (event: FormEvent<HTMLFormElement>) => void }) {
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
  useEffect(() => { if (isAdmin) api<{ settings: Record<string, unknown> }>('/api/ai/settings').then((data) => setInitial(data.settings)).catch(() => setInitial(null)); }, [isAdmin]);
  return <div className="settings-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow muted">AGENT GOVERNANCE</span><h3>AI behavior</h3></div><ShieldCheck size={17} className="subtle-icon" /></div>{isAdmin ? <form onSubmit={save} className="settings-form"><label className="toggle-row"><span><b>Pause AI agent</b><small>Keep CRM tools active while preventing AI requests.</small></span><input type="checkbox" name="paused" defaultChecked={initial?.paused === true} /></label><label className="toggle-row"><span><b>Approved workflow automation</b><small>Outbound messages remain subject to approval by default.</small></span><input type="checkbox" name="automation" defaultChecked={((initial?.automation || {}) as Record<string, unknown>).enabled === true} /></label><button className="primary-button" disabled={!initial}><Check size={15} /> Save settings</button></form> : <div className="empty-inline">Only administrators can edit AI settings.</div>}</section><section className="panel"><div className="panel-heading"><div><span className="eyebrow muted">SESSION</span><h3>Access & security</h3></div></div><div className="settings-fact"><span>Signed in as</span><b>{user.name}</b></div><div className="settings-fact"><span>Email</span><b>{user.email}</b></div><div className="settings-fact"><span>Role</span><b>{cap(user.role)}</b></div><div className="settings-fact"><span>Session</span><b>Secure · HTTP-only cookie</b></div></section></div>;
}

function EmptyPanel({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return <section className="panel empty-state large-empty"><span className="empty-icon"><Icon size={20} /></span><b>{title}</b><span>{text}</span></section>;
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Users,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Copy,
  Download,
  QrCode,
  MessageCircle,
  Send,
  Trash2,
  ChevronDown as ChevDown,
} from 'lucide-react';
import { Button, Timer, Card, CardContent, ProgressBar } from '@/components/ui';
import { ParticipantList } from './ParticipantList';
import { createClient } from '@/lib/supabase';
import { formatJoinCodeForDisplay, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Module {
  id: string;
  title: string;
  order_index: number;
  steps: Step[];
}

interface Step {
  id: string;
  title: string;
  order_index: number;
  estimated_minutes: number | null;
  is_required: boolean;
}

interface PresenterViewProps {
  session: {
    id: string;
    joinCode: string;
    status: string;
    currentStepId: string | null;
    timerEndAt: string | null;
    organizationName: string;
    templateName: string;
  };
  modules: Module[];
  initialParticipantCount: number;
}

export function PresenterView({ 
  session: initialSession, 
  modules,
  initialParticipantCount 
}: PresenterViewProps) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [participantCount, setParticipantCount] = useState(initialParticipantCount);
  const [stuckCount, setStuckCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Q&A state
  interface Question {
    id: string;
    participant_name: string;
    question_text: string;
    answer_text: string | null;
    is_answered: boolean;
    created_at: string;
  }
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [showAnswered, setShowAnswered] = useState(false);

  // Flatten steps
  const allSteps = modules.flatMap((module, moduleIndex) =>
    module.steps.map((step, stepIndex) => ({
      ...step,
      moduleTitle: module.title,
      moduleIndex,
      stepIndex,
      globalIndex: modules.slice(0, moduleIndex).reduce((acc, m) => acc + m.steps.length, 0) + stepIndex,
    }))
  );

  const currentStepIndex = allSteps.findIndex(s => s.id === session.currentStepId);
  const currentStep = allSteps[currentStepIndex] || allSteps[0];
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex >= allSteps.length - 1;

  // Subscribe to realtime updates
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to participants joining
    const participantChannel = supabase
      .channel(`participants:${initialSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${initialSession.id}`,
        },
        () => {
          setParticipantCount(prev => prev + 1);
        }
      )
      .subscribe();

    // Subscribe to stuck signals
    const analyticsChannel = supabase
      .channel(`analytics:${initialSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events',
          filter: `session_id=eq.${initialSession.id}`,
        },
        (payload) => {
          if (payload.new.event_type === 'stuck_signal') {
            setStuckCount(prev => prev + 1);
            // Reset after 30 seconds
            setTimeout(() => setStuckCount(prev => Math.max(0, prev - 1)), 30000);
          }
        }
      )
      .subscribe();

    // Subscribe to Q&A changes
    const qaChannel = supabase
      .channel(`presenter-qa:${initialSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_questions',
          filter: `session_id=eq.${initialSession.id}`,
        },
        () => {
          fetchQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(analyticsChannel);
      supabase.removeChannel(qaChannel);
    };
  }, [initialSession.id]);

  // Fetch completion count for current step
  const fetchCompletions = useCallback(async () => {
    if (!session.currentStepId) return;

    const supabase = createClient();
    const { count } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', initialSession.id)
      .eq('step_id', session.currentStepId);

    setCompletedCount(count || 0);
  }, [session.currentStepId, initialSession.id]);

  useEffect(() => {
    fetchCompletions();
    const interval = setInterval(fetchCompletions, 5000);
    return () => clearInterval(interval);
  }, [fetchCompletions]);

  // Map snake_case API keys to camelCase state keys
  const mapApiToState = (updates: Record<string, unknown>): Record<string, unknown> => {
    const keyMap: Record<string, string> = {
      current_step_id: 'currentStepId',
      timer_end_at: 'timerEndAt',
      join_code: 'joinCode',
      organization_name: 'organizationName',
      template_name: 'templateName',
    };
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      mapped[keyMap[key] || key] = value;
    }
    return mapped;
  };

  // Update session
  const updateSession = async (updates: Record<string, unknown>) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setSession(prev => ({ ...prev, ...mapApiToState(updates) }));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update session');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Navigation handlers
  const goToStep = async (stepId: string) => {
    await updateSession({ current_step_id: stepId });
    setCompletedCount(0);
  };

  const nextStep = () => {
    if (!isLastStep) {
      goToStep(allSteps[currentStepIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (!isFirstStep) {
      goToStep(allSteps[currentStepIndex - 1].id);
    }
  };

  // Start/end session
  const startSession = async () => {
    const firstStepId = allSteps[0]?.id;
    await updateSession({
      status: 'live',
      current_step_id: firstStepId,
      started_at: new Date().toISOString(),
    });
  };

  const endSession = async () => {
    await updateSession({
      status: 'ended',
      ended_at: new Date().toISOString(),
    });
    router.push('/admin/sessions');
  };

  // Timer
  const startTimer = async (minutes: number) => {
    const endAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    await updateSession({ timer_end_at: endAt });
  };

  const stopTimer = async () => {
    await updateSession({ timer_end_at: null });
  };

  // Fetch Q&A
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/questions?sessionId=${initialSession.id}`);
      const data = await res.json();
      if (data.success) setQuestions(data.data);
    } catch { /* silent */ }
  }, [initialSession.id]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Answer a question
  const answerQuestion = async (questionId: string) => {
    const text = answerDrafts[questionId]?.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerText: text }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setAnswerDrafts(prev => { const n = { ...prev }; delete n[questionId]; return n; });
      toast.success('Answer sent');
    } catch {
      toast.error('Failed to answer');
    }
  };

  // Delete a question
  const deleteQuestion = async (questionId: string) => {
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const unansweredQuestions = questions.filter(q => !q.is_answered);
  const answeredQuestions = questions.filter(q => q.is_answered);

  const completionPercentage = participantCount > 0 
    ? Math.round((completedCount / participantCount) * 100) 
    : 0;

  const [customTimerMinutes, setCustomTimerMinutes] = useState('');

  const copyJoinCode = () => {
    navigator.clipboard.writeText(session.joinCode);
    toast.success('Join code copied!');
  };

  const exportCSV = async () => {
    try {
      const supabase = createClient();
      const { data: participants } = await supabase
        .from('participants')
        .select('display_name, created_at')
        .eq('session_id', session.id)
        .order('created_at');

      const { data: submissions } = await supabase
        .from('submissions')
        .select('participant_id, step_id, content, created_at')
        .eq('session_id', session.id)
        .order('created_at');

      let csv = 'Participant,Joined At,Step,Submission,Submitted At\n';
      (participants || []).forEach(p => {
        const subs = (submissions || []).filter((s: any) => {
          // Match by participant - just include all for simplicity
          return true;
        });
        if (subs.length === 0) {
          csv += `"${p.display_name}","${p.created_at}","","",""\n`;
        }
      });
      (submissions || []).forEach((s: any) => {
        csv += `"","","${s.step_id}","${(s.content || '').replace(/"/g, '""')}","${s.created_at}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${session.joinCode}-export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Failed to export');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/sessions"
            className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Image
            src="/biz-group-logo.webp"
            alt="Biz Group"
            width={32}
            height={32}
            className="rounded"
          />
          <div>
            <h1 className="text-xl font-semibold">{session.templateName}</h1>
            <p className="text-gray-400 text-sm">{session.organizationName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm ${
            session.status === 'live' 
              ? 'bg-green-500/20 text-green-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {session.status.toUpperCase()}
          </span>
          {session.status === 'live' && (
            <Button variant="danger" size="sm" onClick={endSession}>
              <Square className="w-4 h-4 mr-2" />
              End Session
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Participant List */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-700 overflow-hidden">
          <ParticipantList
            sessionId={session.id}
            allStepIds={allSteps.map(s => s.id)}
            totalSteps={allSteps.length}
            className="flex-1 overflow-hidden"
          />
        </div>

        {/* Center-Left Panel - Join Code & Stats */}
        <div className="w-72 flex-shrink-0 bg-gray-800 p-6 flex flex-col border-r border-gray-700">
          {/* Join Code */}
          <div className="text-center mb-8">
            <p className="text-gray-400 text-sm mb-2">JOIN CODE</p>
            <div className="presenter-join-code text-6xl font-bold text-brand-400 tracking-wider">
              {formatJoinCodeForDisplay(session.joinCode)}
            </div>
            <p className="text-gray-500 text-sm mt-2">
              go to <span className="text-brand-400">/join</span>
            </p>
          </div>

          {/* Stats */}
          <div className="space-y-4 flex-1">
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-400" />
                    <span className="text-gray-300">Participants</span>
                  </div>
                  <span className="text-2xl font-bold">{participantCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Completed</span>
                  </div>
                  <span className="text-xl font-bold">{completedCount}/{participantCount}</span>
                </div>
                <ProgressBar value={completionPercentage} className="bg-gray-600" />
              </CardContent>
            </Card>

            {stuckCount > 0 && (
              <Card className="bg-orange-500/20 border-orange-500/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    <span className="text-orange-300">{stuckCount} need help</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timer Controls */}
          <div className="mt-4">
            <p className="text-gray-400 text-sm mb-2">TIMER</p>
            {session.timerEndAt ? (
              <div className="space-y-2">
                <Timer endAt={session.timerEndAt} size="xl" className="text-center" />
                <Button variant="secondary" size="sm" onClick={stopTimer} className="w-full">
                  Stop Timer
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((min) => (
                    <Button
                      key={min}
                      variant="secondary"
                      size="sm"
                      onClick={() => startTimer(min)}
                    >
                      {min}m
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="Custom"
                    value={customTimerMinutes}
                    onChange={(e) => setCustomTimerMinutes(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!customTimerMinutes || parseInt(customTimerMinutes) < 1}
                    onClick={() => {
                      startTimer(parseInt(customTimerMinutes));
                      setCustomTimerMinutes('');
                    }}
                  >
                    Start
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Current Step */}
        <div className="flex-1 flex flex-col p-8">
          {session.status !== 'live' ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
                <p className="text-gray-400 mb-8">
                  {participantCount} participant{participantCount !== 1 ? 's' : ''} have joined
                </p>
                <Button size="lg" onClick={startSession}>
                  <Play className="w-5 h-5 mr-2" />
                  Start Workshop
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Step Info */}
              <div className="text-center mb-8">
                <p className="text-gray-400 text-sm mb-2">
                  Step {currentStepIndex + 1} of {allSteps.length} • {currentStep?.moduleTitle}
                </p>
                <h2 className="presenter-step-title text-4xl font-bold">
                  {currentStep?.title}
                </h2>
                {currentStep?.estimated_minutes && (
                  <p className="text-gray-400 mt-2 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    {currentStep.estimated_minutes} minutes
                  </p>
                )}
              </div>

              {/* Step List */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto space-y-2">
                  {allSteps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => goToStep(step.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-lg transition-colors',
                        index === currentStepIndex
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm opacity-60">{index + 1}</span>
                          <span className="font-medium">{step.title}</span>
                        </div>
                        {step.is_required && (
                          <span className="text-xs bg-white/10 px-2 py-0.5 rounded">Required</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                <Button
                  variant="secondary"
                  onClick={prevStep}
                  disabled={isFirstStep || isUpdating}
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={fetchCompletions}
                    disabled={isUpdating}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  onClick={nextStep}
                  disabled={isLastStep || isUpdating}
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Quick Actions + Q&A */}
        <div className="w-80 bg-gray-800 p-4 flex flex-col overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-400 mb-3">QUICK ACTIONS</h3>
          <div className="space-y-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={copyJoinCode}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Join Code
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                window.open(`/s/${session.id}`, '_blank');
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview as Attendee
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={exportCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Quick Step Jump */}
          {session.status === 'live' && allSteps.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">JUMP TO STEP</h3>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {allSteps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(step.id)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate',
                      index === currentStepIndex
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    )}
                  >
                    <span className="opacity-60 mr-1">{index + 1}.</span>
                    {step.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Q&A Panel */}
          <div className="mt-5 border-t border-gray-700 pt-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Q&A
                {unansweredQuestions.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unansweredQuestions.length}
                  </span>
                )}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {unansweredQuestions.length === 0 && answeredQuestions.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No questions yet</p>
              ) : (
                <>
                  {/* Unanswered Questions */}
                  {unansweredQuestions.map(q => (
                    <div key={q.id} className="bg-gray-700 rounded-lg p-3 border border-amber-500/30">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-brand-400">{q.participant_name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500">
                            {new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => deleteQuestion(q.id)}
                            className="p-0.5 text-gray-500 hover:text-red-400 transition-colors"
                            title="Remove question"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-200 mb-2">{q.question_text}</p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={answerDrafts[q.id] || ''}
                          onChange={(e) => setAnswerDrafts(prev => ({ ...prev, [q.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && answerQuestion(q.id)}
                          placeholder="Type answer..."
                          className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-xs text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <button
                          onClick={() => answerQuestion(q.id)}
                          disabled={!answerDrafts[q.id]?.trim()}
                          className="p-1 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-40 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Answered Questions (collapsible) */}
                  {answeredQuestions.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowAnswered(!showAnswered)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors py-1"
                      >
                        <ChevDown className={cn('w-3 h-3 transition-transform', showAnswered && 'rotate-180')} />
                        Answered ({answeredQuestions.length})
                      </button>
                      {showAnswered && (
                        <div className="space-y-2 mt-1">
                          {answeredQuestions.map(q => (
                            <div key={q.id} className="bg-gray-700/50 rounded-lg p-2.5 border border-green-500/20">
                              <div className="flex items-start justify-between gap-2 mb-0.5">
                                <span className="text-xs text-gray-400">{q.participant_name}</span>
                                <button
                                  onClick={() => deleteQuestion(q.id)}
                                  className="p-0.5 text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-300 mb-1">{q.question_text}</p>
                              <p className="text-xs text-green-400">↳ {q.answer_text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

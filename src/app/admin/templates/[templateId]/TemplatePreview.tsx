'use client';

import { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Trophy,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Button, Card, CardContent, PromptBlock } from '@/components/ui';
import { NarrativeProgressMap } from '@/components/workshop/NarrativeProgressMap';
import { ChapterCelebration, useChapterCelebration } from '@/components/workshop/ChapterCelebration';

// ─── Types ──────────────────────────────────────────────────────────────
interface PromptBlockType {
  id: string;
  title: string;
  content_markdown: string;
  is_copyable: boolean;
  order_index: number;
}

interface Step {
  id: string;
  title: string;
  instruction_markdown: string;
  estimated_minutes: number | null;
  is_required: boolean;
  order_index: number;
  prompt_blocks: PromptBlockType[];
}

interface Module {
  id: string;
  title: string;
  objective: string | null;
  order_index: number;
  steps: Step[];
}

interface TemplatePreviewProps {
  templateName: string;
  modules: Module[];
  aiToolName?: string;
  aiToolUrl?: string;
  onClose: () => void;
}

export function TemplatePreview({ templateName, modules, aiToolName = 'ChatGPT', aiToolUrl = 'https://chat.openai.com', onClose }: TemplatePreviewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Flatten modules → steps with module context
  const allSteps = modules.flatMap((mod, modIdx) =>
    mod.steps.map((step) => ({
      ...step,
      moduleTitle: mod.title,
      moduleIndex: modIdx,
      moduleObjective: mod.objective,
    }))
  );

  const totalSteps = allSteps.length;
  const currentStep = allSteps[currentStepIndex];
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Build narrative steps for sidebar and celebration tracking
  const narrativeSteps = allSteps.map((step, index) => ({
    id: step.id,
    moduleTitle: step.moduleTitle,
    moduleIndex: step.moduleIndex,
    isFirstInModule: index === 0 || allSteps[index - 1].moduleIndex !== step.moduleIndex,
    isLastInModule:
      index === totalSteps - 1 || allSteps[index + 1].moduleIndex !== step.moduleIndex,
    isLastStep: index === totalSteps - 1,
    title: step.title,
    status:
      index < currentStepIndex
        ? ('completed' as const)
        : index === currentStepIndex
          ? ('current' as const)
          : ('upcoming' as const),
  }));

  // Chapter celebration on module transitions
  const { celebration, dismissCelebration } = useChapterCelebration(
    narrativeSteps.map(s => ({ id: s.id, moduleIndex: s.moduleIndex, status: s.status })),
    modules.map(m => ({ title: m.title }))
  );

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStepIndex(index);
      }
    },
    [totalSteps]
  );

  if (totalSteps === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">This template has no steps to preview.</p>
          <Button onClick={onClose}>Close Preview</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Chapter Celebration Overlay */}
      {celebration && (
        <ChapterCelebration
          chapterTitle={modules[celebration.chapterNumber - 1]?.title ?? ''}
          chapterNumber={celebration.chapterNumber}
          totalChapters={celebration.totalChapters}
          isFinalChapter={celebration.isFinalChapter}
          onDismiss={dismissCelebration}
        />
      )}

      {/* Sidebar — Narrative Progress Map */}
      <aside className="hidden lg:flex w-80 bg-white/90 backdrop-blur-sm border-r border-gray-200 p-5 overflow-y-auto flex-col">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-gray-900 text-sm">{templateName}</h2>
          </div>
          <p className="text-xs text-gray-500 pl-11">Preview Mode</p>
        </div>

        <NarrativeProgressMap
          steps={narrativeSteps}
          modules={modules.map((m) => ({ title: m.title, objective: m.objective }))}
          onStepClick={(stepId) => {
            const index = allSteps.findIndex((s) => s.id === stepId);
            if (index !== -1) goToStep(index);
          }}
          isClickable={true}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Preview Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Template Preview — This is how participants will see your workshop
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Exit Preview
          </button>
        </div>

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">
                  {currentStep.title}
                </h1>
                {isLastStep && (
                  <span className="text-xs font-bold bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Final Challenge
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Chapter {currentStep.moduleIndex + 1}: {currentStep.moduleTitle}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {currentStep.estimated_minutes && (
                <span className="text-sm text-gray-400">
                  ~{currentStep.estimated_minutes} min
                </span>
              )}
              <span className="text-sm text-gray-500">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Instructions */}
            {currentStep.instruction_markdown && (
              <Card>
                <CardContent className="p-6">
                  <div className="markdown-content text-gray-900 whitespace-pre-wrap">
                    {currentStep.instruction_markdown}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prompt Blocks */}
            {currentStep.prompt_blocks.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Prompt Templates</h3>
                {currentStep.prompt_blocks.map((block) => (
                  <PromptBlock
                    key={block.id}
                    title={block.title}
                    content={block.content_markdown}
                    isCopyable={block.is_copyable}
                  />
                ))}
              </div>
            )}

            {/* Submission placeholder (for required steps or last step) */}
            {(currentStep.is_required || isLastStep) && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium text-gray-900 mb-3">
                    {isLastStep ? 'Submit Your Final Prompt' : 'Submit Your Response'}
                  </h3>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
                    Participants will see a text area here to submit their response
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Tool Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(aiToolUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open {aiToolName}
            </Button>
          </div>
        </div>

        {/* Footer Navigation */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(currentStepIndex - 1)}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {/* Mobile step indicator */}
            <div className="flex items-center gap-1 lg:hidden">
              {allSteps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStepIndex
                      ? 'bg-brand-500'
                      : i < currentStepIndex
                        ? 'bg-brand-300'
                        : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {isLastStep ? (
              <Button onClick={onClose}>
                Finish Preview
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => goToStep(currentStepIndex + 1)}>
                Next Step
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

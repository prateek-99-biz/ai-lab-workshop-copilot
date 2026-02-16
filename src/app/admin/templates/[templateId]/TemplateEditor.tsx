'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  Pencil,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  FileText,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, Button, Input, TextArea, Modal, ConfirmModal } from '@/components/ui';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────
interface PromptBlock {
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
  prompt_blocks: PromptBlock[];
}

interface Module {
  id: string;
  title: string;
  objective: string | null;
  order_index: number;
  steps: Step[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  estimated_duration_minutes: number;
  is_published: boolean;
  organization_id: string;
  created_at: string;
  modules: Module[];
}

// ─── Main TemplateEditor ────────────────────────────────────────────────
export function TemplateEditor({ template: initialTemplate }: { template: Template }) {
  const router = useRouter();
  const [template, setTemplate] = useState(initialTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);

  // Template metadata form state
  const [metaForm, setMetaForm] = useState({
    name: template.name,
    description: template.description || '',
    estimated_duration_minutes: template.estimated_duration_minutes,
  });

  const saveTemplateMeta = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTemplate(prev => ({ ...prev, ...metaForm }));
      setEditingMeta(false);
      toast.success('Template updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublish = async () => {
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !template.is_published }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTemplate(prev => ({ ...prev, is_published: !prev.is_published }));
      toast.success(template.is_published ? 'Template unpublished' : 'Template published');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle publish');
    }
  };

  const refreshTemplate = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Template Header */}
      <Card>
        <CardContent className="p-6">
          {editingMeta ? (
            <div className="space-y-4">
              <Input
                label="Template Name"
                value={metaForm.name}
                onChange={(e) => setMetaForm(prev => ({ ...prev, name: e.target.value }))}
              />
              <TextArea
                label="Description"
                value={metaForm.description}
                onChange={(e) => setMetaForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
              <Input
                label="Estimated Duration (minutes)"
                type="number"
                value={metaForm.estimated_duration_minutes}
                onChange={(e) => setMetaForm(prev => ({ ...prev, estimated_duration_minutes: parseInt(e.target.value) || 0 }))}
              />
              <div className="flex gap-2">
                <Button onClick={saveTemplateMeta} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="secondary" onClick={() => {
                  setMetaForm({
                    name: template.name,
                    description: template.description || '',
                    estimated_duration_minutes: template.estimated_duration_minutes,
                  });
                  setEditingMeta(false);
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    template.is_published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {template.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                {template.description && (
                  <p className="text-gray-600 mb-2">{template.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {template.estimated_duration_minutes} min
                  </span>
                  <span>{template.modules.length} modules</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={togglePublish}>
                  {template.is_published ? (
                    <><EyeOff className="w-4 h-4 mr-1" /> Unpublish</>
                  ) : (
                    <><Eye className="w-4 h-4 mr-1" /> Publish</>
                  )}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditingMeta(true)}>
                  Edit Details
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Modules</h2>
          <AddModuleButton templateId={template.id} currentCount={template.modules.length} onAdded={refreshTemplate} />
        </div>

        {template.modules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">No modules yet. Add your first module to get started.</p>
            </CardContent>
          </Card>
        ) : (
          template.modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              templateId={template.id}
              onChanged={refreshTemplate}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Add Module Button ──────────────────────────────────────────────────
function AddModuleButton({ templateId, currentCount, onAdded }: {
  templateId: string;
  currentCount: number;
  onAdded: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          title: title.trim(),
          objective: objective.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Module added');
      setTitle('');
      setObjective('');
      setIsOpen(false);
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add module');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4 mr-1" />
        Add Module
      </Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Module">
        <div className="space-y-4">
          <Input
            label="Module Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction"
          />
          <TextArea
            label="Objective (optional)"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={2}
            placeholder="What participants will learn"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!title.trim() || isSaving}>
              {isSaving ? 'Adding...' : 'Add Module'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Module Card (collapsible) ──────────────────────────────────────────
function ModuleCard({ module: mod, templateId, onChanged }: {
  module: Module;
  templateId: string;
  onChanged: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({ title: mod.title, objective: mod.objective || '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/modules/${mod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim(),
          objective: editForm.objective.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Module updated');
      setIsEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/modules/${mod.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Module deleted');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <Card>
      <div className="border-l-4 border-brand-500">
        {/* Module Header */}
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-left flex-1 min-w-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                  Module {mod.order_index + 1}
                </span>
                <h3 className="font-semibold text-gray-900 truncate">{mod.title}</h3>
              </div>
              {mod.objective && (
                <p className="text-sm text-gray-500 mt-1 truncate">{mod.objective}</p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-gray-500">{mod.steps.length} steps</span>
            <button
              onClick={() => {
                setEditForm({ title: mod.title, objective: mod.objective || '' });
                setIsEditing(true);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Edit module"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsDeleting(true)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete module"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            <div className="border-t border-gray-100 pt-3">
              {mod.steps.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-2">No steps in this module.</p>
              ) : (
                mod.steps.map((step) => (
                  <StepRow key={step.id} step={step} moduleId={mod.id} onChanged={onChanged} />
                ))
              )}
              <AddStepButton moduleId={mod.id} currentCount={mod.steps.length} onAdded={onChanged} />
            </div>
          </div>
        )}
      </div>

      {/* Edit Module Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Module">
        <div className="space-y-4">
          <Input
            label="Title"
            value={editForm.title}
            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
          />
          <TextArea
            label="Objective"
            value={editForm.objective}
            onChange={(e) => setEditForm(prev => ({ ...prev, objective: e.target.value }))}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        title="Delete Module"
        description={`Delete "${mod.title}" and all its steps and prompt blocks? This cannot be undone.`}
        confirmText="Delete Module"
        variant="danger"
      />
    </Card>
  );
}

// ─── Step Row (collapsible) ─────────────────────────────────────────────
function StepRow({ step, moduleId, onChanged }: {
  step: Step;
  moduleId: string;
  onChanged: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: step.title,
    instruction_markdown: step.instruction_markdown || '',
    estimated_minutes: step.estimated_minutes,
    is_required: step.is_required,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/steps/${step.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Step updated');
      setIsEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update step');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/steps/${step.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Step deleted');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete step');
    }
  };

  return (
    <div className="border border-gray-100 rounded-lg mb-2 bg-white">
      {/* Step header */}
      <div className="px-3 py-2 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <span className="text-xs text-gray-400 font-mono shrink-0">
            {step.order_index + 1}.
          </span>
          <span className="text-sm font-medium text-gray-800 truncate">{step.title}</span>
          <span className="text-xs text-gray-400 shrink-0">{step.estimated_minutes ?? 0}m</span>
          {step.is_required && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 shrink-0">
              Required
            </span>
          )}
        </button>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-gray-400">{step.prompt_blocks.length} blocks</span>
          <button
            onClick={() => {
              setEditForm({
                title: step.title,
                instruction_markdown: step.instruction_markdown || '',
                estimated_minutes: step.estimated_minutes,
                is_required: step.is_required,
              });
              setIsEditing(true);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Edit step"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsDeleting(true)}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete step"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expanded: instructions + prompt blocks */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-50">
          {step.instruction_markdown && (
            <p className="text-sm text-gray-600 mt-2 mb-3 whitespace-pre-wrap">
              {step.instruction_markdown}
            </p>
          )}

          {/* Prompt Blocks */}
          <div className="space-y-2 mt-2">
            {step.prompt_blocks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No prompt blocks.</p>
            ) : (
              step.prompt_blocks.map((block) => (
                <PromptBlockRow key={block.id} block={block} onChanged={onChanged} />
              ))
            )}
            <AddPromptBlockButton stepId={step.id} currentCount={step.prompt_blocks.length} onAdded={onChanged} />
          </div>
        </div>
      )}

      {/* Edit Step Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Step">
        <div className="space-y-4">
          <Input
            label="Title"
            value={editForm.title}
            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
          />
          <TextArea
            label="Instructions"
            value={editForm.instruction_markdown}
            onChange={(e) => setEditForm(prev => ({ ...prev, instruction_markdown: e.target.value }))}
            rows={4}
          />
          <Input
            label="Duration (minutes)"
            type="number"
            value={editForm.estimated_minutes ?? 0}
            onChange={(e) =>
              setEditForm(prev => ({
                ...prev,
                estimated_minutes: parseInt(e.target.value) || null,
              }))
            }
          />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={editForm.is_required}
              onChange={(e) => setEditForm(prev => ({ ...prev, is_required: e.target.checked }))}
            />
            Required step
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        title="Delete Step"
        description={`Delete "${step.title}" and all its prompt blocks? This cannot be undone.`}
        confirmText="Delete Step"
        variant="danger"
      />
    </div>
  );
}

// ─── Prompt Block Row ───────────────────────────────────────────────────
function PromptBlockRow({ block, onChanged }: {
  block: PromptBlock;
  onChanged: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: block.title,
    content_markdown: block.content_markdown,
    is_copyable: block.is_copyable,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/prompt-blocks/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Block updated');
      setIsEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update block');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/prompt-blocks/${block.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Block deleted');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete block');
    }
  };

  return (
    <div className="border border-gray-100 rounded p-2 bg-gray-50/50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-700">{block.title}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
              {block.is_copyable ? 'Copyable' : 'Read only'}
            </span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">
            {block.content_markdown}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <button
            onClick={() => {
              setEditForm({
                title: block.title,
                content_markdown: block.content_markdown,
                is_copyable: block.is_copyable,
              });
              setIsEditing(true);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Edit block"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsDeleting(true)}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete block"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Prompt Block">
        <div className="space-y-4">
          <Input
            label="Title"
            value={editForm.title}
            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
          />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={editForm.is_copyable}
              onChange={(e) => setEditForm(prev => ({ ...prev, is_copyable: e.target.checked }))}
            />
            Participants can copy this block
          </label>
          <TextArea
            label="Content (Markdown)"
            value={editForm.content_markdown}
            onChange={(e) => setEditForm(prev => ({ ...prev, content_markdown: e.target.value }))}
            rows={8}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        title="Delete Prompt Block"
        description={`Delete "${block.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

// ─── Add Step Button ────────────────────────────────────────────────────
function AddStepButton({ moduleId, currentCount, onAdded }: {
  moduleId: string;
  currentCount: number;
  onAdded: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [instructionMarkdown, setInstructionMarkdown] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(5);
  const [isRequired, setIsRequired] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          title: title.trim(),
          instruction_markdown: instructionMarkdown.trim() || '',
          estimated_minutes: estimatedMinutes,
          is_required: isRequired,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Step added');
      setTitle('');
      setInstructionMarkdown('');
      setEstimatedMinutes(5);
      setIsRequired(false);
      setIsOpen(false);
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add step');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-2"
      >
        <Plus className="w-3 h-3" />
        Add Step
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Step">
        <div className="space-y-4">
          <Input
            label="Step Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Brainstorm Ideas"
          />
          <TextArea
            label="Instructions (optional)"
            value={instructionMarkdown}
            onChange={(e) => setInstructionMarkdown(e.target.value)}
            rows={3}
            placeholder="Instructions shown to participants"
          />
          <Input
            label="Duration (minutes)"
            type="number"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
          />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
            />
            Required step
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!title.trim() || isSaving}>
              {isSaving ? 'Adding...' : 'Add Step'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Add Prompt Block Button ────────────────────────────────────────────
function AddPromptBlockButton({ stepId, currentCount, onAdded }: {
  stepId: string;
  currentCount: number;
  onAdded: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isCopyable, setIsCopyable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/prompt-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_id: stepId,
          title: title.trim(),
          content_markdown: content.trim(),
          is_copyable: isCopyable,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Prompt block added');
      setTitle('');
      setContent('');
      setIsCopyable(true);
      setIsOpen(false);
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add block');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
      >
        <Plus className="w-3 h-3" />
        Add Prompt Block
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Prompt Block">
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Main Prompt"
          />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isCopyable}
              onChange={(e) => setIsCopyable(e.target.checked)}
            />
            Participants can copy this block
          </label>
          <TextArea
            label="Content (Markdown)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Prompt content with {{variable}} placeholders"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!title.trim() || !content.trim() || isSaving}>
              {isSaving ? 'Adding...' : 'Add Block'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
